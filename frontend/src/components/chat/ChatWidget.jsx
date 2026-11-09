import React, { useState, useEffect, useRef } from 'react';
import { Bot, X } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { chatService } from '../../services/chatService';
import styles from './ChatWidget.module.css';

const INITIAL_ASSISTANT_MESSAGE = {
  id: 'msg-welcome-001',
  role: 'assistant',
  content:
    'Xin chào! 👋\n\n' +
    'Tôi là Hotel Assistant, trợ lý ảo của khách sạn Grand Aurora. Tôi có thể giúp bạn tìm hiểu thông tin phòng, giá phòng, đặt phòng và các dịch vụ của khách sạn.\n\n' +
    'Bạn cần tôi hỗ trợ điều gì hôm nay?',
  status: 'sent',
  timestamp: new Date().toISOString(),
  provider: 'system',
  model: 'hotel-assistant',
};

function generateId() {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const fabButtonRef = useRef(null);

  // Synchronize initial messages from sessionStorage
  const [messages, setMessages] = useState(() => {
    const saved = chatService.getStoredMessages();
    if (saved && saved.length > 0) {
      return saved;
    }
    return [INITIAL_ASSISTANT_MESSAGE];
  });

  const [isLoading, setIsLoading] = useState(false);
  const isProcessingRef = useRef(false);

  const [messageCount, setMessageCount] = useState(() =>
    chatService.getMessageCount()
  );

  const [hasUnread, setHasUnread] = useState(false);

  // Sync messages to sessionStorage whenever they change
  useEffect(() => {
    chatService.saveStoredMessages(messages);
  }, [messages]);

  const handleToggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setHasUnread(false);
      } else {
        // Return focus to FAB when closing
        setTimeout(() => {
          fabButtonRef.current?.focus();
        }, 50);
      }
      return next;
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      fabButtonRef.current?.focus();
    }, 50);
  };

  // Clear chat history & reset session
  const handleClearChat = () => {
    if (isLoading || isProcessingRef.current) return;

    chatService.clearSession();
    const freshWelcome = {
      ...INITIAL_ASSISTANT_MESSAGE,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    setMessages([freshWelcome]);
    setMessageCount(0);
  };

  // Send a new message directly to backend API
  const handleSendMessage = async (text) => {
    const trimmed = (text || '').trim();

    // Concurrency guard: strict duplicate check at logic level
    if (!trimmed || isLoading || isProcessingRef.current) {
      return;
    }

    if (chatService.isLimitReached()) {
      return;
    }

    const messageId = generateId();
    const userMessage = {
      id: messageId,
      role: 'user',
      content: trimmed,
      status: 'sending',
      timestamp: new Date().toISOString(),
    };

    // 1. Immediately display user message in 'sending' state
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    isProcessingRef.current = true;

    try {
      // 2. Call Real Chat API: POST /api/v1/chat/message
      const response = await chatService.sendMessage(trimmed, undefined, false);

      // 3. On success: Mark user message as 'sent', append assistant reply
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      );

      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: response?.reply || response?.message || 'Dạ trợ lý ảo Grand Aurora đã tiếp nhận thông tin của quý khách.',
        disclaimer: response?.disclaimer,
        status: 'sent',
        timestamp: response.timestamp || new Date().toISOString(),
        provider: response.provider,
        model: response.model,
        cta: response.cta,
        cardType: response.cardType,
        cardData: response.cardData,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setMessageCount(chatService.getMessageCount());

      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (error) {
      console.warn('[ChatWidget] Lỗi gửi tin nhắn đến Backend:', error);

      // 4. On failure: Mark user message as 'error' with message for Retry
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                status: 'error',
                errorMessage:
                  error?.message ||
                  'Không thể kết nối đến máy chủ chatbot. Vui lòng bấm Thử lại.',
                isRateLimit: Boolean(error?.isRateLimit || error?.status === 429),
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  // Retry an existing failed message (reusing same message.id, no new record created)
  const handleRetryMessage = async (messageId, content) => {
    if (isLoading || isProcessingRef.current || !content) {
      return;
    }

    // 1. Update existing message to 'sending' and clear previous error
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, status: 'sending', errorMessage: undefined, isRetry: true }
          : msg
      )
    );

    setIsLoading(true);
    isProcessingRef.current = true;

    try {
      // 2. Call Real API with isRetry = true (does not increment message quota)
      const response = await chatService.sendMessage(content, undefined, true);

      // 3. Mark the SAME user message as 'sent'
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'sent', isRetry: false } : msg
        )
      );

      // 4. Append assistant reply
      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: response?.reply || response?.message || 'Dạ trợ lý ảo Grand Aurora đã tiếp nhận thông tin của quý khách.',
        disclaimer: response?.disclaimer,
        status: 'sent',
        timestamp: response.timestamp || new Date().toISOString(),
        provider: response.provider,
        model: response.model,
        cta: response.cta,
        cardType: response.cardType,
        cardData: response.cardData,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (error) {
      console.warn('[ChatWidget] Lỗi khi retry tin nhắn:', error);
      // Revert status to 'error'
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                status: 'error',
                errorMessage:
                  error?.message ||
                  'Thử lại không thành công. Vui lòng kiểm tra kết nối mạng.',
                isRateLimit: Boolean(error?.isRateLimit || error?.status === 429),
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  const totalLimit = chatService.getMessageLimit();
  const remainingMessages = Math.max(0, totalLimit - messageCount);
  const isLimitReached = remainingMessages <= 0;

  return (
    <div className={styles.widgetContainer}>
      {/* Floating Chat Window */}
      {isOpen && (
        <div className={styles.windowWrapper}>
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onRetryMessage={handleRetryMessage}
            onClose={handleClose}
            onMinimize={handleClose}
            onClearChat={handleClearChat}
            remainingMessages={remainingMessages}
            totalLimit={totalLimit}
            isLimitReached={isLimitReached}
          />
        </div>
      )}

      {/* Floating Action Button (FAB) with gentle pulse & tooltip */}
      <div className={styles.fabWrapper}>
        {!isOpen && (
          <div className={styles.fabTooltip}>
            <span>Chat với chúng tôi</span>
            <div className={styles.tooltipArrow} />
          </div>
        )}

        <button
          ref={fabButtonRef}
          type="button"
          className={`${styles.floatingButton} ${isOpen ? styles.buttonActive : ''}`}
          onClick={handleToggleOpen}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-controls="chat-window-card"
          aria-label={isOpen ? 'Đóng cửa sổ tư vấn Hotel Assistant' : 'Mở cửa sổ tư vấn Hotel Assistant'}
          title={isOpen ? 'Đóng chat' : 'Chat với chúng tôi - Hotel Assistant'}
        >
          {/* Subtle outer pulse effect */}
          {!isOpen && <span className={styles.pulseRing} aria-hidden="true" />}

          {isOpen ? (
            <X size={24} className={styles.buttonIcon} />
          ) : (
            <div className={styles.iconContainer}>
              <Bot size={26} className={styles.buttonIcon} />
              {hasUnread && <span className={styles.unreadBadge} />}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

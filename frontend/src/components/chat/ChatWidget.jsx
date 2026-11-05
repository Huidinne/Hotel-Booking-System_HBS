import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { chatService } from '../../services/chatService';
import styles from './ChatWidget.module.css';

const INITIAL_ASSISTANT_MESSAGE = {
  id: 'msg-welcome-001',
  role: 'assistant',
  content:
    'Dạ Grand Aurora xin kính chào quý khách! Em là trợ lý ảo hỗ trợ thông tin khách sạn.\n' +
    'Quý khách đang quan tâm đến loại phòng nào, hoặc cần tư vấn về giờ check-in, buffet sáng hay chính sách cọc hủy phòng ạ?',
  status: 'sent',
  timestamp: new Date().toISOString(),
  provider: 'stub',
  model: 'stub-mock-provider',
};

function generateId() {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

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

  const [simulationMode, setSimulationMode] = useState(() =>
    chatService.getSimulationMode()
  );

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
      }
      return next;
    });
  };

  const handleChangeSimulationMode = (mode) => {
    chatService.setSimulationMode(mode);
    setSimulationMode(mode);
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

  // Send a new message
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
      // 2. Call Stub API
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
        content: response.reply,
        status: 'sent',
        timestamp: response.timestamp || new Date().toISOString(),
        provider: response.provider,
        model: response.model,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setMessageCount(chatService.getMessageCount());

      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (error) {
      console.warn('[ChatWidget] Lỗi gửi tin nhắn:', error);

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
      // 2. Call Stub API with isRetry = true (does not increment message quota)
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
        content: response.reply,
        status: 'sent',
        timestamp: response.timestamp || new Date().toISOString(),
        provider: response.provider,
        model: response.model,
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
            onClose={() => setIsOpen(false)}
            onClearChat={handleClearChat}
            simulationMode={simulationMode}
            onChangeSimulationMode={handleChangeSimulationMode}
            remainingMessages={remainingMessages}
            totalLimit={totalLimit}
            isLimitReached={isLimitReached}
          />
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        className={`${styles.floatingButton} ${isOpen ? styles.buttonActive : ''}`}
        onClick={handleToggleOpen}
        aria-label={isOpen ? 'Đóng cửa sổ tư vấn' : 'Mở trợ lý tư vấn khách sạn'}
        title={isOpen ? 'Đóng chat' : 'Chat tư vấn trực tuyến Grand Aurora'}
      >
        {isOpen ? (
          <X size={26} className={styles.buttonIcon} />
        ) : (
          <div className={styles.iconContainer}>
            <MessageCircle size={26} className={styles.buttonIcon} />
            {hasUnread && <span className={styles.unreadBadge} />}
          </div>
        )}
      </button>
    </div>
  );
}

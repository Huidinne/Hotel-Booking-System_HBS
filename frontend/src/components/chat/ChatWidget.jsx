import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { chatService } from '../../services/chatService';
import styles from './ChatWidget.module.css';

const STORAGE_CHAT_MESSAGES_KEY = 'hbs_chat_widget_messages';

const INITIAL_BOT_MESSAGE = {
  id: 'msg-welcome-001',
  sender: 'bot',
  text:
    'Dạ Grand Aurora xin chào quý khách! Em là trợ lý ảo hỗ trợ thông tin khách sạn.\n' +
    'Quý khách đang quan tâm đến loại phòng nào, hoặc cần tư vấn về giờ check-in, buffet sáng hay chính sách cọc hủy phòng ạ?',
  timestamp: new Date().toISOString(),
  provider: 'gemini',
  model: 'gemini-3.5-flash-lite',
};

const DEMO_CONVERSATION = [
  INITIAL_BOT_MESSAGE,
  {
    id: 'user-demo-001',
    sender: 'user',
    text: 'Khách sạn có những phòng nào, giá bao nhiêu?',
    timestamp: new Date().toISOString(),
    status: 'sent',
  },
  {
    id: 'bot-demo-001',
    sender: 'bot',
    text:
      'Dạ Grand Aurora xin chào quý khách! Hiện khách sạn có 3 hạng phòng sang trọng sẵn sàng phục vụ:\n' +
      '• Standard Single Room: 500.000 VNĐ / đêm (1 giường đơn, thích hợp công tác & nghỉ ngơi).\n' +
      '• Deluxe Double Room: 950.000 VNĐ / đêm (1 giường đôi lớn, ban công thoáng mát).\n' +
      '• Executive Suite Luxury: 1.800.000 VNĐ / đêm (Căn hộ VIP 2 phòng ngủ, bồn tắm view biển, buffet sáng cho 4 khách).\n\n' +
      'Quý khách có thể xem ảnh và đặt phòng trực tiếp tại mục "Danh sách phòng" trên thanh điều hướng ạ!',
    timestamp: new Date().toISOString(),
    provider: 'stub',
    model: 'stub-mock-provider',
    status: 'sent',
  },
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('chat') === 'open';
    } catch {
      return false;
    }
  });

  const [messages, setMessages] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('chat_demo') === '1') {
        return DEMO_CONVERSATION;
      }

      const saved = sessionStorage.getItem(STORAGE_CHAT_MESSAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return [INITIAL_BOT_MESSAGE];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isMockMode, setIsMockMode] = useState(() => chatService.isMockMode());
  const [hasUnread, setHasUnread] = useState(false);

  // Sync messages to sessionStorage to preserve conversation during page navigation / widget closing
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_CHAT_MESSAGES_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
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

  const handleToggleMockMode = () => {
    const next = !isMockMode;
    chatService.setMockMode(next);
    setIsMockMode(next);
  };

  const handleResetSession = () => {
    chatService.clearSession();
    const freshWelcome = {
      ...INITIAL_BOT_MESSAGE,
      id: `msg-welcome-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setMessages([freshWelcome]);
    try {
      sessionStorage.removeItem(STORAGE_CHAT_MESSAGES_KEY);
    } catch {
      // Ignore
    }
  };

  const handleSendMessage = async (text) => {
    if (!text || !text.trim() || isLoading) {
      return;
    }

    const trimmed = text.trim();
    const userMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    // Append user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage(trimmed);

      const botMessage = {
        id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender: 'bot',
        text: response.reply,
        timestamp: response.timestamp || new Date().toISOString(),
        provider: response.provider,
        model: response.model,
        status: 'sent',
      };

      setMessages((prev) => [...prev, botMessage]);

      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (error) {
      console.error('[ChatWidget] Lỗi gửi tin nhắn:', error);
      const errorMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text:
          (error && error.message) ||
          'Không thể kết nối đến máy chủ chatbot lúc này. Vui lòng thử lại sau giây lát!',
        timestamp: new Date().toISOString(),
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryMessage = (failedMsg) => {
    if (failedMsg && failedMsg.text) {
      handleSendMessage(failedMsg.text);
    }
  };

  return (
    <div className={styles.widgetContainer}>
      {/* Chat Window Panel */}
      {isOpen && (
        <div className={styles.windowWrapper}>
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onClose={() => setIsOpen(false)}
            onResetSession={handleResetSession}
            isMockMode={isMockMode}
            onToggleMockMode={handleToggleMockMode}
            onRetryMessage={handleRetryMessage}
          />
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        className={`${styles.floatingButton} ${isOpen ? styles.buttonActive : ''}`}
        onClick={handleToggleOpen}
        aria-label={isOpen ? 'Đóng cửa sổ tư vấn' : 'Mở trợ lý tư vấn khách sạn'}
        title={isOpen ? 'Đóng chat' : 'Chat tư vấn với Grand Aurora'}
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

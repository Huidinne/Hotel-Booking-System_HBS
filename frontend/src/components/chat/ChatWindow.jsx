import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Minus, Sparkles, Trash2, Bot } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatLoading } from './ChatLoading';
import { ChatInput } from './ChatInput';
import { ChatConfirmModal } from './ChatConfirmModal';
import styles from './ChatWindow.module.css';

export function getTimeAwareContext() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) {
    return {
      statusText: '☀️ Buổi sáng: Đang phục vụ Buffet tầng 2',
      prompts: [
        'Nhà hàng buffet sáng mở đến mấy giờ?',
        'Kiểm tra giúp mình phòng trống hôm nay',
        'Giờ mở cửa Hồ bơi vô cực tầng thượng',
        'Khách sạn có những loại phòng nào?',
      ],
    };
  } else if (hour >= 11 && hour < 14) {
    return {
      statusText: '🌤️ Buổi trưa: Hỗ trợ Check-in & Giữ hành lý',
      prompts: [
        'Mấy giờ được nhận phòng (Check-in)?',
        'Khách sạn có giữ hành lý miễn phí không?',
        'Kiểm tra giúp mình phòng Deluxe còn trống không',
        'Chính sách đặt cọc 50% qua VietQR',
      ],
    };
  } else if (hour >= 14 && hour < 18) {
    return {
      statusText: '🌊 Buổi chiều: Hồ bơi vô cực & Bãi biển',
      prompts: [
        'Hồ bơi vô cực ngắm biển mở đến mấy giờ?',
        'Đặt 1 phòng Executive Suite Luxury 4 người',
        'Khách sạn có gần bãi tắm Mỹ Khê không?',
        'Báo giá phòng cho 2 đêm cuối tuần này',
      ],
    };
  } else if (hour >= 18 && hour < 22) {
    return {
      statusText: '🌙 Buổi tối: Sky Bar & Ẩm thực đêm',
      prompts: [
        'Sky Bar tầng thượng phục vụ đến mấy giờ?',
        'Dịch vụ Room Service gọi đồ ăn tối',
        'Kiểm tra giúp mình ngày mai còn phòng nào trống?',
        'Báo giá phòng Executive từ 22/11 đến 25/11',
      ],
    };
  } else {
    return {
      statusText: '🌟 Trực ban đêm 24/7: Hỗ trợ khách lưu trú',
      prompts: [
        'Kiểm tra phòng trống ngày mai',
        'Khách sạn có những hạng phòng nào và giá bao nhiêu?',
        'Quy định check-in sớm hoặc check-out muộn',
        'Chính sách giữ phòng và đặt cọc VietQR',
      ],
    };
  }
}

export function ChatWindow({
  messages,
  isLoading,
  onSendMessage,
  onRetryMessage,
  onClose,
  onMinimize,
  onClearChat,
  remainingMessages,
  totalLimit,
  isLimitReached,
}) {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const timeContext = useMemo(() => getTimeAwareContext(), []);

  // Auto-scroll to latest message on messages update or loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Keyboard accessibility: Escape key to close window or clear confirm
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isConfirmClearOpen) {
          setIsConfirmClearOpen(false);
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isConfirmClearOpen]);

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenClearConfirm = () => {
    if (isLoading) return;
    setIsConfirmClearOpen(true);
  };

  const handleConfirmClear = () => {
    setIsConfirmClearOpen(false);
    onClearChat();
    // Return focus to input after clearing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div
      id="chat-window-card"
      className={styles.windowCard}
      role="region"
      aria-labelledby="chat-window-title"
      aria-modal="false"
    >
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.botIconBadge}>
            <Bot size={20} className={styles.headerBotIcon} />
            <span className={styles.onlineDot} title="Trợ lý đang trực tuyến" />
          </div>
          <div>
            <h3 id="chat-window-title" className={styles.headerTitle}>
              Hotel Assistant
            </h3>
            <div className={styles.headerStatusRow}>
              <span className={styles.statusPill}>Online</span>
              <span className={styles.headerSubtitle} title={timeContext.statusText}>
                {timeContext.statusText}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {/* Clear history button */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleOpenClearConfirm}
            title="Xóa lịch sử hội thoại (Tạo phiên mới)"
            aria-label="Xóa lịch sử hội thoại"
          >
            <Trash2 size={15} />
          </button>

          {/* Minimize / Close button */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onMinimize || onClose}
            title="Thu nhỏ cửa sổ chat (Esc)"
            aria-label="Thu nhỏ cửa sổ chat"
          >
            <Minus size={16} />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className={styles.messagesContainer} role="log" aria-live="polite" aria-label="Lịch sử tin nhắn">
        {messages.length === 0 && !isLoading && (
          <div className={styles.emptyMessagesNotice}>
            <Bot size={32} className={styles.emptyBotIcon} />
            <p className={styles.emptyTitle}>Chưa có tin nhắn trong phiên</p>
            <p className={styles.emptyDesc}>
              Hãy bắt đầu cuộc trò chuyện bằng cách nhập câu hỏi hoặc chọn câu hỏi gợi ý bên dưới.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onRetry={onRetryMessage}
            isRetrying={isLoading && message.isRetry}
          />
        ))}

        {/* Loading indicator while waiting for AI response */}
        {isLoading && !messages.some((m) => m.isRetry) && <ChatLoading />}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions (visible only when session is starting) */}
      {messages.length <= 1 && !isLoading && (
        <div className={styles.quickPromptsSection}>
          <div className={styles.quickPromptsHeader}>
            <Sparkles size={13} className={styles.sparkleIcon} />
            <span>Gợi ý câu hỏi nhanh:</span>
          </div>
          <div className={styles.quickPromptsList}>
            {timeContext.prompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className={styles.quickPromptPill}
                onClick={() => onSendMessage(prompt)}
                disabled={isLimitReached}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        ref={inputRef}
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        isLimitReached={isLimitReached}
        remainingMessages={remainingMessages}
        totalLimit={totalLimit}
      />

      {/* Footer Disclaimer according to BE Contract [SP2-1106-THANH] */}
      <div className={styles.chatFooterDisclaimer}>
        <span>Hotel Assistant chỉ hỗ trợ tư vấn và chuẩn bị thông tin tham khảo.</span>
      </div>

      {/* Confirmation Dialog for Clear History */}
      <ChatConfirmModal
        isOpen={isConfirmClearOpen}
        onConfirm={handleConfirmClear}
        onCancel={() => setIsConfirmClearOpen(false)}
      />
    </div>
  );
}

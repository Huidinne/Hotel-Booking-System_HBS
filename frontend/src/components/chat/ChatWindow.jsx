import React, { useEffect, useRef, useState } from 'react';
import { X, Minus, Sparkles, Trash2, Bot } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatLoading } from './ChatLoading';
import { ChatInput } from './ChatInput';
import { ChatConfirmModal } from './ChatConfirmModal';
import styles from './ChatWindow.module.css';

const QUICK_PROMPTS = [
  'Khách sạn có những loại phòng nào?',
  'Mấy giờ nhận phòng và trả phòng?',
  'Tiền phòng có gồm ăn sáng và tiện ích gì?',
  'Chính sách đặt cọc và hủy phòng thế nào?',
];

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
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  // Auto-scroll to latest message on messages update or loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleOpenClearConfirm = () => {
    if (isLoading) return;
    setIsConfirmClearOpen(true);
  };

  const handleConfirmClear = () => {
    setIsConfirmClearOpen(false);
    onClearChat();
  };

  return (
    <div
      className={styles.windowCard}
      role="dialog"
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
              <span className={styles.headerSubtitle}>
                Đang hỗ trợ trực tuyến 24/7
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

          {/* Minimize button */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onMinimize || onClose}
            title="Thu nhỏ cửa sổ chat"
            aria-label="Thu nhỏ cửa sổ chat"
          >
            <Minus size={16} />
          </button>

          {/* Close button */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onClose}
            title="Đóng cửa sổ chat"
            aria-label="Đóng cửa sổ chat"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className={styles.messagesContainer} role="log" aria-live="polite">
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
            {QUICK_PROMPTS.map((prompt, idx) => (
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
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        isLimitReached={isLimitReached}
        remainingMessages={remainingMessages}
        totalLimit={totalLimit}
      />

      {/* Confirmation Dialog for Clear History */}
      <ChatConfirmModal
        isOpen={isConfirmClearOpen}
        onConfirm={handleConfirmClear}
        onCancel={() => setIsConfirmClearOpen(false)}
      />
    </div>
  );
}

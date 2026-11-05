import React, { useEffect, useRef } from 'react';
import { X, Sparkles, RotateCcw, Bot } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import styles from './ChatWindow.module.css';

const QUICK_PROMPTS = [
  'Khách sạn có những phòng nào, giá bao nhiêu?',
  'Mấy giờ nhận phòng và trả phòng?',
  'Tiền phòng có gồm ăn sáng và bể bơi không?',
  'Chính sách hoàn tiền khi hủy phòng thế nào?',
  'Khách sạn ở đâu, có hotline không?',
];

export function ChatWindow({
  messages,
  isLoading,
  onSendMessage,
  onClose,
  onResetSession,
  isMockMode,
  onToggleMockMode,
  onRetryMessage,
}) {
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom whenever messages update or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
            <span className={styles.onlineDot} title="Đang hoạt động" />
          </div>
          <div>
            <h3 id="chat-window-title" className={styles.headerTitle}>
              Trợ Lý Grand Aurora
            </h3>
            <div className={styles.headerStatusRow}>
              <span className={styles.headerSubtitle}>
                {isMockMode ? 'Mô phỏng (Mock Stub)' : 'Trực tuyến (Gemini AI)'}
              </span>
              <button
                type="button"
                className={styles.modeToggleBtn}
                onClick={onToggleMockMode}
                title={isMockMode ? 'Chuyển sang API Backend' : 'Chuyển sang Mock Adapter'}
              >
                {isMockMode ? 'Dùng API' : 'Dùng Mock'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onResetSession}
            title="Làm mới cuộc trò chuyện"
            aria-label="Làm mới cuộc trò chuyện"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onClose}
            title="Đóng cửa sổ chat"
            aria-label="Đóng cửa sổ chat"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Message List */}
      <div className={styles.body} role="log" aria-live="polite">
        <div className={styles.welcomeBanner}>
          <Sparkles size={16} className={styles.welcomeSparkle} />
          <p>
            Chào mừng bạn đến với <strong>Grand Aurora Hotel</strong>! Đặt câu hỏi
            bất kỳ về phòng, tiện ích hoặc chính sách đặt phòng.
          </p>
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length <= 2 && (
          <div className={styles.chipsContainer}>
            <p className={styles.chipsTitle}>Gợi ý câu hỏi phổ biến:</p>
            <div className={styles.chipsList}>
              {QUICK_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.chipButton}
                  onClick={() => onSendMessage(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className={styles.messagesList}>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} onRetry={onRetryMessage} />
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className={`${styles.messageRow} ${styles.botRow}`}>
              <div className={styles.botAvatar}>
                <Bot size={16} />
              </div>
              <div className={`${styles.messageBubble} ${styles.botBubble} ${styles.typingBubble}`}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Footer with Input */}
      <footer className={styles.footer}>
        <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
        <div className={styles.disclaimerText}>
          Tư vấn tự động theo hợp đồng SP2-1104-THANH • Grand Aurora
        </div>
      </footer>
    </div>
  );
}

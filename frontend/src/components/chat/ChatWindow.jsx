import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Trash2, Bot, Sliders } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatLoading } from './ChatLoading';
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
  onRetryMessage,
  onClose,
  onClearChat,
  simulationMode,
  onChangeSimulationMode,
  remainingMessages,
  totalLimit,
  isLimitReached,
}) {
  const messagesEndRef = useRef(null);
  const [showDevPanel, setShowDevPanel] = useState(false);

  // Auto-scroll to latest message on messages update or loading
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
            <span className={styles.onlineDot} title="Trợ lý đang trực tuyến" />
          </div>
          <div>
            <h3 id="chat-window-title" className={styles.headerTitle}>
              Trợ Lý Grand Aurora
            </h3>
            <div className={styles.headerStatusRow}>
              <span className={styles.headerSubtitle}>
                {simulationMode === 'NONE'
                  ? 'Trực tuyến • HBS Stub API'
                  : simulationMode === 'PROVIDER_ERROR'
                  ? 'Đang thử nghiệm: Lỗi Provider'
                  : 'Đang thử nghiệm: Timeout'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {/* Toggle Dev / QA simulation panel */}
          <button
            type="button"
            className={`${styles.iconBtn} ${showDevPanel ? styles.iconBtnActive : ''}`}
            onClick={() => setShowDevPanel((prev) => !prev)}
            title="Công cụ kiểm thử Stub (Thành công / Lỗi Provider / Timeout)"
            aria-label="Kiểm thử lỗi Stub"
          >
            <Sliders size={15} />
          </button>

          {/* Clear history button */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onClearChat}
            title="Xóa lịch sử hội thoại (Tạo phiên mới)"
            aria-label="Xóa lịch sử hội thoại"
          >
            <Trash2 size={15} />
          </button>

          {/* Close button */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onClose}
            title="Đóng cửa sổ chat"
            aria-label="Đóng cửa sổ chat"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {/* QA / Dev Simulation Bar (Can be toggled) */}
      {showDevPanel && (
        <div className={styles.devSimulationPanel}>
          <div className={styles.devPanelHeader}>
            <span>Chế độ kiểm thử Stub API:</span>
            <span className={styles.devHint}>Có thể gõ #error hoặc #timeout</span>
          </div>
          <div className={styles.devButtonGroup}>
            <button
              type="button"
              className={`${styles.devModeBtn} ${
                simulationMode === 'NONE' ? styles.devModeActive : ''
              }`}
              onClick={() => onChangeSimulationMode('NONE')}
            >
              Chuẩn (Thành công)
            </button>
            <button
              type="button"
              className={`${styles.devModeBtn} ${
                simulationMode === 'PROVIDER_ERROR' ? styles.devModeActiveError : ''
              }`}
              onClick={() => onChangeSimulationMode('PROVIDER_ERROR')}
            >
              Lỗi Provider (503)
            </button>
            <button
              type="button"
              className={`${styles.devModeBtn} ${
                simulationMode === 'TIMEOUT' ? styles.devModeActiveTimeout : ''
              }`}
              onClick={() => onChangeSimulationMode('TIMEOUT')}
            >
              Timeout (408)
            </button>
          </div>
        </div>
      )}

      {/* Message List */}
      <div className={styles.body} role="log" aria-live="polite">
        <div className={styles.welcomeBanner}>
          <Sparkles size={16} className={styles.welcomeSparkle} />
          <p>
            Chào mừng bạn đến với <strong>Grand Aurora Hotel</strong>! Mọi câu hỏi
            về phòng, thủ tục check-in hay hủy phòng đều được giải đáp tự động.
          </p>
        </div>

        {/* Quick Suggestion Chips (when beginning conversation) */}
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
                  disabled={isLoading || isLimitReached}
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
            <ChatMessage
              key={msg.id}
              message={msg}
              onRetry={onRetryMessage}
              isRetrying={isLoading}
            />
          ))}

          {/* Typing Indicator / ChatLoading */}
          {isLoading && <ChatLoading />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Footer with Input Form & Quota info */}
      <footer className={styles.footer}>
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          isLimitReached={isLimitReached}
          remainingMessages={remainingMessages}
          totalLimit={totalLimit}
        />
        <div className={styles.disclaimerText}>
          Tư vấn tự động mô phỏng Stub API • Grand Aurora Luxury Hotel
        </div>
      </footer>
    </div>
  );
}

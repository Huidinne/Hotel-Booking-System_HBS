import React from 'react';
import { Bot, User, AlertCircle, Clock, RotateCcw, Loader2 } from 'lucide-react';
import styles from './ChatWindow.module.css';

export function ChatMessage({ message, onRetry, isRetrying }) {
  const isUser = message.role === 'user';
  const isSending = message.status === 'sending';
  const isError = message.status === 'error';

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formattedTime = formatTime(message.timestamp);

  const getProviderLabel = (provider) => {
    if (!provider) return '';
    if (provider === 'gemini') return 'Gemini AI';
    if (provider === 'guardrail') return 'Quy chuẩn an toàn';
    return 'Hotel Assistant';
  };

  return (
    <div
      className={`${styles.messageRow} ${isUser ? styles.userRow : styles.assistantRow}`}
      role="listitem"
    >
      {!isUser && (
        <div className={styles.assistantAvatar} aria-hidden="true">
          <Bot size={16} />
        </div>
      )}

      <div className={styles.messageContentWrapper}>
        <div
          className={`${styles.messageBubble} ${
            isUser ? styles.userBubble : styles.assistantBubble
          } ${isError ? styles.errorBubble : ''} ${isSending ? styles.sendingBubble : ''}`}
        >
          {/* Multi-line message body */}
          <div className={styles.messageText}>
            {message.content.split('\n').map((line, idx) => (
              <React.Fragment key={idx}>
                {line}
                {idx < message.content.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>

          {/* Metadata & Status footer */}
          <div className={styles.messageMeta}>
            {isSending ? (
              <span className={styles.sendingMeta}>
                <Loader2 size={11} className={styles.spinIcon} />
                <span>Đang gửi...</span>
              </span>
            ) : isError ? (
              <div className={styles.errorMetaContainer}>
                <span className={styles.errorMetaText}>
                  <AlertCircle size={12} />
                  <span>{message.errorMessage || 'Gửi thất bại'}</span>
                </span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(message.id, message.content)}
                    disabled={isRetrying}
                    className={styles.retryBtn}
                    title="Thử gửi lại tin nhắn này"
                  >
                    <RotateCcw size={11} className={isRetrying ? styles.spinIcon : ''} />
                    <span>{isRetrying ? 'Đang thử lại...' : 'Thử lại'}</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {formattedTime && (
                  <span className={styles.metaTime}>
                    <Clock size={10} />
                    {formattedTime}
                  </span>
                )}
                {!isUser && message.provider && (
                  <span className={styles.metaProvider}>
                    {getProviderLabel(message.provider)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isUser && (
        <div className={styles.userAvatar} aria-hidden="true">
          <User size={16} />
        </div>
      )}
    </div>
  );
}

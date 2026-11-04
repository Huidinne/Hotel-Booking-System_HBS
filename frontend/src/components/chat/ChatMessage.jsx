import React from 'react';
import { Bot, User, AlertCircle, Clock } from 'lucide-react';
import styles from './ChatWindow.module.css';

export function ChatMessage({ message, onRetry }) {
  const isBot = message.sender === 'bot';
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

  return (
    <div
      className={`${styles.messageRow} ${isBot ? styles.botRow : styles.userRow}`}
      role="listitem"
    >
      {isBot && (
        <div className={styles.botAvatar} aria-hidden="true">
          <Bot size={16} />
        </div>
      )}

      <div className={styles.messageContentWrapper}>
        <div
          className={`${styles.messageBubble} ${
            isBot ? styles.botBubble : styles.userBubble
          } ${isError ? styles.errorBubble : ''}`}
        >
          {/* Support line breaks in messages */}
          <div className={styles.messageText}>
            {message.text.split('\n').map((line, idx) => (
              <React.Fragment key={idx}>
                {line}
                {idx < message.text.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>

          <div className={styles.messageMeta}>
            {isError ? (
              <span className={styles.errorMeta}>
                <AlertCircle size={12} />
                <span>Không thể gửi</span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(message)}
                    className={styles.retryBtn}
                  >
                    Thử lại
                  </button>
                )}
              </span>
            ) : (
              <>
                {formattedTime && (
                  <span className={styles.metaTime}>
                    <Clock size={10} />
                    {formattedTime}
                  </span>
                )}
                {isBot && message.provider && (
                  <span className={styles.metaProvider}>
                    {message.provider === 'gemini' ? 'Gemini AI' : 'HBS Stub'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {!isBot && (
        <div className={styles.userAvatar} aria-hidden="true">
          <User size={16} />
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Bot } from 'lucide-react';
import styles from './ChatWindow.module.css';

export function ChatLoading() {
  return (
    <div
      className={`${styles.messageRow} ${styles.assistantRow}`}
      role="status"
      aria-label="Hotel Assistant đang trả lời..."
    >
      <div className={styles.assistantAvatar} aria-hidden="true">
        <Bot size={16} />
      </div>
      <div className={`${styles.messageBubble} ${styles.assistantBubble} ${styles.typingBubble}`}>
        <div className={styles.typingDotsGroup}>
          <span className={styles.typingDot} />
          <span className={styles.typingDot} />
          <span className={styles.typingDot} />
        </div>
        <span className={styles.typingText}>Hotel Assistant đang trả lời...</span>
      </div>
    </div>
  );
}

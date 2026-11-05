import React from 'react';
import { Bot } from 'lucide-react';
import styles from './ChatWindow.module.css';

export function ChatLoading() {
  return (
    <div
      className={`${styles.messageRow} ${styles.assistantRow}`}
      role="status"
      aria-label="Trợ lý ảo đang soạn câu trả lời"
    >
      <div className={styles.assistantAvatar} aria-hidden="true">
        <Bot size={16} />
      </div>
      <div className={`${styles.messageBubble} ${styles.assistantBubble} ${styles.typingBubble}`}>
        <span className={styles.typingDot} />
        <span className={styles.typingDot} />
        <span className={styles.typingDot} />
      </div>
    </div>
  );
}

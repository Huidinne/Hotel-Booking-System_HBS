import React, { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import styles from './ChatWindow.module.css';

export function ChatInput({ onSendMessage, isLoading }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading) {
      return;
    }
    onSendMessage(trimmed);
    setText('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isBlank = !text.trim();

  return (
    <form className={styles.inputContainer} onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        className={styles.textInput}
        placeholder={isLoading ? 'Đang chờ phản hồi...' : 'Hỏi về phòng, giờ check-in, ưu đãi...'}
        value={text}
        maxLength={1000}
        disabled={isLoading}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Nội dung tin nhắn"
      />

      <button
        type="submit"
        className={styles.sendButton}
        disabled={isBlank || isLoading}
        title="Gửi tin nhắn"
        aria-label="Gửi tin nhắn"
      >
        {isLoading ? (
          <Loader2 size={16} className={styles.spinIcon} />
        ) : (
          <Send size={16} />
        )}
      </button>
    </form>
  );
}

import React, { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import styles from './ChatWindow.module.css';

export function ChatInput({
  onSendMessage,
  isLoading,
  isLimitReached,
  remainingMessages,
  totalLimit,
}) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading || isLimitReached) {
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
      handleSubmit();
    }
  };

  const isBlank = !text.trim();
  const isDisabled = isLoading || isLimitReached;

  let placeholderText = 'Hỏi về phòng, giờ check-in, ưu đãi...';
  if (isLimitReached) {
    placeholderText = 'Đã đạt giới hạn tin nhắn phiên này.';
  } else if (isLoading) {
    placeholderText = 'Đang chờ phản hồi từ trợ lý...';
  }

  return (
    <div className={styles.inputWrapper}>
      <form className={styles.inputContainer} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className={`${styles.textInput} ${isLimitReached ? styles.inputDisabledLimit : ''}`}
          placeholder={placeholderText}
          value={text}
          maxLength={1000}
          disabled={isDisabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Nội dung câu hỏi"
        />

        <button
          type="submit"
          className={styles.sendButton}
          disabled={isBlank || isDisabled}
          title={isLimitReached ? 'Đã hết lượt tin nhắn' : 'Gửi tin nhắn'}
          aria-label="Gửi tin nhắn"
        >
          {isLoading ? (
            <Loader2 size={16} className={styles.spinIcon} />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>

      {/* Session quota info badge */}
      <div className={styles.inputFooterMeta}>
        <span
          className={`${styles.quotaText} ${
            remainingMessages <= 3 ? styles.quotaLow : ''
          }`}
        >
          {isLimitReached ? (
            <strong className={styles.limitWarningText}>
              Đã hết lượt ({totalLimit}/{totalLimit}) — Hãy bấm Xóa lịch sử để tạo phiên mới
            </strong>
          ) : (
            <span>
              Còn <strong>{remainingMessages}</strong>/{totalLimit} lượt tin nhắn trong phiên
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

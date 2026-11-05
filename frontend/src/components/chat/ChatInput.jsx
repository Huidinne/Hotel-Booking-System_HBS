import React, { useState, useRef, useEffect } from 'react';
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
  const textareaRef = useRef(null);

  // Auto-resize textarea height as user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 110);
    textarea.style.height = `${Math.max(newHeight, 38)}px`;
  }, [text]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading || isLimitReached) {
      return;
    }
    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '38px';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    // Enter without Shift triggers send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isBlank = !text.trim();
  const isDisabled = isLoading || isLimitReached;

  let placeholderText = 'Nhập câu hỏi của bạn... (Enter để gửi, Shift+Enter xuống dòng)';
  if (isLimitReached) {
    placeholderText = 'Đã đạt giới hạn tin nhắn phiên này.';
  } else if (isLoading) {
    placeholderText = 'Hotel Assistant đang xử lý câu trả lời...';
  }

  return (
    <div className={styles.inputWrapper}>
      <form className={styles.inputContainer} onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          rows={1}
          className={`${styles.textInputArea} ${isLimitReached ? styles.inputDisabledLimit : ''}`}
          placeholder={placeholderText}
          value={text}
          maxLength={1000}
          disabled={isDisabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Nội dung câu hỏi cho Hotel Assistant"
        />

        <button
          type="submit"
          className={styles.sendButton}
          disabled={isBlank || isDisabled}
          title={isLimitReached ? 'Đã hết lượt tin nhắn' : 'Gửi tin nhắn (Enter)'}
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
              Đã hết lượt ({totalLimit}/{totalLimit}) — Bấm icon thùng rác để làm mới phiên
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

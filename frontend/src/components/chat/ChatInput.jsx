import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import styles from './ChatWindow.module.css';

export const ChatInput = forwardRef(function ChatInput(
  {
    onSendMessage,
    isLoading,
    isLimitReached,
    remainingMessages,
    totalLimit,
  },
  ref
) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!isLoading) {
      isSubmittingRef.current = false;
    }
  }, [isLoading]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  // Expose focus() handle to parent via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  // Auto-resize textarea height as user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 110);
    textarea.style.height = `${Math.max(newHeight, 38)}px`;
  }, [text]);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      alert(
        'Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói (Web Speech API). Vui lòng sử dụng Google Chrome hoặc Microsoft Edge.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setText(currentTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition status/error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        textareaRef.current?.focus();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
    const trimmed = text.trim();
    if (!trimmed || isLoading || isSubmittingRef.current || isLimitReached) {
      return;
    }
    isSubmittingRef.current = true;
    try {
      onSendMessage(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '38px';
        textareaRef.current.focus();
      }
    } finally {
      // Luôn mở khóa submit sau debounce 300ms, đảm bảo ô chat không bao giờ bị đơ/kẹt
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 300);
    }
  };

  const handleKeyDown = (e) => {
    // Avoid triggering during IME composition (Vietnamese typing)
    if (e.nativeEvent?.isComposing) {
      return;
    }
    // Enter without Shift triggers send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      const trimmed = text.trim();
      if (trimmed && !isLoading && !isSubmittingRef.current && !isLimitReached) {
        handleSubmit(e);
      }
    }
    // Shift + Enter automatically inserts newline
  };

  const isBlank = !text.trim();
  const isDisabled = isLoading || isLimitReached;

  let placeholderText = 'Nhập câu hỏi hoặc bấm Micro để nói... (Enter gửi)';
  if (isListening) {
    placeholderText = '🎙️ Đang lắng nghe giọng nói tiếng Việt... Hãy nói câu hỏi của bạn';
  } else if (isLimitReached) {
    placeholderText = 'Đã đạt giới hạn tin nhắn phiên này.';
  } else if (isLoading) {
    placeholderText = 'Hotel Assistant đang xử lý câu trả lời...';
  }

  return (
    <div className={styles.inputWrapper}>
      {isListening && (
        <div className={styles.voiceListeningBanner}>
          <span className={styles.voicePulseDot} />
          <span>Đang nghe tiếng Việt... Hãy nói to và rõ ràng câu hỏi của bạn</span>
        </div>
      )}

      <form className={styles.inputContainer} onSubmit={handleSubmit} noValidate>
        <textarea
          ref={textareaRef}
          rows={1}
          className={`${styles.textInputArea} ${isLimitReached ? styles.inputDisabledLimit : ''} ${isListening ? styles.inputListening : ''}`}
          placeholder={placeholderText}
          value={text}
          maxLength={1000}
          disabled={isDisabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Nội dung câu hỏi cho Hotel Assistant"
        />

        {/* Voice AI Speech-to-Text Microphone Button */}
        <button
          type="button"
          className={`${styles.micButton} ${isListening ? styles.micButtonActive : ''}`}
          onClick={toggleListening}
          disabled={isDisabled}
          title={isListening ? 'Dừng lắng nghe' : 'Nói để nhập câu hỏi (Voice AI tiếng Việt)'}
          aria-label={isListening ? 'Dừng lắng nghe' : 'Nhập bằng giọng nói'}
        >
          {isListening ? (
            <MicOff size={16} className={styles.micPulseIcon} />
          ) : (
            <Mic size={16} />
          )}
        </button>

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
});

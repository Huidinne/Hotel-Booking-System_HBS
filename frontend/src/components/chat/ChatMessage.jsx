import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  User,
  AlertCircle,
  Clock,
  RotateCcw,
  Loader2,
  CalendarCheck,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { MarkdownContent, validateCatalogUrl } from './MarkdownContent';
import styles from './ChatWindow.module.css';

/**
 * Determine if message contains a valid room booking / catalog / login CTA
 */
function getBookingCta(message) {
  if (!message || message.role !== 'assistant') return null;

  // 1. Explicit CTA object from API (if provided)
  if (message.cta && message.cta.url) {
    const validUrl = validateCatalogUrl(message.cta.url);
    if (validUrl) {
      const isLogin = validUrl === '/login' || validUrl === '/login/';
      return {
        label: message.cta.label || (isLogin ? 'Đăng nhập ngay' : 'Đặt phòng ngay'),
        url: validUrl,
        isLogin,
      };
    }
  }

  // 2. Detect booking suggestion or login requirement from assistant response
  const content = message.content || '';
  const lower = content.toLowerCase();

  // Exclude refusal messages (out-of-scope guardrail)
  if (
    lower.includes('chỉ có thể hỗ trợ quý khách các thông tin về phòng nghỉ') &&
    lower.includes('quý khách cần em tư vấn thêm')
  ) {
    return null;
  }

  // Check login directive (Vietnamese & English)
  const hasLoginDirective =
    lower.includes('vui lòng đăng nhập') ||
    lower.includes('đăng nhập vào tài khoản') ||
    lower.includes('đăng nhập để') ||
    lower.includes('please log in') ||
    lower.includes('please sign in') ||
    lower.includes('log in to continue') ||
    lower.includes('login to your account');

  if (hasLoginDirective) {
    const isEnglish = lower.includes('please') || lower.includes('sign in') || lower.includes('log in');
    return {
      label: isEnglish ? 'Log in now' : 'Đăng nhập ngay',
      url: '/login',
      isLogin: true,
    };
  }

  const hasBookingDirective =
    lower.includes('tra cứu & tìm phòng') ||
    lower.includes('tra cứu phòng trống') ||
    lower.includes("trang 'đặt phòng'") ||
    lower.includes('trang **đặt phòng**') ||
    lower.includes('đặt cọc 50% qua vnpay') ||
    lower.includes('đặt phòng ngay') ||
    lower.includes('/rooms') ||
    lower.includes('room catalog') ||
    lower.includes('explore rooms');

  if (hasBookingDirective) {
    const isEnglish = lower.includes('room') || lower.includes('explore');
    return {
      label: isEnglish ? 'View Room Catalog' : 'Đặt phòng ngay',
      url: '/rooms',
      isLogin: false,
    };
  }

  return null;
}

export function ChatMessage({ message, onRetry, isRetrying }) {
  const navigate = useNavigate();
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

  const bookingCta = getBookingCta(message);

  const handleCtaClick = (url) => {
    if (url) {
      navigate(url);
    }
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
          {/* Formatted Markdown body */}
          <div className={styles.messageText}>
            <MarkdownContent content={message.content} />
          </div>

          {/* Call-to-action button when assistant suggests booking rooms or requires login */}
          {!isUser && bookingCta && !isSending && !isError && (
            <div className={styles.ctaButtonWrapper}>
              <button
                type="button"
                className={styles.bookNowCtaBtn}
                onClick={() => handleCtaClick(bookingCta.url)}
                title={bookingCta.isLogin ? 'Đăng nhập vào tài khoản cá nhân' : 'Truy cập để khám phá phòng và đặt cọc online'}
              >
                {bookingCta.isLogin ? (
                  <LogIn size={14} className={styles.ctaIcon} />
                ) : (
                  <CalendarCheck size={14} className={styles.ctaIcon} />
                )}
                <span>{bookingCta.label}</span>
                <ArrowRight size={13} className={styles.ctaArrow} />
              </button>
            </div>
          )}

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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  User,
  AlertCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Loader2,
  CalendarCheck,
  ArrowRight,
  LogIn,
  CheckCircle,
  CreditCard,
} from 'lucide-react';
import { MarkdownContent, validateCatalogUrl } from './MarkdownContent';
import { chatService } from '../../services/chatService';
import styles from './ChatWindow.module.css';

/**
 * Determine if message contains a valid room booking / catalog / login CTA
 */
function getBookingCta(message) {
  if (!message || message.role !== 'assistant') return null;

  const isUserLoggedIn = Boolean(
    typeof window !== 'undefined' &&
    (localStorage.getItem('hbs_access_token') || localStorage.getItem('hbs_current_user'))
  );

  // 1. Explicit CTA object from API (if provided)
  if (message.cta && message.cta.url) {
    const validUrl = validateCatalogUrl(message.cta.url);
    if (validUrl) {
      const isLogin = validUrl === '/login' || validUrl === '/login/';
      const isMyBookings = validUrl === '/my-bookings' || validUrl === '/my-bookings/';

      if (isUserLoggedIn && isLogin) {
        return {
          label: 'Xem lịch sử đặt phòng',
          url: '/my-bookings',
          isLogin: false,
          isMyBookings: true,
        };
      }

      return {
        label: message.cta.label || (isLogin ? 'Đăng nhập ngay' : isMyBookings ? 'Xem lịch sử đặt phòng' : 'Đặt phòng ngay'),
        url: validUrl,
        isLogin,
        isMyBookings,
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
    if (isUserLoggedIn) {
      return {
        label: 'Xem lịch sử đặt phòng',
        url: '/my-bookings',
        isLogin: false,
        isMyBookings: true,
      };
    }
    const isEnglish = lower.includes('please') || lower.includes('sign in') || lower.includes('log in');
    return {
      label: isEnglish ? 'Log in now' : 'Đăng nhập ngay',
      url: '/login',
      isLogin: true,
      isMyBookings: false,
    };
  }

  const hasHistoryDirective =
    lower.includes('lịch sử đặt phòng') ||
    lower.includes('lịch sử đặt') ||
    lower.includes('booking history') ||
    lower.includes('/my-bookings');

  if (hasHistoryDirective) {
    return {
      label: isUserLoggedIn ? 'Xem lịch sử đặt phòng' : 'Đăng nhập ngay',
      url: isUserLoggedIn ? '/my-bookings' : '/login',
      isLogin: !isUserLoggedIn,
      isMyBookings: isUserLoggedIn,
    };
  }

  const hasBookingDirective =
    lower.includes('tra cứu & tìm phòng') ||
    lower.includes('tra cứu phòng trống') ||
    lower.includes("trang 'đặt phòng'") ||
    lower.includes('trang **đặt phòng**') ||
    lower.includes('đặt cọc 50% qua vietqr') ||
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
      isMyBookings: false,
    };
  }

  return null;
}

export function ChatMessage({ message, onRetry, isRetrying }) {
  const navigate = useNavigate();
  const isUser = message.role === 'user';
  const isSending = message.status === 'sending';
  const isError = message.status === 'error';
  const isRateLimit = Boolean(message.isRateLimit);

  const [confirmingDraft, setConfirmingDraft] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [confirmError, setConfirmError] = useState(null);

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

  const handleConfirmDraft = async () => {
    const draftId = message.cardData?.draftId;
    if (!draftId || confirmingDraft) return;

    setConfirmingDraft(true);
    setConfirmError(null);
    try {
      const res = await chatService.confirmBookingDraft(draftId);
      setConfirmResult(res);
      if (res?.paymentUrl) {
        setTimeout(() => {
          window.location.href = res.paymentUrl;
        }, 1200);
      }
    } catch (err) {
      setConfirmError(
        err?.message || 'Không thể xác nhận đặt phòng. Vui lòng đăng nhập hoặc thử lại.'
      );
    } finally {
      setConfirmingDraft(false);
    }
  };

  const draft = (message.cardType === 'BOOKING_DRAFT' || message.cardType === 'BOOKING_QUOTE') ? message.cardData : null;
  const roomOptions = message.cardType === 'ROOM_OPTIONS' && Array.isArray(message.cardData) ? message.cardData : null;
  const isLoginRequired = message.cardType === 'LOGIN_REQUIRED';

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
          } ${isError ? (isRateLimit ? styles.rateLimitBubble : styles.errorBubble) : ''} ${
            isSending ? styles.sendingBubble : ''
          }`}
        >
          {/* Formatted Markdown body */}
          <div className={styles.messageText}>
            <MarkdownContent content={message.content} />
          </div>

          {/* Interactive Card: BOOKING_DRAFT */}
          {!isUser && draft && !isSending && !isError && (
            <div className={styles.chatCardWrapper}>
              <div className={styles.draftCard}>
                <div className={styles.draftCardHeader}>
                  <div className={styles.draftCardTitle}>
                    {draft.roomTypeName || 'Bản nháp đặt phòng'}
                  </div>
                  <span className={styles.draftCardBadge}>Chờ xác nhận</span>
                </div>
                <div className={styles.draftCardRows}>
                  {draft.checkIn && draft.checkOut && (
                    <div className={styles.draftCardRow}>
                      <span className={styles.draftCardLabel}>Thời gian lưu trú:</span>
                      <span className={styles.draftCardValue}>
                        {draft.checkIn} → {draft.checkOut} ({draft.nights || 1} đêm)
                      </span>
                    </div>
                  )}
                  {draft.quantity && (
                    <div className={styles.draftCardRow}>
                      <span className={styles.draftCardLabel}>Số lượng & khách:</span>
                      <span className={styles.draftCardValue}>
                        {draft.quantity} phòng, {draft.guests || 2} khách
                      </span>
                    </div>
                  )}
                  {draft.totalPrice != null && (
                    <div className={styles.draftCardRow}>
                      <span className={styles.draftCardLabel}>Tổng tiền:</span>
                      <span className={styles.draftCardValue}>
                        {Number(draft.totalPrice).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  )}
                  {draft.depositAmount != null && (
                    <div className={styles.draftCardRow}>
                      <span className={styles.draftCardLabel}>Tiền cọc (50%):</span>
                      <span className={styles.draftCardHighlight}>
                        {Number(draft.depositAmount).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.draftConfirmBtn}
                  onClick={() => {
                    const rtId = draft.roomTypeId || 2;
                    const cIn = draft.checkIn || '';
                    const cOut = draft.checkOut || '';
                    const gst = draft.guests || 2;
                    const qty = draft.quantity || 1;
                    let url = `/booking/checkout?roomTypeId=${rtId}&checkIn=${cIn}&checkOut=${cOut}&guests=${gst}&quantity=${qty}`;
                    if (draft.specialRequests && draft.specialRequests.trim()) {
                      url += `&note=${encodeURIComponent(draft.specialRequests.trim())}`;
                    }
                    navigate(url);
                  }}
                  title="Chuyển đến trang Xác nhận thông tin & Đặt cọc phòng để kiểm tra"
                >
                  <CreditCard size={14} />
                  <span>Kiểm tra thông tin & Đặt cọc</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Interactive Card: ROOM_OPTIONS */}
          {!isUser && roomOptions && roomOptions.length > 0 && !isSending && !isError && (
            <div className={styles.chatCardWrapper}>
              <div className={styles.roomOptionsList}>
                {roomOptions.slice(0, 3).map((room, idx) => (
                  <div key={idx} className={styles.roomOptionItem}>
                    <div>
                      <div className={styles.roomOptionName}>{room.roomTypeName}</div>
                      <div className={styles.roomOptionPrice}>
                        {Number(room.pricePerNight || 0).toLocaleString('vi-VN')} đ/đêm
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.roomOptionBtn}
                      onClick={() => navigate(room.roomTypeId ? `/rooms/${room.roomTypeId}` : '/rooms')}
                    >
                      Chi tiết
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Card: LOGIN_REQUIRED */}
          {!isUser && isLoginRequired && !isSending && !isError && (
            <div className={styles.ctaButtonWrapper}>
              {Boolean(typeof window !== 'undefined' && (localStorage.getItem('hbs_access_token') || localStorage.getItem('hbs_current_user'))) ? (
                <button
                  type="button"
                  className={styles.bookNowCtaBtn}
                  onClick={() => navigate('/my-bookings')}
                  title="Xem lịch sử đặt phòng cá nhân"
                >
                  <CalendarCheck size={14} className={styles.ctaIcon} />
                  <span>Xem lịch sử đặt phòng</span>
                  <ArrowRight size={13} className={styles.ctaArrow} />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.bookNowCtaBtn}
                  onClick={() => navigate('/login')}
                  title="Đăng nhập tài khoản để tiếp tục"
                >
                  <LogIn size={14} className={styles.ctaIcon} />
                  <span>Đăng nhập ngay</span>
                  <ArrowRight size={13} className={styles.ctaArrow} />
                </button>
              )}
            </div>
          )}

          {/* Call-to-action button when assistant suggests booking rooms, history or requires login */}
          {!isUser && bookingCta && !draft && !isLoginRequired && !isSending && !isError && (
            <div className={styles.ctaButtonWrapper}>
              <button
                type="button"
                className={styles.bookNowCtaBtn}
                onClick={() => handleCtaClick(bookingCta.url)}
                title={bookingCta.isLogin ? 'Đăng nhập vào tài khoản cá nhân' : bookingCta.isMyBookings ? 'Truy cập xem lịch sử đặt phòng cá nhân' : 'Truy cập để khám phá phòng và đặt cọc online'}
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

          {/* Disclaimer text if present in assistant response */}
          {!isUser && message.disclaimer && !isSending && !isError && (
            <div className={styles.messageDisclaimer}>
              {message.disclaimer}
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
              <div className={isRateLimit ? styles.warningMetaContainer : styles.errorMetaContainer}>
                <span className={styles.errorMetaText}>
                  {isRateLimit ? <AlertTriangle size={12} /> : <AlertCircle size={12} />}
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

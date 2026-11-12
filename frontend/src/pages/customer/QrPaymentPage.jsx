import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { QrCode, Copy, Check, RefreshCw, ArrowLeft, Clock, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';

export function QrPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const bookingCode = searchParams.get('bookingCode') || location.state?.booking?.bookingCode || '';

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const fetchBooking = useCallback(async (silent = false) => {
    if (!bookingCode) return;
    if (!silent) setCheckingStatus(true);
    try {
      const latest = await bookingService.getBookingByCode(bookingCode);
      setBooking(latest);

      const isPaid = latest.paymentStatus === 'PARTIALLY_PAID' || latest.paymentStatus === 'FULLY_PAID';
      if (isPaid) {
        showToast('Thanh toán thành công', 'success');
      }
    } catch (err) {
      if (!silent) {
        showToast(err?.message || 'Không thể kiểm tra trạng thái thanh toán', 'error');
      }
    } finally {
      setLoading(false);
      if (!silent) setCheckingStatus(false);
    }
  }, [bookingCode, showToast]);

  useEffect(() => {
    if (!booking && bookingCode) {
      fetchBooking(true);
    } else {
      setLoading(false);
    }
  }, [booking, bookingCode, fetchBooking]);

  // Calculate remaining hold time from booking.holdExpiresAt
  useEffect(() => {
    if (!booking) return;
    const isPaid = booking.paymentStatus === 'PARTIALLY_PAID' || booking.paymentStatus === 'FULLY_PAID';
    const isCancelled = booking.bookingStatus === 'CANCELLED';
    if (isPaid || isCancelled) return;

    const computeRemaining = () => {
      if (booking.holdExpiresAt) {
        const exp = new Date(booking.holdExpiresAt).getTime();
        if (!Number.isNaN(exp)) {
          return Math.max(0, Math.floor((exp - Date.now()) / 1000));
        }
      }
      return 15 * 60;
    };

    setSecondsLeft(computeRemaining());
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [booking]);

  // Auto-poll payment status every 5 seconds while waiting
  useEffect(() => {
    if (!booking) return;
    const isPaid = booking.paymentStatus === 'PARTIALLY_PAID' || booking.paymentStatus === 'FULLY_PAID';
    const isCancelled = booking.bookingStatus === 'CANCELLED';
    const isExpired = secondsLeft === 0;
    if (isPaid || isCancelled || isExpired) return;

    const poller = setInterval(() => {
      fetchBooking(true);
    }, 5000);

    return () => clearInterval(poller);
  }, [booking, secondsLeft, fetchBooking]);

  const formatTimer = (secs) => {
    if (secs === null || secs === undefined) return '15:00';
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCopy = (value, field, label) => {
    if (!navigator.clipboard || !value) return;
    navigator.clipboard.writeText(String(value));
    setCopiedField(field);
    showToast(`Đã sao chép ${label}`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải thông tin giao dịch thanh toán..." />;
  }

  if (!bookingCode || !booking) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <h3>Không tìm thấy thông tin giao dịch</h3>
        <p style={{ color: '#64748B', marginBottom: '1.25rem' }}>
          Vui lòng kiểm tra lại đơn đặt phòng trong mục Lịch sử đặt phòng.
        </p>
        <button className="btn-primary" onClick={() => navigate('/my-bookings')}>
          Về Lịch sử đặt phòng
        </button>
      </div>
    );
  }

  const depositAmount = booking.depositAmount || Math.round((booking.totalAmount || 0) * 0.5);
  const transferContent = `COC ${booking.bookingCode}`;
  const isPaid = booking.paymentStatus === 'PARTIALLY_PAID' || booking.paymentStatus === 'FULLY_PAID';
  const isCancelled = booking.bookingStatus === 'CANCELLED';
  const isExpired = !isPaid && !isCancelled && secondsLeft === 0;
  const hasRealVnPayUrl = Boolean(
    booking.paymentUrl &&
    booking.paymentUrl.startsWith('http') &&
    !booking.paymentUrl.includes('DEMO_TMN')
  );

  return (
    <div style={{ minHeight: '80vh', background: '#F8FAFC', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFFFFF', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#C5A880', fontWeight: 700, letterSpacing: '0.06em' }}>
              GRAND AURORA LUXURY HOTEL
            </div>
            <h1 style={{ margin: '0.25rem 0 0', fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC' }}>
              Thanh toán đặt cọc trực tuyến (QR Code)
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <BookingStatusBadge status={booking.bookingStatus} />
            <PaymentStatusBadge status={booking.paymentStatus} />
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          {/* Paid State */}
          {isPaid && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <ShieldCheck size={48} color="#16A34A" style={{ marginBottom: '0.75rem' }} />
              <h2 style={{ margin: 0, color: '#166534' }}>Thanh toán thành công</h2>
              <p style={{ color: '#15803D', marginTop: '0.5rem' }}>
                Đơn đặt phòng <strong>{booking.bookingCode}</strong> đã được xác nhận thanh toán cọc{' '}
                <strong>{(booking.amountPaid || depositAmount).toLocaleString('vi-VN')} VNĐ</strong>. Không thể thanh toán trùng cho giao dịch này.
              </p>
              <button
                type="button"
                className="btn-auth-gold"
                style={{ width: 'auto', padding: '0.7rem 1.5rem', marginTop: '1rem' }}
                onClick={() => navigate('/my-bookings')}
              >
                Xem chi tiết trong Lịch sử đặt phòng
              </button>
            </div>
          )}

          {/* Cancelled / Expired State */}
          {(isCancelled || isExpired) && !isPaid && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <AlertTriangle size={44} color="#DC2626" style={{ marginBottom: '0.75rem' }} />
              <h2 style={{ margin: 0, color: '#991B1B' }}>
                {isCancelled ? 'Giao dịch đã bị hủy' : 'Mã QR đã hết hạn thanh toán'}
              </h2>
              <p style={{ color: '#B91C1C', marginTop: '0.5rem' }}>
                {isCancelled
                  ? 'Đơn đặt phòng này đã bị hủy và không thể tiếp tục thanh toán.'
                  : 'Thời hạn giữ chỗ 15 phút đã kết thúc. Vui lòng tạo đơn đặt phòng mới nếu bạn vẫn muốn đặt phòng.'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '0.65rem 1.25rem', marginTop: 0 }} onClick={() => navigate('/my-bookings')}>
                  Về Lịch sử đặt phòng
                </button>
                <button type="button" className="btn-auth-gold" style={{ width: 'auto', padding: '0.65rem 1.25rem', marginTop: 0 }} onClick={() => navigate('/rooms')}>
                  Đặt phòng mới
                </button>
              </div>
            </div>
          )}

          {/* Active Payment View */}
          {!isPaid && !isCancelled && !isExpired && (
            <>
              {/* Countdown Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.15rem', borderRadius: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400E', fontWeight: 600 }}>
                  <Clock size={18} />
                  <span>Thời hạn thanh toán giữ phòng:</span>
                </div>
                <strong style={{ fontSize: '1.2rem', color: '#B45309', fontFamily: 'monospace' }}>
                  {formatTimer(secondsLeft)}
                </strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                {/* QR Zone */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                  {booking.qrCodeUrl ? (
                    <img
                      src={booking.qrCodeUrl}
                      alt={`QR thanh toán ${booking.bookingCode}`}
                      style={{ width: '220px', height: '220px', objectFit: 'contain', borderRadius: '8px', background: '#FFF', padding: '8px', border: '1px solid #CBD5E1' }}
                    />
                  ) : (
                    <div style={{ width: '220px', height: '220px', margin: '0 auto', borderRadius: '12px', border: '2px dashed #CBD5E1', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', color: '#475569' }}>
                      <QrCode size={56} color="#94A3B8" style={{ marginBottom: '0.75rem' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.4 }}>
                        Chờ cấu hình tài khoản VietQR / VNPay chính thức từ Quản lý dự án
                      </span>
                    </div>
                  )}

                  <p style={{ fontSize: '0.84rem', color: '#475569', marginTop: '1rem', lineHeight: 1.5 }}>
                    Mở ứng dụng ngân hàng (Mobile Banking) hoặc ví điện tử hỗ trợ QR, quét mã để thanh toán đúng số tiền và nội dung giao dịch.
                  </p>

                  {hasRealVnPayUrl && (
                    <a
                      href={booking.paymentUrl}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        marginTop: '0.75rem',
                        padding: '0.65rem 1.15rem',
                        borderRadius: '8px',
                        background: '#005BAA',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={15} />
                      <span>Mở cổng thanh toán VNPay</span>
                    </a>
                  )}
                </div>

                {/* Transaction Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Khách sạn</div>
                    <strong style={{ color: '#0F172A' }}>Grand Aurora Luxury Hotel</strong>
                  </div>

                  <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Mã booking / Khách hàng</div>
                    <strong style={{ color: '#0F172A' }}>
                      {booking.bookingCode} • {booking.customerName || 'Khách hàng'}
                    </strong>
                  </div>

                  <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: '#FDFBF7', border: '1px solid #E6E1D6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Số tiền cần thanh toán (Cọc 50%)</div>
                      <strong style={{ color: '#16A34A', fontSize: '1.15rem' }}>
                        {depositAmount.toLocaleString('vi-VN')} VNĐ
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="btn-copy-action"
                      onClick={() => handleCopy(depositAmount, 'amount', 'số tiền')}
                    >
                      {copiedField === 'amount' ? <Check size={14} /> : <Copy size={14} />} Sao chép số tiền
                    </button>
                  </div>

                  <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#785E2F' }}>Nội dung chuyển khoản</div>
                      <strong style={{ color: '#78350F', fontFamily: 'monospace', fontSize: '1.05rem' }}>
                        {transferContent}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="btn-copy-action"
                      onClick={() => handleCopy(transferContent, 'content', 'nội dung thanh toán')}
                    >
                      {copiedField === 'content' ? <Check size={14} /> : <Copy size={14} />} Sao chép nội dung thanh toán
                    </button>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
                    Trạng thái giao dịch được đối soát tự động từ Backend/nhà cung cấp thanh toán. Hệ thống không tự xác nhận thanh toán nếu chưa có xác minh từ ngân hàng/cổng thanh toán.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '0.7rem 1.25rem', marginTop: 0, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                  onClick={() => navigate('/my-bookings')}
                >
                  <ArrowLeft size={16} />
                  <span>Quay lại</span>
                </button>

                <button
                  type="button"
                  className="btn-auth-gold"
                  disabled={checkingStatus}
                  style={{ width: 'auto', padding: '0.7rem 1.4rem', marginTop: 0, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => fetchBooking(false)}
                >
                  <RefreshCw size={16} className={checkingStatus ? 'spin' : ''} />
                  <span>{checkingStatus ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái thanh toán'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export default QrPaymentPage;

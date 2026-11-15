import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  QrCode,
  Copy,
  Check,
  RefreshCw,
  ArrowLeft,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Building2,
  User,
  CreditCard,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
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

  const [payment, setPayment] = useState(null);
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [recreating, setRecreating] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const prevStatusRef = useRef(null);

  // Load payment and booking details
  const loadPaymentDetails = useCallback(async (silent = false) => {
    if (!bookingCode) {
      setLoading(false);
      return;
    }
    if (!silent) setCheckingStatus(true);

    try {
      // Gọi API Backend lấy thông tin thanh toán VietQR
      const paymentData = await paymentService.getPaymentByBooking(bookingCode);
      setPayment(paymentData);

      // Nếu có bookingId, đồng bộ trạng thái booking
      if (paymentData?.bookingCode) {
        try {
          const bookingData = await bookingService.getBookingByCode(paymentData.bookingCode);
          setBooking(bookingData);
        } catch (_) {
          // Bỏ qua nếu lỗi nhẹ khi đồng bộ booking
        }
      }

      // Thông báo khi chuyển sang SUCCESS
      if (paymentData?.status === 'SUCCESS' && prevStatusRef.current !== 'SUCCESS') {
        showToast('Thanh toán chuyển khoản thành công! Khách sạn đã xác nhận.', 'success');
      }
      prevStatusRef.current = paymentData?.status;
    } catch (err) {
      if (!silent) {
        showToast(err?.message || 'Không thể tải thông tin thanh toán VietQR', 'error');
      }
    } finally {
      setLoading(false);
      if (!silent) setCheckingStatus(false);
    }
  }, [bookingCode, showToast]);

  useEffect(() => {
    loadPaymentDetails(false);
  }, [loadPaymentDetails]);

  // Đếm ngược thời gian hết hạn (expiresAt)
  useEffect(() => {
    if (!payment) return;
    const isSuccess = payment.status === 'SUCCESS';
    const isCancelled = booking?.bookingStatus === 'CANCELLED';
    if (isSuccess || isCancelled) {
      setSecondsLeft(null);
      return;
    }

    const calculateRemaining = () => {
      if (payment.expiresAt) {
        const exp = new Date(payment.expiresAt).getTime();
        if (!Number.isNaN(exp)) {
          return Math.max(0, Math.floor((exp - Date.now()) / 1000));
        }
      }
      return 15 * 60;
    };

    setSecondsLeft(calculateRemaining());
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
  }, [payment, booking]);

  // Tự động polling trạng thái thanh toán mỗi 5 giây khi giao dịch đang PENDING
  useEffect(() => {
    if (!payment) return;
    const isPending = payment.status === 'PENDING';
    const isExpired = secondsLeft === 0;
    const isCancelled = booking?.bookingStatus === 'CANCELLED';

    if (!isPending || isExpired || isCancelled) return;

    const poller = setInterval(async () => {
      try {
        if (payment.paymentId) {
          const statusRes = await paymentService.getPaymentStatus(payment.paymentId);
          if (statusRes.status !== 'PENDING') {
            loadPaymentDetails(true);
          }
        }
      } catch (_) {
        // Polling im lặng
      }
    }, 5000);

    return () => clearInterval(poller);
  }, [payment, secondsLeft, booking, loadPaymentDetails]);

  const handleCopy = (value, field, label) => {
    if (!navigator.clipboard || !value) return;
    navigator.clipboard.writeText(String(value));
    setCopiedField(field);
    showToast(`Đã sao chép ${label}`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRecreatePayment = async () => {
    setRecreating(true);
    try {
      const res = await paymentService.createVietQrPayment({ bookingCode });
      setPayment(res);
      showToast('Đã tạo mã thanh toán VietQR mới thành công', 'success');
      loadPaymentDetails(true);
    } catch (err) {
      showToast(err?.message || 'Không thể tạo lại mã thanh toán', 'error');
    } finally {
      setRecreating(false);
    }
  };

  const formatTimer = (secs) => {
    if (secs === null || secs === undefined) return '15:00';
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return <LoadingSpinner text="Đang tạo mã thanh toán VietQR an toàn..." />;
  }

  if (!bookingCode || !payment) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <h3 style={{ color: '#0F172A', marginBottom: '0.5rem' }}>Không tìm thấy thông tin giao dịch</h3>
        <p style={{ color: '#64748B', marginBottom: '1.25rem', maxWidth: '420px' }}>
          Đơn đặt phòng không tồn tại hoặc bạn không có quyền truy cập. Vui lòng kiểm tra lại trong mục Lịch sử đặt phòng.
        </p>
        <button type="button" className="btn-primary" onClick={() => navigate('/my-bookings')}>
          Về Lịch sử đặt phòng
        </button>
      </div>
    );
  }

  const isSuccess = payment.status === 'SUCCESS' || booking?.paymentStatus === 'PARTIALLY_PAID' || booking?.paymentStatus === 'FULLY_PAID';
  const isCancelled = booking?.bookingStatus === 'CANCELLED';
  const isFailed = payment.status === 'FAILED';
  const isExpired = !isSuccess && !isCancelled && (payment.status === 'EXPIRED' || secondsLeft === 0);
  const isPending = !isSuccess && !isCancelled && !isFailed && !isExpired;

  const depositAmount = payment.amount || booking?.depositAmount || 0;
  const transferContent = payment.transferContent || `HBS${payment.bookingId || ''}`;

  return (
    <div style={{ minHeight: '85vh', background: '#F8FAFC', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 35px rgba(15, 23, 42, 0.08)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFFFFF', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#C5A880', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Grand Aurora Luxury Hotel
            </div>
            <h1 style={{ margin: '0.25rem 0 0', fontSize: '1.4rem', fontWeight: 700, color: '#F8FAFC' }}>
              Thanh toán Chuyển khoản VietQR
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.1)', color: '#CBD5E1', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              Mã đơn: <strong>{payment.bookingCode}</strong>
            </span>
            <PaymentStatusBadge status={payment.status === 'SUCCESS' ? 'PARTIALLY_PAID' : payment.status} />
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          {/* TRƯỜNG HỢP 1: THANH TOÁN THÀNH CÔNG */}
          {isSuccess && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '14px', marginBottom: '1.5rem' }}>
              <ShieldCheck size={56} color="#16A34A" style={{ marginBottom: '0.75rem' }} />
              <h2 style={{ margin: 0, color: '#166534', fontSize: '1.5rem' }}>Thanh toán cọc thành công!</h2>
              <p style={{ color: '#15803D', marginTop: '0.6rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Giao dịch của đơn đặt phòng <strong>{payment.bookingCode}</strong> đã được đối soát và xác nhận thành công.
                <br />
                Số tiền đã thanh toán: <strong>{Number(depositAmount).toLocaleString('vi-VN')} VNĐ</strong>.
              </p>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-auth-gold"
                  style={{ width: 'auto', padding: '0.75rem 1.75rem' }}
                  onClick={() => navigate('/my-bookings')}
                >
                  Xem chi tiết trong Lịch sử đặt phòng
                </button>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 2: GIAO DỊCH BỊ TỪ CHỐI HOẶC BỊ HỦY */}
          {(isCancelled || isFailed) && !isSuccess && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', marginBottom: '1.5rem' }}>
              <AlertTriangle size={52} color="#DC2626" style={{ marginBottom: '0.75rem' }} />
              <h2 style={{ margin: 0, color: '#991B1B', fontSize: '1.4rem' }}>
                {isCancelled ? 'Đơn đặt phòng đã bị hủy' : 'Giao dịch thanh toán bị từ chối'}
              </h2>
              <p style={{ color: '#B91C1C', marginTop: '0.6rem', fontSize: '0.92rem', lineHeight: 1.5 }}>
                {isCancelled
                  ? 'Đơn đặt phòng này đã bị hủy bỏ và không thể tiếp tục thực hiện thanh toán.'
                  : `Giao dịch chuyển khoản không hợp lệ hoặc bị từ chối bởi nhân viên đối soát.${payment.rejectionReason ? ` Lý do: ${payment.rejectionReason}` : ''}`}
              </p>
              <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '0.65rem 1.25rem' }} onClick={() => navigate('/my-bookings')}>
                  Về Lịch sử đặt phòng
                </button>
                <button type="button" className="btn-auth-gold" style={{ width: 'auto', padding: '0.65rem 1.25rem' }} onClick={() => navigate('/rooms')}>
                  Đặt phòng mới
                </button>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 3: MÃ QR HẾT HẠN */}
          {isExpired && !isSuccess && !isCancelled && !isFailed && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '14px', marginBottom: '1.5rem' }}>
              <Clock size={52} color="#D97706" style={{ marginBottom: '0.75rem' }} />
              <h2 style={{ margin: 0, color: '#92400E', fontSize: '1.4rem' }}>
                Mã QR đã hết hạn thanh toán
              </h2>
              <p style={{ color: '#B45309', marginTop: '0.6rem', fontSize: '0.92rem', lineHeight: 1.5 }}>
                Thời hạn thanh toán 15 phút của mã QR này đã kết thúc để đảm bảo an toàn đối soát.
                <br />
                Nếu bạn vẫn muốn tiếp tục thanh toán cho đơn này, hãy nhấn nút dưới đây để tạo mã QR mới.
              </p>
              <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-auth-gold"
                  disabled={recreating}
                  style={{ width: 'auto', padding: '0.7rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={handleRecreatePayment}
                >
                  <RotateCcw size={16} className={recreating ? 'spin' : ''} />
                  <span>{recreating ? 'Đang tạo mới...' : 'Tạo lại mã QR thanh toán'}</span>
                </button>
                <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '0.7rem 1.25rem' }} onClick={() => navigate('/my-bookings')}>
                  Về Lịch sử đặt phòng
                </button>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 4: GIAO DỊCH ĐANG CHỜ THANH TOÁN (PENDING) */}
          {isPending && (
            <>
              {/* Countdown Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderRadius: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400E', fontWeight: 600, fontSize: '0.92rem' }}>
                  <Clock size={18} />
                  <span>Thời gian hiệu lực của mã QR:</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', color: '#B45309' }}>Tự động làm mới khi có tiền:</span>
                  <strong style={{ fontSize: '1.3rem', color: '#B45309', fontFamily: 'monospace' }}>
                    {formatTimer(secondsLeft)}
                  </strong>
                </div>
              </div>

              {/* Main Grid: Left QR / Right Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>
                
                {/* QR Section */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.75rem', textAlign: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ marginBottom: '1rem', fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <QrCode size={18} color="#C5A880" />
                    <span>MÃ VIETQR CHUYỂN KHOẢN</span>
                  </div>

                  {payment.bankConfigured && payment.qrCodeUrl ? (
                    <div style={{ display: 'inline-block', padding: '10px', background: '#FFFFFF', borderRadius: '12px', border: '2px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <img
                        src={payment.qrCodeUrl}
                        alt={`Mã VietQR thanh toán đơn ${payment.bookingCode}`}
                        style={{ width: '250px', height: '250px', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                  ) : (
                    <div style={{ width: '250px', height: '250px', margin: '0 auto', borderRadius: '12px', border: '2px dashed #CBD5E1', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', color: '#475569' }}>
                      <Building2 size={48} color="#94A3B8" style={{ marginBottom: '0.75rem' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B', lineHeight: 1.4 }}>
                        Chờ cấu hình thông tin ngân hàng từ Backend
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.35rem' }}>
                        (BANK_CODE, BANK_ACCOUNT)
                      </span>
                    </div>
                  )}

                  <p style={{ fontSize: '0.84rem', color: '#475569', marginTop: '1.2rem', lineHeight: 1.5 }}>
                    Mở ứng dụng Mobile Banking của ngân hàng bất kỳ, chọn <strong>Quét mã QR</strong> để chuyển tiền tự động điền đúng số tiền và nội dung.
                  </p>
                </div>

                {/* Account & Transfer Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  
                  {/* Ngân hàng */}
                  <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Building2 size={14} /> Ngân hàng thụ hưởng
                    </div>
                    <strong style={{ color: '#0F172A', fontSize: '0.98rem' }}>
                      {payment.bankCode ? `${payment.bankCode} (Ngân hàng TMCP)` : 'Đang cập nhật'}
                    </strong>
                  </div>

                  {/* Số tài khoản */}
                  <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CreditCard size={14} /> Số tài khoản
                      </div>
                      <strong style={{ color: '#0F172A', fontSize: '1.05rem', fontFamily: 'monospace' }}>
                        {payment.bankAccount || 'Đang cập nhật'}
                      </strong>
                    </div>
                    {payment.bankAccount && (
                      <button
                        type="button"
                        className="btn-copy-action"
                        onClick={() => handleCopy(payment.bankAccount, 'account', 'số tài khoản')}
                      >
                        {copiedField === 'account' ? <Check size={14} /> : <Copy size={14} />} Sao chép
                      </button>
                    )}
                  </div>

                  {/* Tên chủ tài khoản */}
                  <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <User size={14} /> Tên chủ tài khoản
                    </div>
                    <strong style={{ color: '#0F172A', fontSize: '0.98rem', textTransform: 'uppercase' }}>
                      {payment.bankAccountName || 'Grand Aurora Luxury Hotel'}
                    </strong>
                  </div>

                  {/* Số tiền cần thanh toán */}
                  <div style={{ padding: '0.9rem 1rem', borderRadius: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
                        Số tiền cần thanh toán (Cọc 50%)
                      </div>
                      <strong style={{ color: '#16A34A', fontSize: '1.25rem' }}>
                        {Number(depositAmount).toLocaleString('vi-VN')} VNĐ
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="btn-copy-action"
                      style={{ background: '#DCFCE7', color: '#166534', borderColor: '#86EFAC' }}
                      onClick={() => handleCopy(depositAmount, 'amount', 'số tiền')}
                    >
                      {copiedField === 'amount' ? <Check size={14} /> : <Copy size={14} />} Sao chép
                    </button>
                  </div>

                  {/* Nội dung chuyển khoản */}
                  <div style={{ padding: '0.9rem 1rem', borderRadius: '10px', background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#92400E', fontWeight: 700 }}>
                        Nội dung chuyển khoản (Bắt buộc chính xác)
                      </div>
                      <strong style={{ color: '#78350F', fontFamily: 'monospace', fontSize: '1.15rem', letterSpacing: '0.04em' }}>
                        {transferContent}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="btn-copy-action"
                      style={{ background: '#FDE68A', color: '#78350F', borderColor: '#F59E0B' }}
                      onClick={() => handleCopy(transferContent, 'content', 'nội dung chuyển khoản')}
                    >
                      {copiedField === 'content' ? <Check size={14} /> : <Copy size={14} />} Sao chép
                    </button>
                  </div>

                  {/* Mã tham chiếu giao dịch */}
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.82rem', color: '#64748B' }}>
                    Mã giao dịch nội bộ: <code>{payment.transactionCode}</code>
                  </div>
                </div>
              </div>

              {/* Security Hint */}
              <div style={{ marginTop: '1.5rem', padding: '0.9rem 1.15rem', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #CBD5E1', fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
                ℹ️ <strong>Lưu ý quan trọng:</strong> Vui lòng giữ nguyên nội dung chuyển khoản <code>{transferContent}</code> để hệ thống đối chiếu tự động với ngân hàng. Sau khi bạn chuyển khoản, nhân viên khách sạn sẽ xác nhận giao dịch trong vòng ít phút.
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '0.7rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                  onClick={() => navigate('/my-bookings')}
                >
                  <ArrowLeft size={16} />
                  <span>Quay lại lịch sử đặt phòng</span>
                </button>

                <button
                  type="button"
                  className="btn-auth-gold"
                  disabled={checkingStatus}
                  style={{ width: 'auto', padding: '0.7rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => loadPaymentDetails(false)}
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

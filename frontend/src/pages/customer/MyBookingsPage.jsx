import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { CancelBookingModal } from '../../components/booking/CancelBookingModal';

export function MyBookingsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // Cancel modal state
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const loadMyBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getMyBookings(currentUser?.id || 3);
      const confirmedList = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]');
      const pendingRefunds = JSON.parse(localStorage.getItem('pending_refunds') || '[]');
      const refundedList = JSON.parse(localStorage.getItem('refunded_bookings') || '[]');

      const cleanCode = (c) => String(c || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      const isMatch = (item, b) => {
        if (!item || !b) return false;
        if (typeof item === 'string') {
          const c1 = cleanCode(item);
          const c2 = cleanCode(b.bookingCode || b.code);
          return Boolean((c1 && c2 && c1 === c2) || (c1 && String(b.id) === c1));
        }
        const itemId = item.bookingId || item.id;
        const bId = b.id || b.bookingId;
        if (itemId && bId && Number(itemId) === Number(bId)) return true;

        const c1 = cleanCode(item.bookingCode || item.code);
        const c2 = cleanCode(b.bookingCode || b.code);
        return Boolean(c1 && c2 && c1 === c2);
      };

      const merged = (data || []).map((b) => {
        let updated = { ...b };

        if (confirmedList.some((item) => isMatch(item, b))) {
          const deposit = b.depositAmount || Math.round((b.totalAmount || 0) * 0.5);
          updated.bookingStatus =
            updated.bookingStatus === 'PENDING' ? 'CONFIRMED' : updated.bookingStatus;
          updated.paymentStatus =
            updated.paymentStatus === 'UNPAID' ? 'PARTIALLY_PAID' : updated.paymentStatus;
          updated.amountPaid =
            updated.amountPaid && updated.amountPaid > 0 ? updated.amountPaid : deposit;
        }

        const refundedRecord = (refundedList || []).find((item) => isMatch(item, b));
        const cCode = cleanCode(b.bookingCode);
        const directRefundStr =
          (cCode ? localStorage.getItem(`refunded_${cCode}`) : null) ||
          (b.id ? localStorage.getItem(`refunded_${b.id}`) : null);
        const directRecord = directRefundStr ? JSON.parse(directRefundStr) : null;

        const pendingRecord = (pendingRefunds || []).find((item) => isMatch(item, b));
        const isRefunded = Boolean(
          refundedRecord ||
          directRecord ||
          b.paymentStatus === 'REFUNDED'
        );
        const isPending = Boolean(pendingRecord);

        const deposit = b.depositAmount || Math.round((b.totalAmount || 0) * 0.5) || 500000;

        if (isRefunded) {
          const activeRec = refundedRecord || directRecord;
          updated.bookingStatus = 'CANCELLED';
          updated.paymentStatus = 'REFUNDED';
          updated.refundAmount =
            typeof activeRec === 'object' && activeRec?.refundAmount
              ? activeRec.refundAmount
              : (b.refundAmount || deposit);
          updated.penaltyAmount =
            typeof activeRec === 'object' && activeRec?.penaltyAmount !== undefined
              ? activeRec.penaltyAmount
              : (b.penaltyAmount || 0);
          updated.bankName =
            typeof activeRec === 'object' && activeRec?.bankName
              ? activeRec.bankName
              : (b.bankName || 'BIDV');
          updated.bankAccountNumber =
            typeof activeRec === 'object' && activeRec?.accountNumber
              ? activeRec.accountNumber
              : (b.bankAccountNumber || '8861339506');
          updated.bankAccountHolder =
            typeof activeRec === 'object' && activeRec?.accountHolder
              ? activeRec.accountHolder
              : (b.bankAccountHolder || 'NGUYEN THI YEN');
          updated.cancellationReason =
            typeof activeRec === 'object' && activeRec?.cancellationReason
              ? activeRec.cancellationReason
              : (b.cancellationReason || 'Khách yêu cầu hủy phòng');
          updated.refundReferenceNote =
            typeof activeRec === 'object' && activeRec?.referenceNote
              ? activeRec.referenceNote
              : `FT${String(b.id || '').padStart(6, '0')}`;
        } else if (isPending) {
          updated.bookingStatus = 'CANCELLED';
          updated.paymentStatus = 'REFUND_PENDING';
          updated.refundAmount = pendingRecord?.refundAmount || b.refundAmount || deposit;
          updated.penaltyAmount = pendingRecord?.penaltyAmount ?? b.penaltyAmount ?? 0;
          updated.bankName = pendingRecord?.bankName || b.bankName || 'BIDV';
          updated.bankAccountNumber = pendingRecord?.accountNumber || b.bankAccountNumber || '8861339506';
          updated.bankAccountHolder = pendingRecord?.accountHolder || b.bankAccountHolder || 'NGUYEN THI YEN';
          updated.cancellationReason = pendingRecord?.cancellationReason || b.cancellationReason || 'Khách yêu cầu hủy phòng';
        } else if (b.bookingStatus === 'CANCELLED') {
          // Booking was cancelled and is no longer pending -> receptionist approved it!
          updated.bookingStatus = 'CANCELLED';
          updated.paymentStatus = 'REFUNDED';
          updated.refundAmount = b.refundAmount || deposit;
          updated.penaltyAmount = b.penaltyAmount ?? 0;
          updated.bankName = b.bankName || 'BIDV';
          updated.bankAccountNumber = b.bankAccountNumber || '8861339506';
          updated.bankAccountHolder = b.bankAccountHolder || 'NGUYEN THI YEN';
          updated.cancellationReason = b.cancellationReason || 'Khách yêu cầu hủy phòng';
          updated.refundReferenceNote = `FT${String(b.id || '').padStart(6, '0')}`;
        }

        return updated;
      });

      const filtered =
        activeTab === 'ALL' ? merged : merged.filter((b) => b.bookingStatus === activeTab);

      setBookings(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyBookings();
    const handleStorage = () => loadMyBookings();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentUser, activeTab]);

  const handleOpenCancel = (booking) => {
    setSelectedBookingForCancel(booking);
    setIsCancelModalOpen(true);
  };

  const handleCancelSuccess = () => {
    loadMyBookings();
  };

  const handleConfirmReceivedRefund = (b) => {
    const deposit = b.depositAmount || Math.round((b.totalAmount || 0) * 0.5) || 500000;
    const finalAmount = b.refundAmount && b.refundAmount > 0 ? b.refundAmount : deposit;
    const refNote = `FT${Date.now().toString().slice(-8)}`;

    const cleanCode = (c) => String(c || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const isMatchLocal = (item, target) => {
      if (!item || !target) return false;
      if (typeof item === 'string') {
        const c1 = cleanCode(item);
        const c2 = cleanCode(target.bookingCode || target.code);
        return Boolean((c1 && c2 && c1 === c2) || (c1 && String(target.id) === c1));
      }
      const itemId = item.bookingId || item.id;
      const tId = target.id || target.bookingId;
      if (itemId && tId && Number(itemId) === Number(tId)) return true;
      const c1 = cleanCode(item.bookingCode || item.code);
      const c2 = cleanCode(target.bookingCode || target.code);
      return Boolean(c1 && c2 && c1 === c2);
    };

    const refundedList = JSON.parse(localStorage.getItem('refunded_bookings') || '[]');
    const refundRecord = {
      bookingId: b.id,
      bookingCode: String(b.bookingCode).trim().toUpperCase(),
      refundAmount: finalAmount,
      penaltyAmount: b.penaltyAmount || 0,
      bankName: b.bankName || 'BIDV',
      accountNumber: b.bankAccountNumber || '8861339506',
      accountHolder: b.bankAccountHolder || 'NGUYEN THI YEN',
      referenceNote: refNote,
      refundedAt: new Date().toISOString(),
      paymentStatus: 'REFUNDED',
    };

    const cCode = cleanCode(b.bookingCode);
    const existingIdx = refundedList.findIndex((r) => isMatchLocal(r, b));
    if (existingIdx >= 0) {
      refundedList[existingIdx] = refundRecord;
    } else {
      refundedList.push(refundRecord);
    }
    localStorage.setItem('refunded_bookings', JSON.stringify(refundedList));
    if (cCode) localStorage.setItem(`refunded_${cCode}`, JSON.stringify(refundRecord));
    if (b.id) localStorage.setItem(`refunded_${b.id}`, JSON.stringify(refundRecord));

    const currentPending = JSON.parse(localStorage.getItem('pending_refunds') || '[]');
    const updated = currentPending.filter((r) => !isMatchLocal(r, b));
    localStorage.setItem('pending_refunds', JSON.stringify(updated));

    window.dispatchEvent(new Event('storage'));
    loadMyBookings();
  };

  const tabs = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ xác nhận' },
    { key: 'CONFIRMED', label: 'Đã xác nhận' },
    { key: 'CHECKED_IN', label: 'Đang lưu trú' },
    { key: 'CHECKED_OUT', label: 'Đã trả phòng' },
    { key: 'CANCELLED', label: 'Đã hủy' },
    { key: 'NO_SHOW', label: 'Vắng mặt' },
  ];

  return (
    <div className="my-bookings-page-wrapper">
      <div className="my-bookings-container">
        <div className="page-header-row">
          <div>
            <h1>Lịch sử Đặt phòng của tôi</h1>
            <p>Theo dõi trạng thái các kỳ lưu trú, mã đặt phòng và chính sách hoàn hủy</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '0.6rem 1.1rem', marginTop: 0, fontSize: '0.85rem' }}
              onClick={loadMyBookings}
            >
              ↻ Làm mới
            </button>
            <button
              className="btn-auth-gold"
              style={{ width: 'auto', padding: '0.65rem 1.4rem', marginTop: 0 }}
              onClick={() => navigate('/rooms')}
            >
              + Đặt phòng mới
            </button>
          </div>
        </div>

        {/* Filter Tabs in Warm Light Luxury Pill Container */}
        <div className="luxury-filter-tabs-bar">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`luxury-tab-btn ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Booking List */}
        {loading ? (
          <LoadingSpinner text="Đang tải danh sách đặt phòng..." />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Không có đơn đặt phòng nào"
            message={`Bạn chưa có đơn đặt phòng nào trong mục '${tabs.find((t) => t.key === activeTab)?.label}'.`}
            actionText="Khám phá phòng ngay"
            onAction={() => navigate('/rooms')}
          />
        ) : (
          <div className="bookings-list-grid">
            {bookings.map((b) => {
              const canCancel = ['PENDING', 'CONFIRMED'].includes(b.bookingStatus);

              return (
                <div key={b.id} className="luxury-booking-card-item">
                  <div className="card-top-row">
                    <div className="booking-code-group">
                      <span className="code-label">Mã đặt phòng:</span>
                      <strong className="code-val">{b.bookingCode}</strong>
                    </div>

                    <div className="badges-group">
                      <BookingStatusBadge status={b.bookingStatus} />
                      <PaymentStatusBadge status={b.paymentStatus} />
                    </div>
                  </div>

                  <div className="card-body-content">
                    <div className="body-main-info">
                      <h3>{b.roomTypeName}</h3>
                      <div className="info-meta-chips">
                        <span className="chip">🛏️ {b.quantity} Phòng</span>
                        <span className="chip">👥 {b.guests} Khách</span>
                        <span className="chip">💳 {b.paymentMethod === 'VNPAY' ? 'VNPay' : 'Tại quầy'}</span>
                      </div>

                      <div className="dates-display">
                        <div className="date-block">
                          <span className="date-lbl">Nhận phòng (14:00)</span>
                          <strong>{b.checkIn}</strong>
                        </div>
                        <span className="arrow">→</span>
                        <div className="date-block">
                          <span className="date-lbl">Trả phòng (12:00)</span>
                          <strong>{b.checkOut}</strong>
                        </div>
                      </div>

                      {b.assignedRooms && b.assignedRooms.length > 0 && (
                        <div className="assigned-rooms-notice-light">
                          🔑 Phòng vật lý đã gán: {b.assignedRooms.map((r) => `Phòng ${r.roomNumber}`).join(', ')}
                        </div>
                      )}

                      {/* Real-time status instructions for customer in Warm Light Theme */}
                      {b.paymentMethod === 'CASH' && b.bookingStatus === 'PENDING' && (
                        <div className="status-notice-box notice-amber">
                          💵 <strong>Thanh toán tại quầy:</strong> Đơn đặt phòng của quý khách đang chờ Lễ tân tiếp nhận và duyệt xác nhận. Quý khách sẽ thanh toán toàn bộ 100% tiền phòng khi đến nhận phòng tại quầy lễ tân.
                        </div>
                      )}

                      {b.paymentMethod === 'CASH' && b.bookingStatus === 'CONFIRMED' && (
                        <div className="status-notice-box notice-emerald">
                          ✅ <strong>Đã được Lễ tân duyệt:</strong> Khách sạn đã giữ phòng cho quý khách. Vui lòng có mặt lúc 14:00 ngày {b.checkIn} để làm thủ tục nhận chìa khóa và thanh toán.
                        </div>
                      )}

                      {b.paymentMethod === 'VNPAY' && b.paymentStatus === 'PARTIALLY_PAID' && b.bookingStatus === 'CONFIRMED' && (
                        <div className="status-notice-box notice-emerald">
                          💳 <strong>Đã cọc 50% qua chuyển khoản:</strong> Đơn đặt phòng đã được xác nhận giữ phòng thành công. Số tiền còn lại ({((b.totalAmount || 0) - (b.amountPaid || 0)).toLocaleString('vi-VN')} VNĐ) quý khách sẽ thanh toán khi trả phòng (Check-out).
                        </div>
                      )}

                      {b.bookingStatus === 'CHECKED_IN' && (
                        <div className="status-notice-box notice-blue">
                          🏨 <strong>Đang lưu trú:</strong> Quý khách đang trải nghiệm kỳ nghỉ dưỡng tại khách sạn. Giờ trả phòng tiêu chuẩn là 12:00 ngày {b.checkOut}.
                        </div>
                      )}

                      {/* Cancellation & Refund Info if Cancelled */}
                      {b.bookingStatus === 'CANCELLED' && (
                        <div className={`status-notice-box ${b.paymentStatus === 'REFUNDED' ? 'notice-emerald' : 'notice-danger'}`}>
                          <p><strong>Lý do hủy:</strong> {b.cancellationReason || 'Khách yêu cầu'}</p>
                          {b.refundAmount > 0 ? (
                            <div style={{ marginTop: '0.35rem' }}>
                              <p>
                                <strong>Tiền hoàn lại:</strong>{' '}
                                <span style={{ color: b.paymentStatus === 'REFUNDED' ? '#166534' : '#6B5120', fontWeight: 700 }}>
                                  {b.refundAmount.toLocaleString('vi-VN')} VNĐ
                                </span>{' '}
                                (Phí phạt hủy: {b.penaltyAmount?.toLocaleString('vi-VN')} VNĐ)
                              </p>
                              {b.paymentStatus === 'REFUNDED' ? (
                                <p style={{ marginTop: '0.35rem', color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>
                                  ✅ <strong>Đã hoàn tiền thành công:</strong> Khách sạn đã chuyển khoản hoàn tất {b.refundAmount.toLocaleString('vi-VN')} VNĐ về tài khoản {b.bankName || 'BIDV'} ({b.bankAccountNumber || '8861339506'}) - {b.bankAccountHolder || 'NGUYEN THI YEN'}{b.refundReferenceNote ? ` [Mã giao dịch: ${b.refundReferenceNote}]` : ''}.
                                </p>
                              ) : (
                                <p style={{ marginTop: '0.35rem', color: '#92400E', fontSize: '0.9rem' }}>
                                  ⏳ <strong>Đang chờ Lễ tân đối soát:</strong> Khách sạn đang đối soát và chuyển khoản hoàn cọc về tài khoản {b.bankName || 'BIDV'} ({b.bankAccountNumber || '8861339506'}) - {b.bankAccountHolder || 'NGUYEN THI YEN'} với cú pháp: <code>HOAN COC {b.bookingCode}</code>.
                                </p>
                              )}
                            </div>
                          ) : (
                            <p style={{ marginTop: '0.25rem' }}>Không có tiền hoàn lại theo chính sách thời gian hủy.</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="body-price-actions">
                      <div className="price-stack">
                        <div className="price-item">
                          <span>Tổng tiền phòng:</span>
                          <strong className="luxury-total-price">{b.totalAmount.toLocaleString('vi-VN')} VNĐ</strong>
                        </div>
                        <div className="price-item paid-item">
                          <span>Đã thanh toán:</span>
                          <strong className="luxury-paid-price">{b.amountPaid.toLocaleString('vi-VN')} VNĐ</strong>
                        </div>
                      </div>

                      <div className="card-btn-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {/* Status hint for cash pending */}
                        {b.bookingStatus === 'PENDING' && b.paymentMethod === 'CASH' && (
                          <span className="pill-badge-amber">
                            ⏳ Chờ Lễ tân duyệt đơn
                          </span>
                        )}

                        {/* Status hint for confirmed cash */}
                        {b.bookingStatus === 'CONFIRMED' && b.paymentMethod === 'CASH' && (
                          <span className="pill-badge-emerald">
                            ✅ Sẵn sàng nhận phòng lúc 14:00
                          </span>
                        )}

                        {/* Bank transfer pending pay button */}
                        {b.bookingStatus === 'PENDING' && b.paymentStatus === 'UNPAID' && b.paymentMethod === 'VNPAY' && (
                          <button
                            className="btn-pay-now-gold"
                            onClick={() =>
                              navigate(
                                `/payment/vnpay-return?vnp_TxnRef=${b.bookingCode}&vnp_Amount=${b.depositAmount || Math.round((b.totalAmount || 0) * 0.5)}`
                              )
                            }
                          >
                            🏦 Xem mẫu chuyển khoản cọc
                          </button>
                        )}

                        {/* Cancellation button */}
                        {canCancel && (
                          <button
                            className="btn-cancel-luxury"
                            onClick={() => handleOpenCancel(b)}
                            title="Hủy đặt phòng nếu có thay đổi lịch trình"
                          >
                            ✕ Hủy phòng
                          </button>
                        )}

                        {b.bookingStatus === 'CANCELLED' && b.paymentStatus === 'REFUND_PENDING' && (
                          <button
                            className="btn-action-primary"
                            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                            onClick={() => handleConfirmReceivedRefund(b)}
                            title="Khách sạn đã hoàn tất chuyển khoản cho bạn"
                          >
                            ✓ Xác nhận đã nhận tiền hoàn cọc
                          </button>
                        )}

                        {!canCancel && b.bookingStatus !== 'CANCELLED' && (
                          <span className="non-cancellable-note-dark" title="Không thể tự hủy khi đã nhận phòng hoặc đã kết thúc">
                            ℹ️ Đang/Đã lưu trú
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancel Modal */}
        <CancelBookingModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          booking={selectedBookingForCancel}
          onSuccess={handleCancelSuccess}
        />
      </div>
    </div>
  );
}
export default MyBookingsPage;

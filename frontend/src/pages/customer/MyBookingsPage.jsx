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
      const data = await bookingService.getMyBookings(currentUser?.id || 3, {
        status: activeTab,
      });
      setBookings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyBookings();
  }, [currentUser, activeTab]);

  const handleOpenCancel = (booking) => {
    setSelectedBookingForCancel(booking);
    setIsCancelModalOpen(true);
  };

  const handleCancelSuccess = () => {
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
          <button
            className="btn-auth-gold"
            style={{ width: 'auto', padding: '0.65rem 1.4rem', marginTop: 0 }}
            onClick={() => navigate('/rooms')}
          >
            + Đặt phòng mới
          </button>
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
                          💳 <strong>Đã cọc 50% qua VNPay:</strong> Đơn đặt phòng đã được xác nhận tự động. Số tiền còn lại ({((b.totalAmount || 0) - (b.amountPaid || 0)).toLocaleString('vi-VN')} VNĐ) quý khách sẽ thanh toán khi trả phòng (Check-out).
                        </div>
                      )}

                      {b.bookingStatus === 'CHECKED_IN' && (
                        <div className="status-notice-box notice-blue">
                          🏨 <strong>Đang lưu trú:</strong> Quý khách đang trải nghiệm kỳ nghỉ dưỡng tại khách sạn. Giờ trả phòng tiêu chuẩn là 12:00 ngày {b.checkOut}.
                        </div>
                      )}

                      {/* Cancellation & Refund Info if Cancelled */}
                      {b.bookingStatus === 'CANCELLED' && (
                        <div className="status-notice-box notice-danger">
                          <p><strong>Lý do hủy:</strong> {b.cancellationReason || 'Khách yêu cầu'}</p>
                          {b.refundAmount > 0 ? (
                            <p style={{ marginTop: '0.25rem' }}>
                              <strong>Tiền hoàn:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>{b.refundAmount.toLocaleString('vi-VN')} VNĐ</span> (Phí phạt: {b.penaltyAmount?.toLocaleString('vi-VN')} VNĐ)
                              {b.bankAccountNumber && ` → Tài khoản: ${b.bankName} (${b.bankAccountNumber})`}
                            </p>
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

                        {/* VNPay pending pay button */}
                        {b.bookingStatus === 'PENDING' && b.paymentStatus === 'UNPAID' && b.paymentMethod === 'VNPAY' && (
                          <button
                            className="btn-pay-now-gold"
                            onClick={() =>
                              navigate(
                                `/payment/vnpay-return?vnp_TxnRef=${b.bookingCode}&vnp_Amount=${b.depositAmount}`
                              )
                            }
                          >
                            💳 Thanh toán cọc VNPay
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

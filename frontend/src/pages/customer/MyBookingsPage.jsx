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
    <div className="my-bookings-container">
      <div className="page-header-row">
        <div>
          <h1>Lịch sử Đặt phòng của tôi</h1>
          <p>Theo dõi trạng thái các kỳ lưu trú, mã đặt phòng và chính sách hoàn hủy</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/rooms')}>
          + Đặt phòng mới
        </button>
      </div>

      {/* Tabs */}
      <div className="filter-tabs-bar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
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
              <div key={b.id} className="booking-card-item">
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
                      <div className="assigned-rooms-notice">
                        🔑 Phòng vật lý đã gán: {b.assignedRooms.map((r) => `Phòng ${r.roomNumber}`).join(', ')}
                      </div>
                    )}

                    {/* Cancellation & Refund Info if Cancelled */}
                    {b.bookingStatus === 'CANCELLED' && (
                      <div className="cancellation-info-box">
                        <p><strong>Lý do hủy:</strong> {b.cancellationReason || 'Khách yêu cầu'}</p>
                        {b.refundAmount > 0 ? (
                          <p>
                            <strong>Tiền hoàn:</strong> <span className="green-text">{b.refundAmount.toLocaleString('vi-VN')} VNĐ</span> (Phí phạt: {b.penaltyAmount?.toLocaleString('vi-VN')} VNĐ)
                            {b.bankAccountNumber && ` → Tài khoản: ${b.bankName} (${b.bankAccountNumber})`}
                          </p>
                        ) : (
                          <p>Không có tiền hoàn lại theo chính sách thời gian hủy.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="body-price-actions">
                    <div className="price-stack">
                      <div className="price-item">
                        <span>Tổng tiền phòng:</span>
                        <strong>{b.totalAmount.toLocaleString('vi-VN')} VNĐ</strong>
                      </div>
                      <div className="price-item paid-item">
                        <span>Đã thanh toán:</span>
                        <strong className="green-text">{b.amountPaid.toLocaleString('vi-VN')} VNĐ</strong>
                      </div>
                    </div>

                    <div className="card-btn-actions">
                      {/* Cancellation button */}
                      {canCancel && (
                        <button
                          className="btn-outline-danger"
                          onClick={() => handleOpenCancel(b)}
                        >
                          Hủy phòng
                        </button>
                      )}

                      {/* VNPay pending pay button */}
                      {b.bookingStatus === 'PENDING' && b.paymentStatus === 'UNPAID' && b.paymentMethod === 'VNPAY' && (
                        <button
                          className="btn-pay-now"
                          onClick={() =>
                            navigate(
                              `/payment/vnpay-return?vnp_TxnRef=${b.bookingCode}&vnp_Amount=${b.depositAmount}`
                            )
                          }
                        >
                          Thanh toán cọc VNPay
                        </button>
                      )}

                      {!canCancel && b.bookingStatus !== 'CANCELLED' && (
                        <span className="non-cancellable-note" title="Không thể tự hủy khi đã nhận phòng hoặc đã kết thúc">
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
  );
}

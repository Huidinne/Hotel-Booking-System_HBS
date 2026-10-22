import React, { useState, useEffect } from 'react';
import { bookingService } from '../../services/bookingService';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { CheckInModal } from '../../components/booking/CheckInModal';
import { CheckOutModal } from '../../components/booking/CheckOutModal';
import { CancelBookingModal } from '../../components/booking/CancelBookingModal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export function ReceptionistBookingsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Modals state
  const [selectedBookingForCheckIn, setSelectedBookingForCheckIn] = useState(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  const [selectedBookingForCheckOut, setSelectedBookingForCheckOut] = useState(null);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);

  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getReceptionistBookings({
        status: statusFilter,
        paymentStatus: paymentFilter,
        searchTerm,
      });
      setBookings(data);
    } catch (err) {
      showToast(err.message || 'Lỗi tải danh sách booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [statusFilter, paymentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadBookings();
  };

  const handleConfirmCashOrder = async (bookingId, bookingCode) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận duyệt đơn đặt phòng',
      message: `Bạn có chắc chắn muốn duyệt đơn ${bookingCode}? Đơn sẽ chuyển sang trạng thái CONFIRMED (Đã xác nhận) để sẵn sàng làm thủ tục nhận phòng khi khách đến.`,
      confirmText: 'Duyệt đơn',
      cancelText: 'Quay lại',
      variant: 'primary',
      icon: '✓',
    });
    if (!isConfirmed) return;

    try {
      await bookingService.confirmCashBooking(bookingId);
      showToast(`Đã duyệt đơn ${bookingCode} thành công! Đơn đã chuyển sang trạng thái CONFIRMED.`, 'success');
      loadBookings();
    } catch (err) {
      showToast(err.message || 'Lỗi duyệt đơn', 'error');
    }
  };

  const handleMarkNoShow = async (bookingId, bookingCode) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận khách vắng mặt (No-Show)',
      message: `Đánh dấu No-Show cho đơn ${bookingCode}? Hệ thống sẽ giữ 100% cọc đêm đầu và giải phóng quota các đêm còn lại theo quy định SRS §2.5.`,
      confirmText: 'Đánh dấu No-Show',
      cancelText: 'Hủy bỏ',
      variant: 'warning',
      icon: '⚠️',
    });
    if (!isConfirmed) return;

    try {
      await bookingService.markNoShow(bookingId);
      showToast(`Đã chuyển đơn ${bookingCode} sang NO_SHOW và giải phóng quota phòng.`, 'success');
      loadBookings();
    } catch (err) {
      showToast(err.message || 'Lỗi đánh dấu No-Show', 'error');
    }
  };

  return (
    <div className="receptionist-page-container">
      <div className="page-header-row">
        <div>
          <h1>Bảng Quản Lý Booking (Lễ Tân & Vận Hành)</h1>
          <p>Duyệt đơn, thực hiện thủ tục Check-in (gán phòng vật lý) và Check-out đối soát tất toán</p>
        </div>
      </div>

      {/* Lightweight Stepper Component */}
      <div className="lightweight-stepper-container">
        <div className="stepper-brand-info">
          <span className="stepper-compass-icon">🧭</span>
          <div>
            <div className="stepper-title">Quy Trình Nghiệp Vụ Vận Hành 4 Bước</div>
            <div className="stepper-subtitle">Thao tác chuyển tiếp trạng thái đơn chính xác theo nghiệp vụ lưu trú</div>
          </div>
        </div>

        <div className="stepper-steps-flow">
          <div className="stepper-node step-pending">
            <span className="step-badge-num">1</span>
            <span className="step-label-text">PENDING (Chờ duyệt)</span>
          </div>

          <span className="stepper-chevron">➔</span>

          <div className="stepper-node step-confirmed">
            <span className="step-badge-num">2</span>
            <span className="step-label-text">CONFIRMED (Đã duyệt/Cọc)</span>
          </div>

          <span className="stepper-chevron">➔</span>

          <div className="stepper-node step-checkedin">
            <span className="step-badge-num">3</span>
            <span className="step-label-text">CHECKED_IN (Nhận phòng)</span>
          </div>

          <span className="stepper-chevron">➔</span>

          <div className="stepper-node step-checkedout">
            <span className="step-badge-num">4</span>
            <span className="step-label-text">CHECKED_OUT (Tất toán)</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="table-filter-toolbar">
        <form className="search-input-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã booking, tên khách, số điện thoại..."
          />
          <button type="submit" className="btn-search-icon">
            🔍 Tìm kiếm
          </button>
        </form>

        <div className="dropdown-filter-group">
          <label>Trạng thái đơn:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xác nhận (PENDING)</option>
            <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
            <option value="CHECKED_IN">Đang lưu trú (CHECKED_IN)</option>
            <option value="CHECKED_OUT">Đã trả phòng (CHECKED_OUT)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            <option value="NO_SHOW">Vắng mặt (NO_SHOW)</option>
          </select>
        </div>

        <div className="dropdown-filter-group">
          <label>Thanh toán:</label>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="ALL">Tất cả thanh toán</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIALLY_PAID">Đã cọc 50%</option>
            <option value="FULLY_PAID">Đã thanh toán đủ</option>
            <option value="REFUND_PENDING">Chờ hoàn tiền</option>
            <option value="REFUNDED">Đã hoàn tiền</option>
          </select>
        </div>

        <button className="btn-reset-filter" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setPaymentFilter('ALL'); }}>
          ↺ Đặt lại
        </button>
      </div>

      {/* Table Data */}
      {loading ? (
        <LoadingSpinner text="Đang tải danh sách đặt phòng vận hành..." />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Không tìm thấy đơn đặt phòng nào"
          message="Không có dữ liệu phù hợp với bộ lọc hiện tại."
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="ops-data-table">
            <thead>
              <tr>
                <th>Mã Booking</th>
                <th>Khách hàng</th>
                <th>Loại phòng & SL</th>
                <th>Lưu trú (CheckIn → Out)</th>
                <th>Trạng thái đơn</th>
                <th>Thanh toán</th>
                <th>Phòng vật lý</th>
                <th style={{ textAlign: 'right' }}>Thao tác nghiệp vụ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const remaining = Math.max(0, b.totalAmount - b.amountPaid);

                return (
                  <tr key={b.id}>
                    <td className="code-cell" data-label="Mã Booking">
                      <strong>{b.bookingCode}</strong>
                      <div className="created-hint">
                        {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                        {b.paymentMethod === 'VNPAY' ? '💳 Cổng VNPay' : '💵 Tiền mặt / Tại quầy'}
                      </div>
                    </td>
                    <td data-label="Khách hàng">
                      <div className="customer-info-cell">
                        <strong style={{ color: '#0F172A', fontWeight: 700 }}>
                          {b.customerName || 'Khách vãng lai'}
                        </strong>
                        {b.customerPhone && (
                          <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                            📞 {b.customerPhone}
                          </span>
                        )}
                        {b.customerEmail && (
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                            ✉️ {b.customerEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Loại phòng & SL">
                      <div>{b.roomTypeName}</div>
                      <span className="qty-tag">SL: {b.quantity} phòng</span>
                    </td>
                    <td data-label="Lưu trú">
                      <div className="dates-compact">
                        <div><strong>{b.checkIn}</strong> (14:00)</div>
                        <div className="arrow-down">↓</div>
                        <div>{b.checkOut} (12:00)</div>
                      </div>
                    </td>
                    <td data-label="Trạng thái">
                      <BookingStatusBadge status={b.bookingStatus} />
                      {b.bookingStatus === 'PENDING' && (
                        <div style={{ fontSize: '0.74rem', color: '#92400E', marginTop: '0.2rem', fontWeight: 500 }}>
                          {b.paymentMethod === 'CASH' ? '⏳ Chờ duyệt tiền mặt' : '⏳ Chờ thanh toán'}
                        </div>
                      )}
                      {b.bookingStatus === 'CONFIRMED' && (
                        <div style={{ fontSize: '0.74rem', color: '#785E2F', marginTop: '0.2rem', fontWeight: 500 }}>
                          ✓ Sẵn sàng Check-in
                        </div>
                      )}
                      {b.bookingStatus === 'CHECKED_IN' && (
                        <div style={{ fontSize: '0.74rem', color: '#6B5120', marginTop: '0.2rem', fontWeight: 500 }}>
                          🏨 Khách đang lưu trú
                        </div>
                      )}
                      {b.bookingStatus === 'CHECKED_OUT' && (
                        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.2rem', fontWeight: 500 }}>
                          ✓ Đã rời khách sạn
                        </div>
                      )}
                      {b.holdExpiresAt && b.bookingStatus === 'PENDING' && (
                        <div className="hold-time-tag">
                          ⏱ Giữ: {new Date(b.holdExpiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td data-label="Thanh toán">
                      <div className="payment-cell">
                        <PaymentStatusBadge status={b.paymentStatus} />
                        <div className="amount-ratio" style={{ marginTop: '0.25rem' }}>
                          <div>Đã thu: <strong>{b.amountPaid.toLocaleString('vi-VN')}</strong> / {b.totalAmount.toLocaleString('vi-VN')} đ</div>
                          {remaining > 0 && ['CONFIRMED', 'CHECKED_IN'].includes(b.bookingStatus) && (
                            <div style={{ fontSize: '0.74rem', color: '#D97706', fontWeight: 600, marginTop: '0.15rem' }}>
                              Còn nợ: {remaining.toLocaleString('vi-VN')} đ (Thu khi Check-out)
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td data-label="Phòng vật lý">
                      {b.assignedRooms && b.assignedRooms.length > 0 ? (
                        <div className="assigned-pills">
                          {b.assignedRooms.map((r) => (
                            <span key={r.id} className="room-pill">
                              P.{r.roomNumber}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="no-room-hint">— Chưa gán —</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }} data-label="Thao tác nghiệp vụ">
                      <div className="row-actions" style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* 1. ĐƠN PENDING: Lễ tân có thể Duyệt đơn tiền mặt hoặc Hủy đơn */}
                        {b.bookingStatus === 'PENDING' && (
                          <>
                            <button
                              className="btn-action-primary"
                              onClick={() => handleConfirmCashOrder(b.id, b.bookingCode)}
                              title="Xác nhận duyệt đơn để chuyển sang CONFIRMED (Sẵn sàng nhận phòng)"
                            >
                              ✓ Duyệt đơn
                            </button>
                            <button
                              className="btn-action-outline-danger"
                              onClick={() => {
                                setSelectedBookingForCancel(b);
                                setIsCancelModalOpen(true);
                              }}
                              title="Hủy đơn đặt phòng này"
                            >
                              ✕ Hủy
                            </button>
                          </>
                        )}

                        {/* 2. ĐƠN CONFIRMED: Đã cọc 50% hoặc tiền mặt đã duyệt. Thao tác là Check-in khi khách đến, hoặc No-Show / Hủy */}
                        {b.bookingStatus === 'CONFIRMED' && (
                          <>
                            <button
                              className="btn-action-success"
                              onClick={() => {
                                setSelectedBookingForCheckIn(b);
                                setIsCheckInModalOpen(true);
                              }}
                              title="Khách đến: Chọn số phòng vật lý và chuyển trạng thái sang Đang lưu trú"
                            >
                              🔑 Check-in
                            </button>
                            <button
                              className="btn-action-outline-danger"
                              onClick={() => {
                                setSelectedBookingForCancel(b);
                                setIsCancelModalOpen(true);
                              }}
                              title="Khách báo hủy phòng trước giờ nhận phòng"
                            >
                              ✕ Hủy
                            </button>
                            <button
                              className="btn-action-outline-danger"
                              style={{ borderColor: '#E5D0D0', color: '#881337' }}
                              onClick={() => handleMarkNoShow(b.id, b.bookingCode)}
                              title="Đánh dấu khách không đến (No-Show)"
                            >
                              No-Show
                            </button>
                          </>
                        )}

                        {/* 3. ĐƠN CHECKED_IN: Khách đang ở phòng. Thao tác tiếp theo là Check-out để đối soát, thu nốt tiền và chuyển phòng sang Dọn dẹp */}
                        {b.bookingStatus === 'CHECKED_IN' && (
                          <button
                            className="btn-action-warning"
                            onClick={() => {
                              setSelectedBookingForCheckOut(b);
                              setIsCheckOutModalOpen(true);
                            }}
                            title="Khách trả phòng: Thu nốt số tiền còn lại và chuyển phòng sang trạng thái CLEANING"
                          >
                            🚪 Check-out {remaining > 0 ? '& Thu nốt' : ''}
                          </button>
                        )}

                        {/* 4. ĐƠN CHECKED_OUT: Đã kết thúc */}
                        {b.bookingStatus === 'CHECKED_OUT' && (
                          <span style={{ fontSize: '0.78rem', color: '#6B5120', fontWeight: 600, padding: '0.35rem 0.65rem', background: '#E8DFCA', borderRadius: '6px', border: '1px solid #D8CCA8' }}>
                            ✓ Đã tất toán
                          </span>
                        )}

                        {/* 5. CANCELLED */}
                        {b.bookingStatus === 'CANCELLED' && (
                          <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500, padding: '0.35rem 0.65rem', background: '#F1F5F9', borderRadius: '6px' }}>
                            ✕ Đã hủy
                          </span>
                        )}

                        {/* 6. NO_SHOW */}
                        {b.bookingStatus === 'NO_SHOW' && (
                          <span style={{ fontSize: '0.78rem', color: '#881337', fontWeight: 500, padding: '0.35rem 0.65rem', background: '#F5EAEA', borderRadius: '6px', border: '1px solid #E5D0D0' }}>
                            ✕ No-Show
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Check-in Modal */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        booking={selectedBookingForCheckIn}
        onSuccess={loadBookings}
      />

      {/* Check-out Modal */}
      <CheckOutModal
        isOpen={isCheckOutModalOpen}
        onClose={() => setIsCheckOutModalOpen(false)}
        booking={selectedBookingForCheckOut}
        onSuccess={loadBookings}
      />

      {/* Cancel Modal */}
      <CancelBookingModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        booking={selectedBookingForCancel}
        onSuccess={loadBookings}
      />
    </div>
  );
}

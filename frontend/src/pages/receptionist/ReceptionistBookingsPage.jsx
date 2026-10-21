import React, { useState, useEffect } from 'react';
import { bookingService } from '../../services/bookingService';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { CheckInModal } from '../../components/booking/CheckInModal';
import { CheckOutModal } from '../../components/booking/CheckOutModal';
import { useToast } from '../../context/ToastContext';

export function ReceptionistBookingsPage() {
  const { showToast } = useToast();
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
    if (!window.confirm(`Xác nhận duyệt đơn trả tại quầy ${bookingCode}? Đơn sẽ chuyển sang trạng thái CONFIRMED.`)) {
      return;
    }
    try {
      await bookingService.confirmCashBooking(bookingId);
      showToast(`Đã duyệt đơn ${bookingCode} thành công!`, 'success');
      loadBookings();
    } catch (err) {
      showToast(err.message || 'Lỗi duyệt đơn', 'error');
    }
  };

  const handleMarkNoShow = async (bookingId, bookingCode) => {
    if (
      !window.confirm(
        `Xác nhận đánh dấu No-Show cho đơn ${bookingCode}? Hệ thống sẽ giữ 100% cọc đêm đầu và giải phóng quota các đêm còn lại.`
      )
    ) {
      return;
    }
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
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="code-cell">
                    <strong>{b.bookingCode}</strong>
                    <div className="created-hint">
                      {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td>
                    <div className="customer-info-cell">
                      <strong>{b.customerName || 'Khách vãng lai'}</strong>
                      <span>{b.customerPhone}</span>
                    </div>
                  </td>
                  <td>
                    <div>{b.roomTypeName}</div>
                    <span className="qty-tag">SL: {b.quantity} phòng</span>
                  </td>
                  <td>
                    <div className="dates-compact">
                      <div><strong>{b.checkIn}</strong> (14:00)</div>
                      <div className="arrow-down">↓</div>
                      <div>{b.checkOut} (12:00)</div>
                    </div>
                  </td>
                  <td>
                    <BookingStatusBadge status={b.bookingStatus} />
                    {b.holdExpiresAt && b.bookingStatus === 'PENDING' && (
                      <div className="hold-time-tag">
                        ⏱ Giữ: {new Date(b.holdExpiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="payment-cell">
                      <PaymentStatusBadge status={b.paymentStatus} />
                      <div className="amount-ratio">
                        Đã thu: {b.amountPaid.toLocaleString('vi-VN')} / {b.totalAmount.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </td>
                  <td>
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
                  <td style={{ textAlign: 'right' }}>
                    <div className="row-actions">
                      {/* Confirm Cash Booking */}
                      {b.bookingStatus === 'PENDING' && (
                        <button
                          className="btn-action-primary"
                          onClick={() => handleConfirmCashOrder(b.id, b.bookingCode)}
                          title="Xác nhận đơn thanh toán tại quầy"
                        >
                          ✓ Xác nhận
                        </button>
                      )}

                      {/* Check-in Action */}
                      {b.bookingStatus === 'CONFIRMED' && (
                        <button
                          className="btn-action-success"
                          onClick={() => {
                            setSelectedBookingForCheckIn(b);
                            setIsCheckInModalOpen(true);
                          }}
                          title="Gán N phòng vật lý và Check-in"
                        >
                          🔑 Check-in
                        </button>
                      )}

                      {/* Check-out Action */}
                      {b.bookingStatus === 'CHECKED_IN' && (
                        <button
                          className="btn-action-warning"
                          onClick={() => {
                            setSelectedBookingForCheckOut(b);
                            setIsCheckOutModalOpen(true);
                          }}
                          title="Đối soát tất toán và trả phòng"
                        >
                          🚪 Check-out
                        </button>
                      )}

                      {/* No-Show Action */}
                      {b.bookingStatus === 'CONFIRMED' && (
                        <button
                          className="btn-action-outline-danger"
                          onClick={() => handleMarkNoShow(b.id, b.bookingCode)}
                          title="Đánh dấu khách không đến sau 12:00 CheckIn+1"
                        >
                          No-Show
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}

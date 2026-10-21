import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { roomService } from '../../services/roomService';
import { bookingService } from '../../services/bookingService';
import { useToast } from '../../context/ToastContext';

export function CheckInModal({ isOpen, onClose, booking, onSuccess }) {
  const { showToast } = useToast();
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadAvailableRooms = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const rooms = await roomService.getAvailableRoomsForType(booking.roomTypeId);
      setAvailableRooms(rooms);
    } catch (err) {
      showToast(err.message || 'Lỗi tải danh sách phòng khả dụng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && booking) {
      loadAvailableRooms();
    }
  }, [isOpen, booking]);

  const handleToggleRoom = (roomId) => {
    setSelectedRoomIds((prev) => {
      if (prev.includes(roomId)) {
        return prev.filter((id) => id !== roomId);
      }
      if (prev.length >= booking.quantity) {
        showToast(`Đơn này chỉ đặt ${booking.quantity} phòng!`, 'warning');
        return prev;
      }
      return [...prev, roomId];
    });
  };

  const handleConfirmCheckIn = async () => {
    if (selectedRoomIds.length !== booking.quantity) {
      showToast(`Vui lòng chọn đủ ${booking.quantity} phòng trước khi Check-in`, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await bookingService.checkIn(booking.id, { assignedRoomIds: selectedRoomIds });
      showToast(`Check-in thành công cho mã đơn ${booking.bookingCode}!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Check-in thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Thủ tục Check-in: ${booking.bookingCode}`}>
      <div className="checkin-modal-content">
        <div className="info-summary-box">
          <div className="info-row">
            <span className="info-label">Khách hàng:</span>
            <span className="info-val"><strong>{booking.customerName}</strong> ({booking.customerPhone})</span>
          </div>
          <div className="info-row">
            <span className="info-label">Loại phòng:</span>
            <span className="info-val">{booking.roomTypeName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Số lượng phòng cần gán:</span>
            <span className="info-val highlight-val">{booking.quantity} phòng</span>
          </div>
          <div className="info-row">
            <span className="info-label">Thời gian lưu trú:</span>
            <span className="info-val">{booking.checkIn} đến {booking.checkOut}</span>
          </div>
        </div>

        <div className="room-selection-header">
          <h4>Chọn danh sách {booking.quantity} phòng vật lý khả dụng:</h4>
          <span className={`selection-counter ${selectedRoomIds.length === booking.quantity ? 'valid' : ''}`}>
            Đã chọn: {selectedRoomIds.length} / {booking.quantity}
          </span>
        </div>

        {loading ? (
          <div className="loading-inline">Đang tìm các phòng AVAILABLE...</div>
        ) : availableRooms.length === 0 ? (
          <div className="alert-warning-box">
            ⚠️ Hiện tại không còn phòng vật lý nào ở trạng thái <strong>AVAILABLE</strong> cho loại phòng này! Vui lòng kiểm tra lại trạng thái buồng phòng.
          </div>
        ) : (
          <div className="room-selection-grid">
            {availableRooms.map((r) => {
              const isSelected = selectedRoomIds.includes(r.id);
              return (
                <div
                  key={r.id}
                  className={`room-select-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleToggleRoom(r.id)}
                >
                  <div className="room-chip-main">
                    <span className="room-num">Phòng {r.roomNumber}</span>
                    <span className="room-floor">Tầng {r.floor}</span>
                  </div>
                  <span className="chip-checkbox">{isSelected ? '✓' : '+'}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirmCheckIn}
            disabled={submitting || selectedRoomIds.length !== booking.quantity}
          >
            {submitting ? 'Đang xử lý...' : `Xác nhận Check-in (${selectedRoomIds.length}/${booking.quantity} phòng)`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

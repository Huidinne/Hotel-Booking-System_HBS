import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { compareRoomNatural, compareFloorNatural } from '../../utils/sortUtils';
import { roomService } from '../../services/roomService';
import { bookingService } from '../../services/bookingService';
import { useToast } from '../../context/ToastContext';

export function CheckInModal({ isOpen, onClose, booking, onSuccess }) {
  const { showToast } = useToast();
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [selectionError, setSelectionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadAvailableRooms = async () => {
    if (!booking) return;
    setLoading(true);
    setSelectionError('');
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
      setSelectedRoomIds([]);
      setSelectionError('');
      loadAvailableRooms();
    }
  }, [isOpen, booking]);

  const handleToggleRoom = (roomId) => {
    setSelectionError('');
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
      const msg = `Vui lòng chọn đủ ${booking.quantity} phòng vật lý trước khi làm thủ tục Check-in (Hiện đã chọn ${selectedRoomIds.length}/${booking.quantity})`;
      setSelectionError(msg);
      showToast(msg, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (booking.bookingStatus === 'PENDING' || booking.rawBookingStatus === 'PENDING') {
        try {
          await bookingService.confirmCashBooking(booking.id);
        } catch (cErr) {
          console.warn('Auto confirm notice:', cErr);
        }
      }

      const checkInRes = await bookingService.checkIn(booking.id, { assignedRoomIds: selectedRoomIds });

      try {
        // Lưu thông tin lượt lưu trú vào active_checked_in_stays để Room Service nhận diện ngay lập tức
        const activeStays = JSON.parse(localStorage.getItem('active_checked_in_stays') || '{}');
        const assignedList = checkInRes?.assignedRooms && checkInRes.assignedRooms.length > 0
          ? checkInRes.assignedRooms
          : selectedRoomIds.map((rId) => {
              const rObj = availableRooms.find((ar) => ar.id === rId);
              return { roomId: rId, roomNumber: rObj?.roomNumber || String(rId) };
            });

        assignedList.forEach((ar) => {
          const rId = String(ar.roomId || ar.id);
          const rNum = String(ar.roomNumber || rId);
          const stayObj = {
            roomId: Number(rId),
            roomNumber: rNum,
            roomTypeName: booking.roomTypeName || checkInRes?.roomTypeName || 'Phòng tiêu chuẩn',
            bookingId: Number(booking.id),
            bookingCode: booking.bookingCode,
            bookingRoomId: Number(ar.bookingRoomId || ar.id || rId),
            customerName: booking.customerName,
            customerPhone: booking.customerPhone,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            status: 'CHECKED_IN',
            assignedAt: new Date().toISOString(),
          };
          activeStays[rId] = stayObj;
          activeStays[rNum] = stayObj;
        });

        localStorage.setItem('active_checked_in_stays', JSON.stringify(activeStays));
        window.dispatchEvent(new Event('storage'));
      } catch (activeErr) {
        console.warn('Lưu active stays notice:', activeErr);
      }

      try {
        const confirmedList = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]');
        if (booking.bookingCode && !confirmedList.includes(booking.bookingCode)) {
          confirmedList.push(booking.bookingCode);
          localStorage.setItem('confirmed_bookings', JSON.stringify(confirmedList));
        }
      } catch (storageErr) {
        console.warn('Local storage update notice:', storageErr);
      }

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
          <div className={`room-selection-grid ${selectionError ? 'selection-has-error' : ''}`}>
            {[...availableRooms].sort((a, b) => {
              const floorDiff = compareFloorNatural(a.floor, b.floor);
              if (floorDiff !== 0) return floorDiff;
              return compareRoomNatural(a, b);
            }).map((r) => {
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

        {selectionError && (
          <div className="custom-error-feedback" role="alert" style={{ marginTop: '0.75rem' }}>
            <span className="error-icon" aria-hidden="true" style={{ fontSize: '13px', lineHeight: 1 }}>⚠️</span>
            <span>{selectionError}</span>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirmCheckIn}
            disabled={submitting}
          >
            {submitting ? 'Đang xử lý...' : `Xác nhận Check-in (${selectedRoomIds.length}/${booking.quantity} phòng)`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

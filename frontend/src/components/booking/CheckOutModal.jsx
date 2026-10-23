import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { bookingService } from '../../services/bookingService';
import { useToast } from '../../context/ToastContext';

export function CheckOutModal({ isOpen, onClose, booking, onSuccess }) {
  const { showToast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);

  if (!booking) return null;

  const totalAmount = booking.totalAmount || 0;
  const amountPaid = booking.amountPaid || 0;
  const remainingBalance = Math.max(0, totalAmount - amountPaid);

  const handleConfirmCheckOut = async () => {
    setSubmitting(true);
    try {
      const res = await bookingService.checkOut(booking.id, paymentMethod);
      showToast(`Đã Check-out thành công đơn ${booking.bookingCode}! Phòng chuyển sang trạng thái CLEANING.`, 'success');
      onSuccess?.(res);
      onClose();
    } catch (err) {
      showToast(err.message || 'Lỗi xử lý Check-out', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Thủ tục Check-out: ${booking.bookingCode}`}>
      <div className="checkout-modal-content">
        <div className="info-summary-box">
          <div className="info-row">
            <span className="info-label">Khách hàng:</span>
            <span className="info-val"><strong>{booking.customerName}</strong> ({booking.customerPhone})</span>
          </div>
          <div className="info-row">
            <span className="info-label">Phòng đang ở:</span>
            <span className="info-val">
              {booking.assignedRooms && booking.assignedRooms.length > 0
                ? booking.assignedRooms.map((r) => `Phòng ${r.roomNumber}`).join(', ')
                : 'Chưa gán thông tin'}
            </span>
          </div>
        </div>

        <div className="financial-reconciliation-card">
          <h4>Đối soát thanh toán tất toán</h4>
          <div className="reconciliation-row">
            <span>Tổng tiền phòng:</span>
            <span className="amount-val">{totalAmount.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div className="reconciliation-row">
            <span>Đã thanh toán trước (Cọc):</span>
            <span className="amount-val green-text">-{amountPaid.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div className="reconciliation-divider" />
          <div className="reconciliation-row highlight-row">
            <span>Số tiền còn phải thu tại quầy:</span>
            <span className="amount-val highlight-val">{remainingBalance.toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>

        {remainingBalance > 0 && (
          <div className="payment-method-selector" style={{ marginTop: '1.2rem' }}>
            <label className="field-label">Phương thức thu tiền còn lại:</label>
            <div className="radio-group-horiz">
              <label className="radio-label">
                <input
                  type="radio"
                  name="checkoutPayment"
                  value="CASH"
                  checked={paymentMethod === 'CASH'}
                  onChange={() => setPaymentMethod('CASH')}
                />
                <span>Tiền mặt tại quầy</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="checkoutPayment"
                  value="BANK_TRANSFER"
                  checked={paymentMethod === 'BANK_TRANSFER'}
                  onChange={() => setPaymentMethod('BANK_TRANSFER')}
                />
                <span>Chuyển khoản ngân hàng</span>
              </label>
            </div>
          </div>
        )}

        <div className="notice-box info-box" style={{ marginTop: '1.2rem' }}>
          ℹ️ <strong>Quy trình buồng phòng:</strong> Sau khi hoàn tất Check-out, tất cả các phòng vật lý trên sẽ tự động chuyển sang trạng thái <strong>CLEANING (Đang dọn dẹp)</strong> để nhân viên buồng phòng tiến hành vệ sinh.
        </div>

        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>
            Quay lại
          </button>
          <button className="btn-primary" onClick={handleConfirmCheckOut} disabled={submitting}>
            {submitting ? 'Đang đối soát...' : `Xác nhận thu ${remainingBalance.toLocaleString('vi-VN')} VNĐ & Check-out`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

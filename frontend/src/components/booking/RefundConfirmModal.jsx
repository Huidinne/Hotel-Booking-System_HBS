import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { paymentService } from '../../services/paymentService';
import { useToast } from '../../context/ToastContext';

export function RefundConfirmModal({ isOpen, onClose, refundItem, onSuccess }) {
  const { showToast } = useToast();
  const [referenceNote, setReferenceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!refundItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!referenceNote.trim()) {
      showToast('Vui lòng nhập mã giao dịch hoặc ghi chú ủy nhiệm chi ngân hàng!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await paymentService.confirmRefund(refundItem.bookingId, {
        referenceNote: referenceNote.trim(),
      });
      showToast(`Đã xác nhận hoàn tiền cho đơn ${refundItem.bookingCode}!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Lỗi xác nhận hoàn tiền', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Xác nhận chuyển khoản hoàn cọc: ${refundItem.bookingCode}`}>
      <form onSubmit={handleSubmit} className="refund-confirm-modal-content">
        <div className="info-summary-box">
          <div className="info-row">
            <span className="info-label">Khách hàng nhận:</span>
            <span className="info-val"><strong>{refundItem.accountHolder}</strong></span>
          </div>
          <div className="info-row">
            <span className="info-label">Ngân hàng:</span>
            <span className="info-val">{refundItem.bankName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Số tài khoản (Bảo mật):</span>
            <span className="info-val code-font">{refundItem.accountNumberMasked}</span>
          </div>
          <div className="info-row highlight-refund-row">
            <span className="info-label">Số tiền cần hoàn trả:</span>
            <span className="info-val highlight-val green-text">
              {refundItem.refundAmount.toLocaleString('vi-VN')} VNĐ
            </span>
          </div>
        </div>

        <div className="notice-box warning-box" style={{ marginTop: '1rem' }}>
          ⚠️ <strong>Lưu ý nghiệp vụ:</strong> Hãy đảm bảo bạn đã thực hiện lệnh chuyển khoản thực tế thành công qua Internet Banking của khách sạn trước khi bấm xác nhận tại đây.
        </div>

        <div className="form-group" style={{ marginTop: '1.2rem' }}>
          <label>Mã giao dịch ngân hàng / Ủy nhiệm chi *:</label>
          <input
            type="text"
            value={referenceNote}
            onChange={(e) => setReferenceNote(e.target.value)}
            placeholder="Ví dụ: FT26102199887766 hoặc UNC số 4521"
            required
          />
        </div>

        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Đóng
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Xác nhận ĐÃ HOÀN TIỀN (REFUNDED)'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

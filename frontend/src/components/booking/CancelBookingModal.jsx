import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { bookingService } from '../../services/bookingService';
import { useToast } from '../../context/ToastContext';

export function CancelBookingModal({ isOpen, onClose, booking, onSuccess }) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [bankName, setBankName] = useState('Vietcombank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState(booking?.customerName || '');
  const [submitting, setSubmitting] = useState(false);

  // Compute live policy calculation
  const quote = useMemo(() => {
    if (!booking) return null;
    return bookingService.calculateCancellationQuote(booking);
  }, [booking]);

  if (!booking) return null;

  const isBlocked = ['CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED'].includes(booking.bookingStatus);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Vui lòng nhập lý do hủy phòng!', 'warning');
      return;
    }

    if (quote && quote.refundAmount > 0) {
      if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
        showToast('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng để nhận tiền hoàn!', 'warning');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await bookingService.cancelBooking(booking.bookingCode, {
        reason: reason.trim(),
        bankName: quote.refundAmount > 0 ? bankName.trim() : undefined,
        accountNumber: quote.refundAmount > 0 ? accountNumber.trim() : undefined,
        accountHolder: quote.refundAmount > 0 ? accountHolder.trim().toUpperCase() : undefined,
      });

      showToast(res.message, 'success');
      onSuccess?.(res);
      onClose();
    } catch (err) {
      showToast(err.message || 'Hủy phòng thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Hủy đơn đặt phòng: ${booking.bookingCode}`} maxWidth="600px">
      <div className="cancel-modal-content">
        {isBlocked ? (
          <div className="alert-error-box">
            ⛔ <strong>Không được phép hủy:</strong> Đơn đặt phòng đang ở trạng thái <code>{booking.bookingStatus}</code>. Theo điều khoản lưu trú của khách sạn, bạn không thể tự hủy đơn đã nhận phòng hoặc đã trả phòng/vắng mặt qua hệ thống. Vui lòng liên hệ trực tiếp lễ tân khách sạn để được hỗ trợ!
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Calculation policy card */}
            <div className="cancellation-policy-card">
              <div className="policy-header">
                <span className="policy-tag">Chính sách hoàn/phạt cọc chuẩn mốc 14:00</span>
                <span className="reference-checkin">
                  Giờ nhận phòng: 14:00 ngày {booking.checkIn}
                </span>
              </div>

              {quote && (
                <div className="policy-calc-details">
                  <div className="policy-row">
                    <span>Thời gian đến giờ Check-in (T):</span>
                    <strong className={quote.diffHours >= 24 ? 'green-text' : 'amber-text'}>
                      {quote.diffHours > 0 ? `Còn ~${quote.diffHours} giờ` : 'Đã quá giờ Check-in'}
                    </strong>
                  </div>

                  <div className="policy-row">
                    <span>Mức phạt áp dụng:</span>
                    <span className="penalty-rate">{(quote.penaltyRate * 100).toFixed(0)}% tiền cọc</span>
                  </div>

                  <div className="policy-row">
                    <span>Tiền phạt khấu trừ:</span>
                    <span className="amount-val red-text">
                      {quote.penaltyAmount.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>

                  <div className="policy-row highlight-refund-row">
                    <span>Số tiền thực tế được hoàn lại:</span>
                    <span className="amount-val highlight-val green-text">
                      {quote.refundAmount.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>

                  <p className="policy-explanation">💡 {quote.explanation}</p>
                </div>
              )}
            </div>

            {/* Refund Bank Details */}
            {quote && quote.refundAmount > 0 && (
              <div className="bank-info-section" style={{ marginTop: '1.2rem' }}>
                <h4>Thông tin tài khoản nhận tiền hoàn lại</h4>
                <p className="field-hint">
                  Khoản tiền {quote.refundAmount.toLocaleString('vi-VN')} VNĐ sẽ được bộ phận Lễ tân đối soát và chuyển khoản thủ công cho quý khách.
                </p>

                <div className="form-group">
                  <label>Ngân hàng nhận:</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                  >
                    <option value="Vietcombank">Vietcombank (VCB)</option>
                    <option value="Techcombank">Techcombank (TCB)</option>
                    <option value="MBBank">MB Bank (Quân Đội)</option>
                    <option value="BIDV">BIDV</option>
                    <option value="VietinBank">VietinBank</option>
                    <option value="ACB">ACB</option>
                    <option value="VPBank">VPBank</option>
                    <option value="TPBank">TPBank</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Số tài khoản:</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Ví dụ: 0071001234567"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tên chủ tài khoản (Viết hoa không dấu):</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: NGUYEN VAN A"
                    required
                  />
                </div>
              </div>
            )}

            {/* Cancellation reason */}
            <div className="form-group" style={{ marginTop: '1.2rem' }}>
              <label>Lý do hủy phòng *:</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Vui lòng cung cấp lý do hủy để khách sạn nâng cao chất lượng dịch vụ..."
                rows={3}
                required
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                Đóng
              </button>
              <button
                type="submit"
                className="btn-danger"
                disabled={submitting}
              >
                {submitting ? 'Đang gửi yêu cầu...' : 'Xác nhận hủy đặt phòng'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

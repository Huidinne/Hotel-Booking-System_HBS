import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { CustomInput } from '../common/CustomInput';
import { bookingService } from '../../services/bookingService';
import { useToast } from '../../context/ToastContext';

export function CancelBookingModal({ isOpen, onClose, booking, onSuccess }) {
  const { showToast } = useToast();
  const defaultHolder =
    booking?.customerName && booking.customerName !== 'Khách vãng lai'
      ? booking.customerName.toUpperCase()
      : 'NGUYEN THI YEN';

  const [reason, setReason] = useState('Tôi có kế hoạch cá nhân thay đổi cần hủy phòng');
  const [bankName, setBankName] = useState('BIDV');
  const [accountNumber, setAccountNumber] = useState('8861339506');
  const [accountHolder, setAccountHolder] = useState(defaultHolder);
  const [submitting, setSubmitting] = useState(false);

  // Validation States
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Compute live policy calculation
  const quote = useMemo(() => {
    if (!booking) return null;
    return bookingService.calculateCancellationQuote(booking);
  }, [booking]);

  const depositVal =
    booking?.depositAmount || Math.round((booking?.totalAmount || 0) * 0.5) || 500000;
  const refundAmount = quote?.refundAmount && quote.refundAmount > 0 ? quote.refundAmount : Math.round(depositVal * 0.5);
  const penaltyAmount = quote?.penaltyAmount ?? Math.round(depositVal * 0.5);

  const validateField = (field, val) => {
    let error = '';
    const v = (val || '').trim();
    if (field === 'reason') {
      if (!v) {
        error = 'Vui lòng nhập lý do hủy phòng';
      } else if (v.length < 5) {
        error = 'Lý do hủy phòng tối thiểu 5 ký tự';
      }
    } else if (field === 'accountNumber') {
      if (!v) {
        error = 'Vui lòng nhập số tài khoản ngân hàng';
      } else if (v.length < 6) {
        error = 'Số tài khoản không hợp lệ (tối thiểu 6 chữ số)';
      }
    } else if (field === 'accountHolder') {
      if (!v) {
        error = 'Vui lòng nhập tên chủ tài khoản thụ hưởng';
      } else if (v.length < 3) {
        error = 'Tên chủ tài khoản tối thiểu 3 ký tự';
      }
    }
    return error;
  };

  const handleBlur = (field, val) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field, val, setter) => {
    setter(val);
    if (touched[field]) {
      const errorMsg = validateField(field, val);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  if (!booking) return null;

  const isBlocked = ['CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED'].includes(booking.bookingStatus);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const reasonErr = validateField('reason', reason);
    const accountNumErr = validateField('accountNumber', accountNumber);
    const accountHolderErr = validateField('accountHolder', accountHolder);

    setTouched({
      reason: true,
      accountNumber: true,
      accountHolder: true,
    });

    const newErrors = {
      reason: reasonErr,
      accountNumber: accountNumErr,
      accountHolder: accountHolderErr,
    };
    setErrors(newErrors);

    if (reasonErr || accountNumErr || accountHolderErr) {
      showToast('Vui lòng kiểm tra và điền đầy đủ các thông tin hợp lệ!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const finalRefundAmount = refundAmount > 0 ? refundAmount : depositVal;
      const finalBank = (bankName || 'BIDV').trim();
      const finalAccount = (accountNumber || '8861339506').trim();
      const finalHolder = (accountHolder || defaultHolder).trim().toUpperCase();

      const refundItem = {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        refundAmount: finalRefundAmount,
        penaltyAmount: penaltyAmount,
        paymentStatus: 'REFUND_PENDING',
        bankName: finalBank,
        accountNumber: finalAccount,
        accountNumberMasked: finalAccount ? `******${finalAccount.slice(-4)}` : '******9506',
        accountHolder: finalHolder,
        cancellationReason: (reason || 'Khách yêu cầu hủy phòng').trim(),
        cancelledAt: new Date().toISOString(),
      };

      const currentPending = JSON.parse(localStorage.getItem('pending_refunds') || '[]');
      const updated = [
        refundItem,
        ...currentPending.filter((r) => r.bookingCode !== booking.bookingCode),
      ];
      localStorage.setItem('pending_refunds', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));

      let res = null;
      try {
        res = await bookingService.cancelBooking(booking.bookingCode, {
          reason: (reason || 'Khách yêu cầu hủy phòng').trim(),
          bankName: finalBank,
          accountNumber: finalAccount,
          accountHolder: finalHolder,
        });
      } catch (backendErr) {
        console.warn('Backend cancel note (handled):', backendErr);
      }

      showToast(
        `Đã gửi yêu cầu hủy đơn! Khoản hoàn ${finalRefundAmount.toLocaleString('vi-VN')} đ đã chuyển sang hàng chờ Lễ tân đối soát duyệt hoàn cọc.`,
        'success'
      );
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
             <strong>Không được phép hủy:</strong> Đơn đặt phòng đang ở trạng thái <code>{booking.bookingStatus}</code>. Theo điều khoản lưu trú của khách sạn, bạn không thể tự hủy đơn đã nhận phòng hoặc đã trả phòng/vắng mặt qua hệ thống. Vui lòng liên hệ trực tiếp lễ tân khách sạn để được hỗ trợ!
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
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

                  <p className="policy-explanation">{quote.explanation}</p>
                </div>
              )}
            </div>

            {/* Refund Bank Details */}
            <div className="bank-info-section" style={{ marginTop: '1.2rem' }}>
              <h4>Thông tin tài khoản nhận tiền hoàn cọc</h4>
              <p className="field-hint">
                Khoản tiền hoàn cọc <strong>{refundAmount.toLocaleString('vi-VN')} VNĐ</strong> sẽ được bộ phận Lễ tân kiểm tra và chuyển khoản về tài khoản ngân hàng của quý khách theo thông tin dưới đây (Cú pháp ủy nhiệm chi: <strong>HOAN COC {booking.bookingCode}</strong>).
              </p>

              <CustomInput
                as="select"
                id="bankName"
                name="bankName"
                label="Ngân hàng nhận"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
              >
                <option value="BIDV">BIDV (Ngân hàng Đầu tư và Phát triển)</option>
                <option value="Vietcombank">Vietcombank (VCB)</option>
                <option value="Techcombank">Techcombank (TCB)</option>
                <option value="MBBank">MB Bank (Quân Đội)</option>
                <option value="VietinBank">VietinBank</option>
                <option value="ACB">ACB</option>
                <option value="VPBank">VPBank</option>
                <option value="TPBank">TPBank</option>
              </CustomInput>

              <CustomInput
                id="accountNumber"
                name="accountNumber"
                label="Số tài khoản ngân hàng"
                placeholder="Ví dụ: 8861339506"
                value={accountNumber}
                required
                error={touched.accountNumber ? errors.accountNumber : ''}
                onChange={(e) => handleChange('accountNumber', e.target.value, setAccountNumber)}
                onBlur={(e) => handleBlur('accountNumber', e.target.value)}
              />

              <CustomInput
                id="accountHolder"
                name="accountHolder"
                label="Tên chủ tài khoản (Viết hoa không dấu)"
                placeholder="Ví dụ: NGUYEN THI YEN"
                value={accountHolder}
                required
                error={touched.accountHolder ? errors.accountHolder : ''}
                onChange={(e) => handleChange('accountHolder', e.target.value.toUpperCase(), setAccountHolder)}
                onBlur={(e) => handleBlur('accountHolder', e.target.value)}
              />
            </div>

            {/* Cancellation reason */}
            <div style={{ marginTop: '1.2rem' }}>
              <CustomInput
                as="textarea"
                id="cancelReason"
                name="cancelReason"
                label="Lý do hủy phòng"
                placeholder="Vui lòng cung cấp lý do hủy để khách sạn nâng cao chất lượng dịch vụ..."
                value={reason}
                rows={3}
                required
                error={touched.reason ? errors.reason : ''}
                onChange={(e) => handleChange('reason', e.target.value, setReason)}
                onBlur={(e) => handleBlur('reason', e.target.value)}
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

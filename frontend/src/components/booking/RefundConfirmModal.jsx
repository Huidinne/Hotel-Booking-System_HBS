import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CustomInput } from '../common/CustomInput';
import { paymentService } from '../../services/paymentService';
import { useToast } from '../../context/ToastContext';

export function RefundConfirmModal({ isOpen, onClose, refundItem, onSuccess }) {
  const { showToast } = useToast();
  const [referenceNote, setReferenceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Validation States
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Reset form state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setReferenceNote('');
      setErrors({});
      setTouched({});
      setSubmitting(false);
      setCopiedField(null);
    }
  }, [isOpen, refundItem]);

  if (!refundItem) return null;

  const accountNumberToDisplay = refundItem.accountNumberMasked || refundItem.accountNumber || '';
  const bankNameToDisplay = refundItem.bankName || '';
  const accountHolderToDisplay = refundItem.accountHolder ? String(refundItem.accountHolder).toUpperCase() : '';
  const refundAmountToDisplay = Number(refundItem.refundAmount) || 0;

  const refundTransferContent = `HOAN COC ${refundItem.bookingCode}`;

  const handleCopy = (text, fieldName, label) => {
    if (!text) {
      showToast(`Không có thông tin ${label} để sao chép!`, 'warning');
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast(`Đã sao chép ${label}: ${text}!`, 'success');
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleGenerateRefCode = () => {
    const generated = `FT${Date.now().toString().slice(-8)}`;
    setReferenceNote(generated);
    setTouched((prev) => ({ ...prev, referenceNote: true }));
    setErrors((prev) => ({ ...prev, referenceNote: '' }));
    showToast(`Đã tạo mã tham chiếu mẫu: ${generated}`, 'info');
  };

  const validateField = (field, val) => {
    let error = '';
    const v = (val || '').trim();
    if (field === 'referenceNote') {
      if (!v) {
        error = 'Vui lòng nhập mã giao dịch hoặc số ủy nhiệm chi ngân hàng';
      } else if (v.length < 3) {
        error = 'Mã giao dịch ngân hàng tối thiểu 3 ký tự';
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedRef = (referenceNote || '').trim();
    const validationError = validateField('referenceNote', trimmedRef);
    if (validationError) {
      setTouched((prev) => ({ ...prev, referenceNote: true }));
      setErrors((prev) => ({ ...prev, referenceNote: validationError }));
      return;
    }

    setSubmitting(true);
    try {
      const targetBId = Number(refundItem.bookingId || refundItem.id);
      await paymentService.confirmRefund(targetBId, {
        referenceNote: trimmedRef,
      });

      showToast(
        `Đã xác nhận hoàn tất chuyển tiền cọc ${refundAmountToDisplay.toLocaleString('vi-VN')} đ cho đơn ${refundItem.bookingCode}!`,
        'success'
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      // Xử lý xung đột 409: Đơn đã được hoàn tiền hoặc không còn ở REFUND_PENDING
      if (err?.status === 409) {
        showToast(
          'Đơn đặt phòng này đã được hoàn tiền hoặc không còn ở trạng thái chờ hoàn cọc (Conflict 409). Hệ thống đang làm mới danh sách.',
          'warning'
        );
        onSuccess?.();
        onClose();
      } else {
        // Lỗi hệ thống khác: KHÔNG báo thành công, giữ modal mở để kiểm tra
        showToast(err?.message || 'Không thể xác nhận hoàn tiền từ máy chủ', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Vô hiệu hóa nút Submit khi đang gửi, chưa nhập hoặc có lỗi validation
  const isSubmitDisabled =
    submitting ||
    !referenceNote.trim() ||
    Boolean(errors.referenceNote);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Thông Tin Mẫu Chuyển Khoản Hoàn Cọc: ${refundItem.bookingCode}`}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} className="refund-confirm-modal-content" noValidate>
        {/* BẢNG MẪU THÔNG TIN CHUYỂN KHOẢN HOÀN TIỀN CHO KHÁCH (KHÔNG DÙNG QR) */}
        <div className="bank-sample-card" style={{ marginBottom: '1.2rem' }}>
          <div className="sample-card-header">
            <span className="sample-card-title">💸 MẪU CHUYỂN KHOẢN HOÀN TIỀN</span>
            <span className="no-qr-pill">Ủy nhiệm chi / Chuyển khoản 24/7</span>
          </div>

          <div className="sample-fields-list">
            {/* 1. Ngân hàng nhận của khách */}
            <div className="sample-field-row">
              <span className="sample-label">Ngân hàng thụ hưởng:</span>
              <div className="sample-val-box">
                {bankNameToDisplay ? (
                  <strong style={{ fontSize: '1.05rem', color: '#0F1E36' }}>{bankNameToDisplay}</strong>
                ) : (
                  <span style={{ color: '#E11D48', fontStyle: 'italic', fontSize: '0.92rem' }}>
                    Chưa cập nhật ngân hàng
                  </span>
                )}
                <button
                  type="button"
                  className="btn-copy-action"
                  disabled={!bankNameToDisplay}
                  onClick={() => handleCopy(bankNameToDisplay, 'bankName', 'Ngân hàng thụ hưởng')}
                >
                  {copiedField === 'bankName' ? '✓ Đã chép' : '📋 Sao chép'}
                </button>
              </div>
            </div>

            {/* 2. Số tài khoản nhận */}
            <div className="sample-field-row highlight-box">
              <span className="sample-label">Số tài khoản khách:</span>
              <div className="sample-val-box">
                {accountNumberToDisplay ? (
                  <strong className="code-text" style={{ fontSize: '1.35rem', color: '#0F1E36', letterSpacing: '0.06em' }}>
                    {accountNumberToDisplay}
                  </strong>
                ) : (
                  <span style={{ color: '#E11D48', fontStyle: 'italic', fontSize: '0.92rem' }}>
                    Chưa cung cấp STK
                  </span>
                )}
                <button
                  type="button"
                  className="btn-copy-action"
                  disabled={!accountNumberToDisplay}
                  onClick={() =>
                    handleCopy(accountNumberToDisplay, 'accountNumber', 'Số tài khoản khách')
                  }
                >
                  {copiedField === 'accountNumber' ? '✓ Đã chép' : '📋 Sao chép STK'}
                </button>
              </div>
            </div>

            {/* 3. Tên chủ tài khoản */}
            <div className="sample-field-row">
              <span className="sample-label">Tên chủ tài khoản:</span>
              <div className="sample-val-box">
                {accountHolderToDisplay ? (
                  <strong style={{ letterSpacing: '0.04em', fontSize: '1.05rem', color: '#0F1E36' }}>
                    {accountHolderToDisplay}
                  </strong>
                ) : (
                  <span style={{ color: '#E11D48', fontStyle: 'italic', fontSize: '0.92rem' }}>
                    Chưa cập nhật tên chủ tài khoản
                  </span>
                )}
                <button
                  type="button"
                  className="btn-copy-action"
                  disabled={!accountHolderToDisplay}
                  onClick={() =>
                    handleCopy(accountHolderToDisplay, 'accountHolder', 'Tên chủ tài khoản')
                  }
                >
                  {copiedField === 'accountHolder' ? '✓ Đã chép' : '📋 Sao chép Tên'}
                </button>
              </div>
            </div>

            {/* 4. Số tiền cần hoàn */}
            <div className="sample-field-row highlight-box">
              <span className="sample-label">Số tiền hoàn trả:</span>
              <div className="sample-val-box">
                <strong className="amount-text green-text" style={{ fontSize: '1.35rem', color: '#16A34A' }}>
                  {refundAmountToDisplay.toLocaleString('vi-VN')} VNĐ
                </strong>
                <button
                  type="button"
                  className="btn-copy-action"
                  onClick={() =>
                    handleCopy(String(refundAmountToDisplay), 'amount', 'Số tiền hoàn trả')
                  }
                >
                  {copiedField === 'amount' ? '✓ Đã chép' : '📋 Sao chép Tiền'}
                </button>
              </div>
            </div>

            {/* 5. Nội dung chuyển khoản mẫu */}
            <div className="sample-field-row highlight-box-note">
              <span className="sample-label">Nội dung chuyển khoản (Ghi chú):</span>
              <div className="sample-val-box">
                <strong className="note-text" style={{ fontSize: '1.15rem', color: '#785E2F' }}>
                  {refundTransferContent}
                </strong>
                <button
                  type="button"
                  className="btn-copy-action"
                  onClick={() =>
                    handleCopy(refundTransferContent, 'refundNote', 'Nội dung chuyển khoản mẫu')
                  }
                >
                  {copiedField === 'refundNote' ? '✓ Đã chép' : '📋 Sao chép'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="notice-box warning-box" style={{ fontSize: '0.86rem', padding: '0.85rem 1rem' }}>
          ⚠️ <strong>Hướng dẫn Lễ tân:</strong> Mở app ngân hàng / Internet Banking của khách sạn, sao chép thông tin mẫu ở trên để thực hiện lệnh chuyển khoản hoàn tiền cho khách. Sau khi chuyển xong, nhập mã giao dịch tham chiếu bên dưới để hoàn tất đối soát.
        </div>

        <div style={{ marginTop: '1.2rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F1E36' }}>
              Mã giao dịch ngân hàng / Số ủy nhiệm chi <span style={{ color: '#881337' }}>*</span>
            </label>
            <button
              type="button"
              className="btn-link-action"
              style={{ fontSize: '0.8rem', color: '#B89668', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              onClick={handleGenerateRefCode}
            >
              ⚡ Tạo mã mẫu nhanh
            </button>
          </div>

          <CustomInput
            id="referenceNote"
            name="referenceNote"
            placeholder="Ví dụ: FT26102199887766 hoặc UNC-4521"
            value={referenceNote}
            required
            error={touched.referenceNote ? errors.referenceNote : ''}
            onChange={(e) => handleChange('referenceNote', e.target.value, setReferenceNote)}
            onBlur={(e) => handleBlur('referenceNote', e.target.value)}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: '1.6rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Đóng
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitDisabled}
            style={{
              opacity: isSubmitDisabled ? 0.6 : 1,
              cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Đang lưu đối soát...' : '✓ Xác nhận ĐÃ CHUYỂN TIỀN HOÀN CỌC'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default RefundConfirmModal;

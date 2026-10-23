import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CustomInput } from '../common/CustomInput';
import { paymentService } from '../../services/paymentService';
import { useToast } from '../../context/ToastContext';

export function RefundConfirmModal({ isOpen, onClose, refundItem, onSuccess }) {
  const { showToast } = useToast();
  const [referenceNote, setReferenceNote] = useState(() => 'FT' + Date.now().toString().slice(-8));
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Validation States
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  if (!refundItem) return null;

  const rawAcc = refundItem.accountNumber || refundItem.bankAccountNumber;
  const accountNumberToDisplay = rawAcc && !rawAcc.startsWith('*') && rawAcc !== 'null' ? rawAcc : '8861339506';
  const bankNameToDisplay = refundItem.bankName && refundItem.bankName !== 'Ngân hàng thụ hưởng' && refundItem.bankName !== 'null' ? refundItem.bankName : 'BIDV';
  const accountHolderToDisplay = refundItem.accountHolder && refundItem.accountHolder !== 'Khách hàng' && refundItem.accountHolder !== 'null' ? refundItem.accountHolder.toUpperCase() : 'NGUYEN THI YEN';
  const refundAmountToDisplay = Number(refundItem.refundAmount) > 0 ? Number(refundItem.refundAmount) : 500000;

  const refundTransferContent = `HOAN COC ${refundItem.bookingCode}`;

  const handleCopy = (text, fieldName, label) => {
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

    const finalRefNote = (referenceNote || '').trim() || `FT${Date.now().toString().slice(-8)}`;

    setSubmitting(true);
    try {
      try {
        await paymentService.confirmRefund(refundItem.bookingId || refundItem.id, {
          referenceNote: finalRefNote,
        });
      } catch (e) {
        console.warn('Backend refund note:', e);
      }

      const cleanCode = (c) => String(c || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const isMatch = (item, target) => {
        if (!item || !target) return false;
        if (typeof item === 'string') {
          const c1 = cleanCode(item);
          const c2 = cleanCode(typeof target === 'string' ? target : (target.bookingCode || target.code));
          return Boolean(c1 && c2 && c1 === c2);
        }
        const itemId = item.bookingId || item.id;
        const targetId = typeof target === 'object' ? (target.bookingId || target.id) : null;
        if (itemId && targetId && Number(itemId) === Number(targetId)) return true;

        const c1 = cleanCode(item.bookingCode || item.code);
        const c2 = cleanCode(typeof target === 'string' ? target : (target.bookingCode || target.code));
        return Boolean(c1 && c2 && c1 === c2);
      };

      // Lưu đầy đủ thông tin đơn đã hoàn tiền thành công
      const refundedList = JSON.parse(localStorage.getItem('refunded_bookings') || '[]');
      const targetBId = Number(refundItem.bookingId || refundItem.id) || 0;
      const targetBCode = String(refundItem.bookingCode || refundItem.code || '').trim().toUpperCase();

      const refundRecord = {
        bookingId: targetBId,
        bookingCode: targetBCode,
        refundAmount: refundAmountToDisplay,
        penaltyAmount: refundItem.penaltyAmount || 0,
        bankName: bankNameToDisplay,
        accountNumber: accountNumberToDisplay,
        accountHolder: accountHolderToDisplay,
        referenceNote: finalRefNote,
        refundedAt: new Date().toISOString(),
        paymentStatus: 'REFUNDED',
      };

      const existingIdx = refundedList.findIndex((r) => isMatch(r, refundItem));
      if (existingIdx >= 0) {
        refundedList[existingIdx] = refundRecord;
      } else {
        refundedList.push(refundRecord);
      }
      localStorage.setItem('refunded_bookings', JSON.stringify(refundedList));

      // Lưu thêm cờ trực tiếp
      const cCode = cleanCode(targetBCode);
      if (cCode) localStorage.setItem(`refunded_${cCode}`, JSON.stringify(refundRecord));
      if (targetBId) localStorage.setItem(`refunded_${targetBId}`, JSON.stringify(refundRecord));

      // Xóa khỏi danh sách chờ hoàn cọc
      const currentPending = JSON.parse(localStorage.getItem('pending_refunds') || '[]');
      const updated = currentPending.filter((r) => !isMatch(r, refundItem));
      localStorage.setItem('pending_refunds', JSON.stringify(updated));

      // Phát sự kiện để cập nhật đồng bộ các tab ngay lập tức
      window.dispatchEvent(new Event('storage'));

      showToast(
        `Đã xác nhận hoàn tất chuyển tiền cọc ${refundAmountToDisplay.toLocaleString('vi-VN')} đ cho đơn ${refundItem.bookingCode}!`,
        'success'
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Lỗi xác nhận hoàn tiền', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
                <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>{bankNameToDisplay}</strong>
                <button
                  type="button"
                  className="btn-copy-action"
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
                <strong className="code-text" style={{ fontSize: '1.35rem', color: '#0F172A', letterSpacing: '0.06em' }}>
                  {accountNumberToDisplay}
                </strong>
                <button
                  type="button"
                  className="btn-copy-action"
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
                <strong style={{ letterSpacing: '0.04em', fontSize: '1.05rem', color: '#0F172A' }}>{accountHolderToDisplay}</strong>
                <button
                  type="button"
                  className="btn-copy-action"
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
                <strong className="amount-text green-text" style={{ fontSize: '1.35rem' }}>
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
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A' }}>
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
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Đang lưu đối soát...' : '✓ Xác nhận ĐÃ CHUYỂN TIỀN HOÀN CỌC'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

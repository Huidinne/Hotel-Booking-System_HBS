import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { useToast } from '../../context/ToastContext';

export function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const bookingCode = searchParams.get('vnp_TxnRef') || 'BK-DEMO-999';
  const amount = Number(searchParams.get('vnp_Amount')) || 950000;

  const [status, setStatus] = useState('PROCESSING'); // PROCESSING | SUCCESS | FAILED
  const [secondsLeft, setSecondsLeft] = useState(15 * 60); // 15 mins hold timer
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Mẫu thông tin chuyển khoản của khách sạn Grand Aurora
  const bankDetails = {
    bankName: 'MB Bank (Ngân hàng TMCP Quân Đội)',
    accountNumber: '0388999888',
    accountHolder: 'KHACH SAN GRAND AURORA LUXURY',
    transferAmount: amount,
    transferContent: `COC ${bookingCode}`,
  };

  // Đồng hồ đếm ngược 15 phút giữ chỗ
  useEffect(() => {
    if (status !== 'PROCESSING') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('FAILED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text, fieldName, label) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showToast(`Đã sao chép ${label}!`, 'success');
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  // Xác nhận đã hoàn tất chuyển khoản
  const handleConfirmTransfer = async () => {
    setSubmitting(true);
    try {
      const ok = await paymentService.processVNPayReturn(bookingCode, '00');
      if (ok) {
        setStatus('SUCCESS');
        showToast(`Đã ghi nhận thanh toán cọc thành công cho đơn ${bookingCode}!`, 'success');
      } else {
        setStatus('FAILED');
        showToast('Giao dịch chưa được xác nhận thành công. Vui lòng thử lại!', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi xử lý xác nhận thanh toán', 'error');
      setStatus('FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vnpay-page-container">
      <div className="vnpay-gateway-card">
        {/* Header cổng chuyển khoản */}
        <div className="vnpay-header">
          <div className="vnpay-logo">
            <span className="vnpay-icon">🏦</span>
            <span className="vnpay-brand">CỔNG CHUYỂN KHOẢN NGÂN HÀNG</span>
          </div>
          <span className="test-badge" style={{ background: '#C5A880', color: '#0F172A', fontWeight: 700 }}>
            Grand Aurora Hotel
          </span>
        </div>

        {status === 'PROCESSING' && (
          <div className="vnpay-body">
            {/* Cảnh báo thời gian giữ chỗ */}
            <div className="hold-timer-alert">
              <span className="timer-icon">⏱️</span>
              <div>
                <strong>Thời gian giữ chỗ còn lại: {formatTimer(secondsLeft)}</strong>
                <p>
                  Vui lòng chuyển khoản theo thông tin mẫu bên dưới trong thời gian giữ chỗ để hệ thống giữ phòng cho quý khách.
                </p>
              </div>
            </div>

            {/* BẢNG MẪU THÔNG TIN CHUYỂN KHOẢN (KHÔNG DÙNG QR) */}
            <div className="bank-sample-card">
              <div className="sample-card-header">
                <span className="sample-card-title">📋 THÔNG TIN MẪU CHUYỂN KHOẢN</span>
                <span className="no-qr-pill">Chuyển khoản 24/7 (Không quét QR)</span>
              </div>

              <div className="sample-fields-list">
                {/* 1. Ngân hàng */}
                <div className="sample-field-row">
                  <span className="sample-label">Ngân hàng thụ hưởng:</span>
                  <div className="sample-val-box">
                    <strong>{bankDetails.bankName}</strong>
                  </div>
                </div>

                {/* 2. Số tài khoản */}
                <div className="sample-field-row highlight-box">
                  <span className="sample-label">Số tài khoản nhận:</span>
                  <div className="sample-val-box">
                    <strong className="code-text" style={{ fontSize: '1.25rem', color: '#0F172A' }}>
                      {bankDetails.accountNumber}
                    </strong>
                    <button
                      type="button"
                      className="btn-copy-action"
                      onClick={() => handleCopy(bankDetails.accountNumber, 'accountNumber', 'Số tài khoản')}
                    >
                      {copiedField === 'accountNumber' ? '✓ Đã chép' : '📋 Sao chép'}
                    </button>
                  </div>
                </div>

                {/* 3. Tên chủ tài khoản */}
                <div className="sample-field-row">
                  <span className="sample-label">Tên chủ tài khoản:</span>
                  <div className="sample-val-box">
                    <strong style={{ letterSpacing: '0.04em' }}>{bankDetails.accountHolder}</strong>
                  </div>
                </div>

                {/* 4. Số tiền cần chuyển */}
                <div className="sample-field-row highlight-box">
                  <span className="sample-label">Số tiền cọc (50%):</span>
                  <div className="sample-val-box">
                    <strong className="amount-text green-text" style={{ fontSize: '1.3rem' }}>
                      {amount.toLocaleString('vi-VN')} VNĐ
                    </strong>
                    <button
                      type="button"
                      className="btn-copy-action"
                      onClick={() => handleCopy(String(amount), 'amount', 'Số tiền')}
                    >
                      {copiedField === 'amount' ? '✓ Đã chép' : '📋 Sao chép'}
                    </button>
                  </div>
                </div>

                {/* 5. Nội dung chuyển khoản / Ghi chú */}
                <div className="sample-field-row highlight-box-note">
                  <span className="sample-label">Nội dung chuyển khoản (Ghi chú):</span>
                  <div className="sample-val-box">
                    <strong className="note-text" style={{ fontSize: '1.2rem', color: '#785E2F' }}>
                      {bankDetails.transferContent}
                    </strong>
                    <button
                      type="button"
                      className="btn-copy-action"
                      onClick={() =>
                        handleCopy(bankDetails.transferContent, 'transferContent', 'Nội dung chuyển khoản')
                      }
                    >
                      {copiedField === 'transferContent' ? '✓ Đã chép' : '📋 Sao chép'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hướng dẫn 3 bước thao tác */}
            <div className="transfer-instructions-box">
              <h4>📌 Hướng dẫn chuyển khoản:</h4>
              <ol>
                <li>Mở ứng dụng Ngân hàng (Internet Banking) trên điện thoại của bạn.</li>
                <li>Chọn <strong>Chuyển tiền nhanh 24/7</strong> và sao chép đúng Số tài khoản, Số tiền và Nội dung chuyển khoản ở trên.</li>
                <li>Sau khi chuyển khoản thành công trên app ngân hàng, bấm nút <strong>"Tôi đã chuyển khoản xong"</strong> bên dưới.</li>
              </ol>
            </div>

            {/* Nút hành động */}
            <div className="sim-buttons" style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-sim-success"
                disabled={submitting}
                onClick={handleConfirmTransfer}
                style={{ fontSize: '1.05rem', padding: '1rem' }}
              >
                {submitting ? 'Đang xác nhận giao dịch...' : '✓ Tôi đã chuyển khoản xong'}
              </button>

              <button
                type="button"
                className="btn-sim-fail"
                disabled={submitting}
                onClick={() => navigate('/my-bookings')}
              >
                ← Để chuyển khoản sau (Về Lịch sử đặt phòng)
              </button>
            </div>
          </div>
        )}

        {/* Màn hình Xác nhận Đặt cọc Thành công */}
        {status === 'SUCCESS' && (
          <div className="vnpay-result success">
            <div className="result-icon-circle success">✓</div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#0F172A' }}>
              Xác Nhận Đặt Cọc Thành Công!
            </h2>
            <p className="result-subtitle" style={{ color: '#475569', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Đơn đặt phòng <strong>{bookingCode}</strong> đã được hệ thống xác nhận thanh toán cọc thành công. Khách sạn đã chính thức giữ phòng cho quý khách!
            </p>

            <div className="receipt-card" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
              <div className="receipt-row">
                <span>Mã đơn đặt phòng:</span>
                <strong>{bookingCode}</strong>
              </div>
              <div className="receipt-row">
                <span>Số tiền đã cọc:</span>
                <strong className="green-text" style={{ fontSize: '1.15rem' }}>
                  {amount.toLocaleString('vi-VN')} VNĐ
                </strong>
              </div>
              <div className="receipt-row">
                <span>Phương thức:</span>
                <span>Chuyển khoản Ngân hàng (MB Bank)</span>
              </div>
              <div className="receipt-row">
                <span>Trạng thái phòng:</span>
                <span className="badge-confirmed">CONFIRMED (Đã giữ phòng)</span>
              </div>
            </div>

            <div className="action-row" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => navigate('/my-bookings')}>
                Xem đơn trong Lịch sử Đặt phòng
              </button>
              <button className="btn-secondary" onClick={() => navigate('/')}>
                Về Trang chủ
              </button>
            </div>
          </div>
        )}

        {/* Màn hình Thất bại / Hết hạn */}
        {status === 'FAILED' && (
          <div className="vnpay-result failed">
            <div className="result-icon-circle failed">✕</div>
            <h2>Chưa Hoàn Tất Thanh Toán Cọc</h2>
            <p className="result-subtitle">
              Đơn hàng chưa hoàn tất thanh toán hoặc đã quá thời hạn giữ chỗ 15 phút.
            </p>

            <div className="action-row" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setStatus('PROCESSING')}>
                ↺ Xem lại thông tin chuyển khoản
              </button>
              <button className="btn-primary" onClick={() => navigate('/rooms')}>
                Tìm loại phòng khác
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

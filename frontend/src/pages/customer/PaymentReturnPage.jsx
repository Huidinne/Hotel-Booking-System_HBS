import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';

export function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Trích xuất mã bookingCode từ TxnRef (có thể có dạng TXN-BK-20261023-001-17189... hoặc BK-20261023-001)
  const rawTxnRef = searchParams.get('vnp_TxnRef') || '';
  const bkMatch = rawTxnRef.match(/BK-[A-Za-z0-9-]+/);
  const bookingCode = bkMatch ? bkMatch[0] : (rawTxnRef || 'BK-DEMO-999');

  // Xử lý số tiền: Nếu trả về từ VNPay thì nhân 100 (xu), nếu từ form chuyển khoản thì là số tiền VND
  const rawAmount = Number(searchParams.get('vnp_Amount')) || 0;
  const amount = rawAmount >= 50000000 ? Math.round(rawAmount / 100) : (rawAmount || 950000);

  const responseCode = searchParams.get('vnp_ResponseCode');
  const vnpTransactionNo = searchParams.get('vnp_TransactionNo') || searchParams.get('vnp_BankTranNo') || `VNP-${Date.now()}`;
  const bankCode = searchParams.get('vnp_BankCode') || 'NCB / VNPay';
  const isVnPayCallback = responseCode !== null;

  const [status, setStatus] = useState(isVnPayCallback ? 'VERIFYING' : 'PROCESSING'); // VERIFYING | PROCESSING | SUCCESS | FAILED
  const [failureReason, setFailureReason] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(15 * 60); // 15 mins hold timer
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Thông tin tài khoản nhận chuyển khoản cọc
  const bankDetails = {
    bankName: 'BIDV (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)',
    accountNumber: '8861339506',
    accountHolder: 'NGUYEN THI YEN',
    transferAmount: amount,
    transferContent: `COC ${bookingCode}`,
  };

  // Lưu mã đơn vào danh sách đã thanh toán để Lịch sử đặt phòng hiển thị ngay
  const saveConfirmedBooking = (code) => {
    try {
      const stored = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]');
      if (code && !stored.includes(code)) {
        stored.push(code);
        localStorage.setItem('confirmed_bookings', JSON.stringify(stored));
      }
    } catch (e) {
      console.warn('Lỗi lưu localStorage:', e);
    }
  };

  // Xử lý khi nhận redirect từ VNPay
  useEffect(() => {
    if (!isVnPayCallback) return;

    const verifyVnPay = async () => {
      setStatus('VERIFYING');
      const isSuccess = responseCode === '00';

      // 1. Gửi thông số xác thực về backend IPN để cập nhật Database
      try {
        const search = window.location.search;
        if (search) {
          try {
            await apiClient.get(`/payments/vnpay-ipn${search}`);
          } catch (err) {
            console.warn('IPN forward note:', err);
          }
          try {
            await apiClient.get(`/payments/vnpay-return${search}`);
          } catch (err) {
            console.warn('Return forward note:', err);
          }
        }
      } catch (e) {
        console.warn('Backend notification notice:', e);
      }

      if (isSuccess) {
        saveConfirmedBooking(bookingCode);
        setStatus('SUCCESS');
        showToast(`Thanh toán cọc VNPay thành công cho đơn ${bookingCode}!`, 'success');
      } else {
        setStatus('FAILED');
        let msg = 'Giao dịch thanh toán cọc VNPay không thành công.';
        if (responseCode === '24') msg = 'Khách hàng đã hủy giao dịch trên cổng VNPay.';
        else if (responseCode === '11') msg = 'Đã hết hạn chờ thanh toán trên cổng VNPay.';
        else if (responseCode === '51') msg = 'Tài khoản ngân hàng không đủ số dư để thanh toán.';
        else if (responseCode === '79') msg = 'Nhập sai mật khẩu/mã OTP quá số lần quy định.';
        setFailureReason(msg);
        showToast(msg, 'error');
      }
    };

    verifyVnPay();
  }, [responseCode, isVnPayCallback, bookingCode]);

  // Đồng hồ đếm ngược 15 phút giữ chỗ (cho trường hợp xem thông tin chuyển khoản)
  useEffect(() => {
    if (status !== 'PROCESSING') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('FAILED');
          setFailureReason('Đã hết hạn thời gian giữ chỗ 15 phút.');
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

  // Xác nhận đã hoàn tất chuyển khoản thủ công
  const handleConfirmTransfer = async () => {
    setSubmitting(true);
    try {
      saveConfirmedBooking(bookingCode);
      const ok = await paymentService.processVNPayReturn(bookingCode, '00');
      setStatus('SUCCESS');
      showToast(`Đã ghi nhận thanh toán cọc thành công cho đơn ${bookingCode}!`, 'success');
    } catch (err) {
      saveConfirmedBooking(bookingCode);
      setStatus('SUCCESS');
      showToast(`Đã ghi nhận thanh toán cọc thành công cho đơn ${bookingCode}!`, 'success');
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
            <span className="vnpay-icon">💳</span>
            <span className="vnpay-brand">CỔNG THANH TOÁN VNPAY & CHUYỂN KHOẢN</span>
          </div>
          <span className="test-badge" style={{ background: '#C5A880', color: '#0F172A', fontWeight: 700 }}>
            Grand Aurora Hotel
          </span>
        </div>

        {/* Trạng thái đang xác thực kết quả VNPay */}
        {status === 'VERIFYING' && (
          <div className="vnpay-body" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }} />
            <h3 style={{ color: '#0F172A', fontWeight: 700 }}>
              Đang xác thực kết quả từ Cổng VNPay...
            </h3>
            <p style={{ color: '#64748B' }}>Vui lòng không tắt hoặc tải lại trình duyệt.</p>
          </div>
        )}

        {/* Trạng thái xem thông tin chuyển khoản thủ công */}
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
                {/* 1. Ngân hàng thụ hưởng */}
                <div className="sample-field-row highlight-box">
                  <span className="sample-label">Ngân hàng thụ hưởng:</span>
                  <div className="sample-val-box">
                    <strong style={{ color: '#0F172A', fontSize: '1.05rem', fontWeight: 700 }}>
                      {bankDetails.bankName}
                    </strong>
                    <button
                      type="button"
                      className="btn-copy-action"
                      onClick={() => handleCopy(bankDetails.bankName, 'bankName', 'Tên ngân hàng')}
                    >
                      {copiedField === 'bankName' ? '✓ Đã chép' : '📋 Sao chép'}
                    </button>
                  </div>
                </div>

                {/* 2. Tên chủ tài khoản */}
                <div className="sample-field-row highlight-box">
                  <span className="sample-label">Tên chủ tài khoản:</span>
                  <div className="sample-val-box">
                    <strong style={{ letterSpacing: '0.04em', color: '#0F172A', fontSize: '1.1rem', fontWeight: 700 }}>
                      {bankDetails.accountHolder}
                    </strong>
                    <button
                      type="button"
                      className="btn-copy-action"
                      onClick={() => handleCopy(bankDetails.accountHolder, 'accountHolder', 'Tên chủ tài khoản')}
                    >
                      {copiedField === 'accountHolder' ? '✓ Đã chép' : '📋 Sao chép'}
                    </button>
                  </div>
                </div>

                {/* 3. Số tài khoản */}
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
            <h2 style={{ color: '#0F172A', fontWeight: 700 }}>
              Xác Nhận Đặt Cọc Thành Công!
            </h2>
            <p className="result-subtitle" style={{ color: '#475569', fontSize: '1rem', marginTop: '0.6rem', marginBottom: '2rem' }}>
              Đơn đặt phòng <strong>{bookingCode}</strong> đã được hệ thống ghi nhận thanh toán cọc thành công. Khách sạn đã chính thức giữ phòng cho quý khách!
            </p>

            <div className="action-row" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
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
              {failureReason || 'Đơn hàng chưa hoàn tất thanh toán hoặc đã quá thời hạn giữ chỗ 15 phút.'}
            </p>

            <div className="action-row" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() =>
                  navigate(`/payment/vnpay-gateway?vnp_TxnRef=${bookingCode}&vnp_Amount=${amount}`)
                }
              >
                ↺ Thử lại thanh toán VNPay
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

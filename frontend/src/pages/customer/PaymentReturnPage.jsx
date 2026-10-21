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
  const [vnpayTxnId] = useState(() => `VNP-${Math.floor(10000000 + Math.random() * 90000000)}`);

  // 15-minute countdown timer
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

  const handleSimulatePayment = async (responseCode) => {
    setSubmitting(true);
    try {
      const ok = await paymentService.processVNPayReturn(bookingCode, responseCode);
      if (ok) {
        setStatus('SUCCESS');
        showToast(`Xác nhận thanh toán cọc thành công cho đơn ${bookingCode}!`, 'success');
      } else {
        setStatus('FAILED');
        showToast('Giao dịch thanh toán không thành công hoặc đã bị hủy!', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi xử lý kết quả thanh toán', 'error');
      setStatus('FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vnpay-page-container">
      <div className="vnpay-gateway-card">
        {/* Gateway Header */}
        <div className="vnpay-header">
          <div className="vnpay-logo">
            <span className="vnpay-icon">💳</span>
            <span className="vnpay-brand">VNPAY SANDBOX GATEWAY</span>
          </div>
          <span className="test-badge">Môi trường Kiểm thử</span>
        </div>

        {status === 'PROCESSING' && (
          <div className="vnpay-body">
            <div className="hold-timer-alert">
              <span className="timer-icon">⏱️</span>
              <div>
                <strong>Thời gian giữ chỗ còn lại: {formatTimer(secondsLeft)}</strong>
                <p>Nếu không hoàn tất trước khi hết hạn, đơn đặt phòng sẽ tự động hủy để giải phóng quota.</p>
              </div>
            </div>

            <div className="txn-details-table">
              <div className="txn-row">
                <span>Mã đơn đặt phòng (TxnRef):</span>
                <strong>{bookingCode}</strong>
              </div>
              <div className="txn-row">
                <span>Số tiền cọc cần thanh toán (50%):</span>
                <strong className="txn-amount">{amount.toLocaleString('vi-VN')} VNĐ</strong>
              </div>
              <div className="txn-row">
                <span>Đơn vị thụ hưởng:</span>
                <span>Khách sạn Grand Aurora Hotel</span>
              </div>
              <div className="txn-row">
                <span>Cổng thanh toán:</span>
                <span>VNPAY-QR / Thẻ ATM / Thẻ Quốc tế (Sandbox)</span>
              </div>
            </div>

            <div className="sandbox-simulation-actions">
              <h4>Chọn kịch bản phản hồi từ VNPay:</h4>
              <div className="sim-buttons">
                <button
                  className="btn-sim-success"
                  disabled={submitting}
                  onClick={() => handleSimulatePayment('00')}
                >
                  {submitting ? 'Đang xử lý...' : '✓ Mô phỏng: Thanh toán THÀNH CÔNG (Mã 00)'}
                </button>
                <button
                  className="btn-sim-fail"
                  disabled={submitting}
                  onClick={() => handleSimulatePayment('99')}
                >
                  ✕ Mô phỏng: Giao dịch THẤT BẠI / Khách hủy (Mã 99)
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'SUCCESS' && (
          <div className="vnpay-result success">
            <div className="result-icon-circle success">✓</div>
            <h2>Thanh Toán Cọc Thành Công!</h2>
            <p className="result-subtitle">
              Giao dịch đã được xác thực bảo mật HMAC-SHA512. Trạng thái đơn <strong>{bookingCode}</strong> đã tự động chuyển sang <code>CONFIRMED</code>.
            </p>

            <div className="receipt-card">
              <div className="receipt-row">
                <span>Mã giao dịch VNPay:</span>
                <strong>{vnpayTxnId}</strong>
              </div>
              <div className="receipt-row">
                <span>Số tiền đã cọc:</span>
                <strong className="green-text">{amount.toLocaleString('vi-VN')} VNĐ</strong>
              </div>
              <div className="receipt-row">
                <span>Trạng thái đơn hàng:</span>
                <span className="badge-confirmed">CONFIRMED (Đã xác nhận giữ phòng)</span>
              </div>
            </div>

            <div className="action-row" style={{ marginTop: '2rem' }}>
              <button className="btn-primary" onClick={() => navigate('/my-bookings')}>
                Xem đơn trong Lịch sử Đặt phòng
              </button>
              <button className="btn-secondary" onClick={() => navigate('/')}>
                Về Trang chủ
              </button>
            </div>
          </div>
        )}

        {status === 'FAILED' && (
          <div className="vnpay-result failed">
            <div className="result-icon-circle failed">✕</div>
            <h2>Thanh Toán Không Thành Công</h2>
            <p className="result-subtitle">
              Giao dịch bị từ chối hoặc đã quá thời hạn giữ chỗ 15 phút. Quota phòng chưa được xác nhận.
            </p>

            <div className="action-row" style={{ marginTop: '2rem' }}>
              <button className="btn-secondary" onClick={() => setStatus('PROCESSING')}>
                Thử lại thanh toán
              </button>
              <button className="btn-primary" onClick={() => navigate('/rooms')}>
                Tìm phòng khác
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

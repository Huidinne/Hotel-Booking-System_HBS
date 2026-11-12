import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';
import { Mail } from 'lucide-react';

export function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const rawTxnRef = searchParams.get('vnp_TxnRef') || '';
  const bkMatch = rawTxnRef.match(/BK-[A-Za-z0-9-]+/);
  const bookingCode = bkMatch ? bkMatch[0] : rawTxnRef;

  const rawAmount = Number(searchParams.get('vnp_Amount')) || 0;
  const amount = rawAmount >= 50000000 ? Math.round(rawAmount / 100) : rawAmount;

  const responseCode = searchParams.get('vnp_ResponseCode');
  const isVnPayCallback = responseCode !== null;

  const [status, setStatus] = useState(isVnPayCallback ? 'VERIFYING' : 'FAILED');
  const [failureReason, setFailureReason] = useState('');

  // Nếu truy cập trực tiếp không có callback VNPay, chuyển sang trang thanh toán QR
  useEffect(() => {
    if (!isVnPayCallback) {
      if (bookingCode) {
        navigate(`/payment/qr?bookingCode=${bookingCode}`, { replace: true });
      } else {
        setFailureReason('Thiếu thông tin giao dịch thanh toán.');
      }
    }
  }, [isVnPayCallback, bookingCode, navigate]);

  // Xác thực kết quả VNPay qua Backend API
  useEffect(() => {
    if (!isVnPayCallback) return;

    const verifyVnPay = async () => {
      setStatus('VERIFYING');
      const isSuccess = responseCode === '00';
      let verifiedSuccess = false;

      try {
        const search = window.location.search;
        if (search) {
          try {
            await apiClient.get(`/payments/vnpay-ipn${search}`);
          } catch (err) {
            console.warn('IPN forward note:', err);
          }
          const returnRes = await apiClient.get(`/payments/vnpay-return${search}`);
          if (returnRes && (returnRes.status === 'SUCCESS' || returnRes.vnp_ResponseCode === '00' || isSuccess)) {
            verifiedSuccess = true;
          }
        }
      } catch (e) {
        console.warn('Backend verification notice:', e);
        verifiedSuccess = false;
      }

      if (isSuccess && verifiedSuccess) {
        setStatus('SUCCESS');
        showToast('Thanh toán thành công', 'success');
      } else {
        setStatus('FAILED');
        let msg = 'Thanh toán thất bại. Vui lòng thử lại';
        if (responseCode === '24') msg = 'Khách hàng đã hủy giao dịch trên cổng VNPay.';
        else if (responseCode === '11') msg = 'Đã hết hạn chờ thanh toán trên cổng VNPay.';
        else if (responseCode === '51') msg = 'Tài khoản ngân hàng không đủ số dư để thanh toán.';
        else if (responseCode === '79') msg = 'Nhập sai mật khẩu/mã OTP quá số lần quy định.';
        else if (isSuccess && !verifiedSuccess) msg = 'Không thể xác minh chữ ký giao dịch từ máy chủ. Vui lòng thử lại.';
        setFailureReason(msg);
        showToast('Thanh toán thất bại. Vui lòng thử lại', 'error');
      }
    };

    verifyVnPay();
  }, [responseCode, isVnPayCallback, bookingCode, showToast]);

  return (
    <div className="vnpay-page-container">
      <div className="vnpay-gateway-card">
        <div className="vnpay-header">
          <div className="vnpay-logo">
            <span className="vnpay-icon">💳</span>
            <span className="vnpay-brand">KẾT QUẢ THANH TOÁN TRỰC TUYẾN</span>
          </div>
          <span className="test-badge" style={{ background: '#C5A880', color: '#0F172A', fontWeight: 700 }}>
            Grand Aurora Hotel
          </span>
        </div>

        {status === 'VERIFYING' && (
          <div className="vnpay-body" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }} />
            <h3 style={{ color: '#0F172A', fontWeight: 700 }}>
              Đang xác thực kết quả giao dịch với máy chủ...
            </h3>
            <p style={{ color: '#64748B' }}>Vui lòng không tắt hoặc tải lại trình duyệt.</p>
          </div>
        )}

        {status === 'SUCCESS' && (
          <div className="vnpay-result success">
            <div className="result-icon-circle success">✓</div>
            <h2 style={{ color: '#0F172A', fontWeight: 700 }}>
              Thanh toán thành công
            </h2>
            <p className="result-subtitle" style={{ color: '#475569', fontSize: '1rem', marginTop: '0.6rem', marginBottom: '1.2rem' }}>
              Đơn đặt phòng <strong>{bookingCode}</strong> đã được xác nhận thanh toán cọc{' '}
              {amount > 0 ? <strong>{amount.toLocaleString('vi-VN')} VNĐ</strong> : ''} thành công!
            </p>

            <div className="email-auto-notify-box" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              color: '#102033',
              fontSize: '0.88rem',
              fontWeight: 500,
              marginBottom: '2rem'
            }}>
              <Mail size={18} style={{ color: '#C6A34A', flexShrink: 0 }} />
              <span>Phiếu xác nhận đặt phòng kèm file PDF chi tiết đang được hệ thống gửi tự động đến email của quý khách.</span>
            </div>

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

        {status === 'FAILED' && (
          <div className="vnpay-result failed">
            <div className="result-icon-circle failed">✕</div>
            <h2>Thanh toán thất bại</h2>
            <p className="result-subtitle">
              {failureReason || 'Thanh toán thất bại. Vui lòng thử lại'}
            </p>

            <div className="action-row" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {bookingCode && (
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/payment/qr?bookingCode=${bookingCode}`)}
                >
                  ↺ Thử lại thanh toán QR / VNPay
                </button>
              )}
              <button className="btn-primary" onClick={() => navigate('/my-bookings')}>
                Về Lịch sử Đặt phòng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default PaymentReturnPage;

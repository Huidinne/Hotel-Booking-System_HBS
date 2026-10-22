import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { roomService } from '../../services/roomService';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CustomInput } from '../../components/common/CustomInput';

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const roomTypeId = Number(searchParams.get('roomTypeId')) || 1;
  const checkIn = searchParams.get('checkIn') || '2026-10-25';
  const checkOut = searchParams.get('checkOut') || '2026-10-27';
  const guests = Number(searchParams.get('guests')) || 2;
  const quantity = Number(searchParams.get('quantity')) || 1;

  const [roomType, setRoomType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState(currentUser?.fullName || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('VNPAY');
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Custom validation states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (field, val) => {
    let error = '';
    const value = (val || '').trim();
    if (field === 'customerName') {
      if (!value) {
        error = 'Vui lòng nhập họ và tên khách hàng';
      } else if (value.length < 2) {
        error = 'Họ và tên tối thiểu 2 ký tự';
      }
    } else if (field === 'customerPhone') {
      if (!value) {
        error = 'Vui lòng nhập số điện thoại liên hệ';
      } else if (!/^[0-9+\s\-]{9,15}$/.test(value)) {
        error = 'Số điện thoại không đúng định dạng (9 - 15 số)';
      }
    } else if (field === 'customerEmail') {
      if (!value) {
        error = 'Vui lòng nhập địa chỉ email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = 'Địa chỉ email không hợp lệ (ví dụ: customer@example.com)';
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

  const loadRoom = async () => {
    try {
      const data = await roomService.getRoomTypeById(roomTypeId);
      setRoomType(data);
    } catch (err) {
      showToast(err.message || 'Lỗi tải thông tin phòng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();
  }, [roomTypeId]);

  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
  );

  const totalPrice = roomType ? roomType.basePrice * nights * quantity : 0;
  const depositAmount = Math.round(totalPrice * 0.5);

  const handleSubmitBooking = async (e) => {
    e.preventDefault();

    // Trigger full custom validation
    const nameErr = validateField('customerName', customerName);
    const phoneErr = validateField('customerPhone', customerPhone);
    const emailErr = validateField('customerEmail', customerEmail);

    setTouched({
      customerName: true,
      customerPhone: true,
      customerEmail: true,
    });

    const newErrors = {
      customerName: nameErr,
      customerPhone: phoneErr,
      customerEmail: emailErr,
    };
    setErrors(newErrors);

    if (nameErr || phoneErr || emailErr) {
      showToast('Vui lòng kiểm tra lại thông tin bị lỗi màu đỏ!', 'warning');
      return;
    }

    if (!agreedTerms) {
      showToast('Vui lòng xác nhận đồng ý với chính sách nhận/hủy phòng!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const newBooking = await bookingService.createBooking(
        {
          roomTypeId,
          quantity,
          checkIn,
          checkOut,
          guests,
          paymentMethod,
          note: note.trim(),
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
        },
        currentUser?.id || 3
      );

      if (paymentMethod === 'VNPAY') {
        showToast('Tạo đơn thành công! Đang chuyển hướng sang cổng VNPay Sandbox...', 'info');
        setTimeout(() => {
          navigate(newBooking.paymentUrl || `/payment/vnpay-return?vnp_TxnRef=${newBooking.bookingCode}&vnp_Amount=${depositAmount}`);
        }, 800);
      } else {
        showToast(
          `Đặt phòng thành công! Mã đơn ${newBooking.bookingCode} (Đơn chờ Lễ tân xác nhận trước thời hạn giữ chỗ).`,
          'success'
        );
        navigate('/my-bookings');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi tạo đơn đặt phòng', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Đang chuẩn bị thông tin thanh toán..." />;
  }

  if (!roomType) {
    return (
      <div className="error-container">
        <h3>Không tìm thấy thông tin loại phòng</h3>
        <button className="btn-primary" onClick={() => navigate('/rooms')}>
          Quay lại danh mục
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      <div className="checkout-header">
        <h1>Xác nhận thông tin & Đặt cọc phòng</h1>
        <p>Vui lòng kiểm tra kỹ thông tin lưu trú trước khi hoàn tất đặt phòng</p>
      </div>

      {!currentUser && (
        <div className="guest-checkout-notice" style={{
          background: 'linear-gradient(135deg, #fef9e7 0%, #fff 100%)',
          border: '1px solid rgba(197, 155, 39, 0.4)',
          borderRadius: '10px',
          padding: '0.85rem 1.2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          color: '#78350f',
          fontSize: '0.92rem'
        }}>
          <span>💡 <strong>Dành cho khách hàng:</strong> Bạn có thể <Link to="/login" style={{ color: '#b48328', fontWeight: 700, textDecoration: 'underline' }}>Đăng nhập</Link> để tự động điền hồ sơ hoặc hoàn tất đặt phòng nhanh với biểu mẫu bên dưới.</span>
        </div>
      )}

      <div className="checkout-grid-layout">
        {/* Left Form */}
        <div className="checkout-form-col">
          <form onSubmit={handleSubmitBooking} className="checkout-main-form" noValidate>
            {/* Customer Details Box */}
            <div className="form-section-card">
              <h3>Thông tin người liên hệ nhận phòng</h3>
              
              <CustomInput
                id="customerName"
                name="customerName"
                label="Họ và tên khách hàng"
                placeholder="Ví dụ: Nguyễn Văn A"
                value={customerName}
                required
                error={touched.customerName ? errors.customerName : ''}
                onChange={(e) => handleChange('customerName', e.target.value, setCustomerName)}
                onBlur={(e) => handleBlur('customerName', e.target.value)}
              />

              <div className="form-row-2">
                <CustomInput
                  id="customerPhone"
                  name="customerPhone"
                  type="tel"
                  label="Số điện thoại liên hệ"
                  placeholder="Ví dụ: 0901234567"
                  value={customerPhone}
                  required
                  error={touched.customerPhone ? errors.customerPhone : ''}
                  onChange={(e) => handleChange('customerPhone', e.target.value, setCustomerPhone)}
                  onBlur={(e) => handleBlur('customerPhone', e.target.value)}
                />

                <CustomInput
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  label="Địa chỉ Email nhận xác nhận"
                  placeholder="Ví dụ: customer@gmail.com"
                  value={customerEmail}
                  required
                  error={touched.customerEmail ? errors.customerEmail : ''}
                  onChange={(e) => handleChange('customerEmail', e.target.value, setCustomerEmail)}
                  onBlur={(e) => handleBlur('customerEmail', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Ghi chú / Yêu cầu đặc biệt</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Cần phòng tầng cao, giường phụ, hoặc giờ đến dự kiến..."
                  rows={2}
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="form-section-card">
              <h3>Phương thức thanh toán</h3>

              <div className="payment-options-list">
                {/* Option 1: VNPay */}
                <label className={`payment-method-card ${paymentMethod === 'VNPAY' ? 'active' : ''}`}>
                  <div className="method-radio">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="VNPAY"
                      checked={paymentMethod === 'VNPAY'}
                      onChange={() => setPaymentMethod('VNPAY')}
                    />
                  </div>
                  <div className="method-info">
                    <div className="method-title">
                      <span className="method-icon">💳</span>
                      <strong>Cọc 50% qua Cổng VNPay Sandbox (Khuyên dùng)</strong>
                      <span className="recom-badge">Xác nhận tức thì</span>
                    </div>
                    <p className="method-desc">
                      Hệ thống tự động kích hoạt <strong>khóa giữ chỗ trong đúng 15 phút</strong>. Sau khi hoàn tất thanh toán cọc {depositAmount.toLocaleString('vi-VN')} VNĐ, đơn đặt phòng sẽ tự động chuyển sang <code>CONFIRMED</code> và cam kết phòng cho bạn.
                    </p>
                  </div>
                </label>

                {/* Option 2: Cash at Hotel */}
                <label className={`payment-method-card ${paymentMethod === 'CASH' ? 'active' : ''}`}>
                  <div className="method-radio">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CASH"
                      checked={paymentMethod === 'CASH'}
                      onChange={() => setPaymentMethod('CASH')}
                    />
                  </div>
                  <div className="method-info">
                    <div className="method-title">
                      <span className="method-icon">🏨</span>
                      <strong>Thanh toán tại khách sạn (Trả sau)</strong>
                    </div>
                    <p className="method-desc">
                      Đơn hàng được tạo ở trạng thái <code>PENDING</code>. Hệ thống tạm giữ chỗ trong vòng 24 giờ (hoặc đến 18:00 ngày nhận phòng nếu đặt trong ngày) để nhân viên Lễ tân gọi điện xác nhận nhu cầu.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Terms and Policies */}
            <div className="terms-checkbox-box">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  required
                />
                <span>
                  Tôi đã đọc và đồng ý với <strong>Quy định hủy phòng & hoàn cọc</strong> (Căn cứ mốc 14:00 ngày Check-in: Hủy trước ≥ 24h hoàn 100% cọc; 12h-24h phạt 30% cọc; &lt; 12h phạt 50% cọc; sau 14:00 phạt 100% cọc).
                </span>
              </label>
            </div>

            <button type="submit" className="btn-confirm-checkout" disabled={submitting}>
              {submitting
                ? 'Đang tạo hợp đồng đặt phòng...'
                : paymentMethod === 'VNPAY'
                ? `Tiến hành Cọc ${depositAmount.toLocaleString('vi-VN')} VNĐ qua VNPay`
                : 'Xác nhận Đặt phòng (Thanh toán tại quầy)'}
            </button>
          </form>
        </div>

        {/* Right Summary Card */}
        <div className="checkout-summary-col">
          <div className="order-summary-card">
            <h3>Chi tiết đặt phòng</h3>

            <div className="room-summary-header">
              <img src={roomType.images[0]} alt={roomType.name} />
              <div>
                <h4>{roomType.name}</h4>
                <span className="room-count-badge">Số lượng: {quantity} phòng</span>
              </div>
            </div>

            <div className="summary-schedule">
              <div className="sched-item">
                <span className="sched-lbl">Nhận phòng (Check-in)</span>
                <strong>14:00 - {checkIn}</strong>
              </div>
              <div className="sched-arrow">→</div>
              <div className="sched-item">
                <span className="sched-lbl">Trả phòng (Check-out)</span>
                <strong>12:00 - {checkOut}</strong>
              </div>
            </div>

            <div className="summary-meta-rows">
              <div className="summary-row">
                <span>Thời gian lưu trú:</span>
                <strong>{nights} đêm</strong>
              </div>
              <div className="summary-row">
                <span>Số lượng khách:</span>
                <strong>{guests} người lớn</strong>
              </div>
              <div className="summary-row">
                <span>Đơn giá snapshot:</span>
                <span>{roomType.basePrice.toLocaleString('vi-VN')} VNĐ / đêm</span>
              </div>
            </div>

            <div className="summary-calc-divider" />

            <div className="summary-total-section">
              <div className="summary-row total-row">
                <span>Tổng giá trị tiền phòng:</span>
                <span className="grand-total">{totalPrice.toLocaleString('vi-VN')} VNĐ</span>
              </div>

              {paymentMethod === 'VNPAY' ? (
                <div className="summary-row deposit-highlight-row">
                  <div>
                    <strong>Số tiền cọc cần thanh toán (50%):</strong>
                    <div className="hold-hint">⏱ Giữ chỗ phòng trong 15 phút</div>
                  </div>
                  <span className="deposit-price">{depositAmount.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              ) : (
                <div className="summary-row cash-pending-row">
                  <div>
                    <strong>Thanh toán khi nhận phòng:</strong>
                    <div className="hold-hint">Chờ Lễ tân duyệt đơn</div>
                  </div>
                  <span className="cash-price">{totalPrice.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

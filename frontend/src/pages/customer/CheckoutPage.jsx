import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { roomService, DEFAULT_ROOM_IMAGE } from '../../services/roomService';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CustomInput } from '../../components/common/CustomInput';
import {
  getTodayString,
  getTomorrowString,
  getValidCheckInDate,
  getValidCheckOutDate,
  calculateNights,
  isPastDate,
} from '../../utils/dateUtils';

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const roomTypeId = Number(searchParams.get('roomTypeId')) || 1;
  const rawCheckIn = searchParams.get('checkIn');
  const checkIn = getValidCheckInDate(rawCheckIn);
  const checkOut = getValidCheckOutDate(searchParams.get('checkOut'), checkIn);
  const rawGuests = Number(searchParams.get('guests'));
  const quantity = Math.max(1, Number(searchParams.get('quantity')) || 1);

  const [roomType, setRoomType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableRoomsCount, setAvailableRoomsCount] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [currentQuantity, setCurrentQuantity] = useState(quantity);
  const [currentGuests, setCurrentGuests] = useState(rawGuests >= 1 ? rawGuests : 1);

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

      // Verify real-time available rooms for date range
      try {
        const searchResults = await roomService.searchAvailableRooms({
          checkIn,
          checkOut,
          guests: 1,
          quantity: 1,
        });
        const matched = searchResults.find((r) => r.roomTypeId === Number(roomTypeId));
        const avail = matched ? matched.availableRooms : 0;
        setAvailableRoomsCount(avail);

        if (avail > 0 && currentQuantity > avail) {
          showToast(`Số phòng trống khả dụng chỉ còn ${avail} phòng. Hệ thống tự động cập nhật về ${avail} phòng.`, 'warning');
          setCurrentQuantity(avail);
        }
      } catch (errCheck) {
        console.warn('Lỗi kiểm tra phòng khả dụng tại Checkout:', errCheck);
      } finally {
        setCheckingAvailability(false);
      }
    } catch (err) {
      showToast(err.message || 'Lỗi tải thông tin phòng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();
  }, [roomTypeId]);

  useEffect(() => {
    if (currentUser) {
      setCustomerName((prev) => prev || currentUser.fullName || '');
      setCustomerEmail((prev) => prev || currentUser.email || '');
      setCustomerPhone((prev) => prev || currentUser.phone || '');
    }
  }, [currentUser]);

  // Dynamic max guests based on actual roomType.capacity * currentQuantity
  const maxGuests = roomType ? (Number(roomType.capacity) || 1) * Math.max(1, currentQuantity) : 1;

  useEffect(() => {
    if (roomType && maxGuests > 0) {
      setCurrentGuests((prev) => {
        if (!prev || prev < 1) return 1;
        if (prev > maxGuests) return maxGuests;
        return prev;
      });
    }
  }, [roomType, maxGuests]);

  const nights = calculateNights(checkIn, checkOut);

  const totalPrice = roomType ? roomType.basePrice * nights * currentQuantity : 0;
  const depositAmount = Math.round(totalPrice * 0.5);

  const handleSubmitBooking = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('Vui lòng đăng nhập để thực hiện đặt phòng.', 'warning');
      navigate('/login', { state: { from: { pathname: '/booking/checkout', search: window.location.search } } });
      return;
    }

    if (!checkIn || !checkOut) {
      showToast('Vui lòng chọn ngày nhận phòng và trả phòng', 'warning');
      return;
    }

    if (isPastDate(checkIn)) {
      showToast('Ngày nhận phòng không hợp lệ (không được ở trong quá khứ). Vui lòng chọn lại!', 'error');
      return;
    }

    if (!currentGuests || currentGuests < 1) {
      showToast('Vui lòng chọn số lượng khách', 'warning');
      return;
    }

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

    if (availableRoomsCount === 0 || currentQuantity <= 0) {
      showToast('Rất tiếc, loại phòng này đã hết phòng trống trong khoảng thời gian đã chọn!', 'error');
      return;
    }

    if (availableRoomsCount !== null && currentQuantity > availableRoomsCount) {
      showToast(`Số lượng phòng đặt (${currentQuantity} phòng) vượt quá số phòng còn trống (${availableRoomsCount} phòng)!`, 'error');
      return;
    }

    if (currentGuests > maxGuests) {
      showToast('Số lượng khách vượt quá sức chứa của phòng', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const newBooking = await bookingService.createBooking(
        {
          roomTypeId,
          quantity: currentQuantity,
          checkIn,
          checkOut,
          guests: currentGuests,
          paymentMethod,
          note: note.trim(),
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
        },
        currentUser.id
      );

      showToast('Gửi yêu cầu đặt phòng thành công', 'success');

      if (paymentMethod === 'VNPAY') {
        navigate(`/payment/qr?bookingCode=${newBooking.bookingCode}`, {
          state: { booking: newBooking },
        });
      } else {
        navigate('/my-bookings');
      }
    } catch (err) {
      showToast(err.message || 'Không thể đặt phòng. Vui lòng thử lại', 'error');
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

              <div className="form-row-2" style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="checkout-guests">
                    Số lượng khách <span style={{ color: '#DC2626' }}>*</span> (Tối đa {maxGuests} khách)
                  </label>
                  <select
                    id="checkout-guests"
                    value={currentGuests}
                    onChange={(e) => setCurrentGuests(Number(e.target.value))}
                  >
                    {Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} Khách {num === maxGuests ? '(Tối đa)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="checkout-quantity">
                    Số lượng phòng {availableRoomsCount !== null ? `(Còn ${availableRoomsCount} phòng)` : ''}
                  </label>
                  <select
                    id="checkout-quantity"
                    value={currentQuantity}
                    disabled={checkingAvailability || availableRoomsCount === 0}
                    onChange={(e) => setCurrentQuantity(Math.max(1, Number(e.target.value)))}
                  >
                    {Array.from({ length: Math.max(1, availableRoomsCount || currentQuantity || 1) }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} Phòng
                      </option>
                    ))}
                  </select>
                </div>
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
                {/* Option 1: Chuyển khoản ngân hàng */}
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
                      <span className="method-icon">📱</span>
                      <strong>Thanh toán trực tuyến bằng QR Code / VNPay (Cọc 50% - Khuyên dùng)</strong>
                      <span className="recom-badge">Xác nhận tự động</span>
                    </div>
                    <p className="method-desc">
                      Hệ thống khởi tạo giao dịch đặt cọc <strong>{depositAmount.toLocaleString('vi-VN')} VNĐ</strong> và hiển thị mã QR / cổng thanh toán VNPay để quét bằng ứng dụng ngân hàng. Giữ phòng trong 15 phút.
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
                      <strong>Thanh toán tại khách sạn (Trả sau khi nhận phòng)</strong>
                    </div>
                    <p className="method-desc">
                      Đơn hàng được tạo ở trạng thái <code>PENDING</code>. Hệ thống tạm giữ chỗ trong vòng 24 giờ (hoặc đến 18:00 nếu đặt trong ngày) để nhân viên Lễ tân gọi điện xác nhận nhu cầu.
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

            {/* Out of stock or overbooking alert */}
            {availableRoomsCount === 0 && (
              <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B', padding: '0.85rem 1.1rem', borderRadius: '10px', marginBottom: '1.2rem', fontSize: '0.88rem' }}>
                ✕ <strong>Rất tiếc, loại phòng này đã hết phòng trống</strong> trong khoảng thời gian đã chọn ({checkIn} → {checkOut}). Vui lòng quay lại danh mục để chọn loại phòng khác.
              </div>
            )}
            {availableRoomsCount !== null && availableRoomsCount > 0 && currentQuantity > availableRoomsCount && (
              <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', color: '#92400E', padding: '0.85rem 1.1rem', borderRadius: '10px', marginBottom: '1.2rem', fontSize: '0.88rem' }}>
                ⚠️ Số phòng trống khả dụng chỉ còn <strong>{availableRoomsCount}</strong> phòng.
                <button
                  type="button"
                  onClick={() => setCurrentQuantity(availableRoomsCount)}
                  style={{ marginLeft: '10px', padding: '3px 8px', borderRadius: '5px', background: '#D97706', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  Đổi sang {availableRoomsCount} phòng
                </button>
              </div>
            )}

            <button
              type="submit"
              className="btn-confirm-checkout"
              disabled={submitting || checkingAvailability || availableRoomsCount === 0 || currentQuantity <= 0 || (availableRoomsCount !== null && currentQuantity > availableRoomsCount)}
            >
              {submitting
                ? 'Đang tạo hợp đồng đặt phòng...'
                : checkingAvailability
                ? 'Đang kiểm tra phòng trống...'
                : availableRoomsCount === 0 || currentQuantity <= 0
                ? 'Tạm hết phòng trong khoảng ngày này'
                : paymentMethod === 'VNPAY'
                ? `Thanh toán cọc QR / VNPay (${depositAmount.toLocaleString('vi-VN')} VNĐ)`
                : 'Xác nhận Đặt phòng (Thanh toán tại quầy)'}
            </button>
          </form>
        </div>

        {/* Right Summary Card */}
        <div className="checkout-summary-col">
          <div className="order-summary-card">
            <h3>Chi tiết đặt phòng</h3>

            <div className="room-summary-header">
              <img
                src={roomType.images?.[0] || DEFAULT_ROOM_IMAGE}
                alt={roomType.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_ROOM_IMAGE;
                }}
              />
              <div>
                <h4>{roomType.name}</h4>
                <span className="room-count-badge">Số lượng: {currentQuantity} phòng</span>
                {availableRoomsCount !== null && (
                  <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '3px', color: availableRoomsCount === 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                    {availableRoomsCount === 0 ? '✕ Hết phòng trống' : `✓ Còn ${availableRoomsCount} phòng khả dụng`}
                  </span>
                )}
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
                <strong>{currentGuests} người lớn</strong>
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

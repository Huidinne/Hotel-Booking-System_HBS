import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { roomService, DEFAULT_ROOM_IMAGE } from '../../services/roomService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

export function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [roomType, setRoomType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Booking widget state
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '2026-10-25');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '2026-10-27');
  const [guests, setGuests] = useState(Number(searchParams.get('guests')) || 2);
  const [quantity, setQuantity] = useState(Number(searchParams.get('quantity')) || 1);

  const loadRoomDetails = async () => {
    setLoading(true);
    try {
      const data = await roomService.getRoomTypeById(Number(id));
      setRoomType(data);
      if (guests > data.capacity) {
        setGuests(data.capacity);
      }
    } catch (err) {
      showToast(err.message || 'Lỗi tải chi tiết loại phòng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoomDetails();
  }, [id]);

  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
  );

  const totalPrice = roomType ? roomType.basePrice * nights * quantity : 0;
  const depositAmount = Math.round(totalPrice * 0.5);

  const handleProceedToCheckout = () => {
    if (new Date(checkOut) <= new Date(checkIn)) {
      showToast('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm!', 'warning');
      return;
    }
    navigate(
      `/booking/checkout?roomTypeId=${roomType.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&quantity=${quantity}`
    );
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải thông tin chi tiết loại phòng..." />;
  }

  if (!roomType) {
    return (
      <div className="error-container">
        <h3>Không tìm thấy loại phòng</h3>
        <button className="btn-primary" onClick={() => navigate('/rooms')}>
          Quay lại danh mục
        </button>
      </div>
    );
  }

  return (
    <div className="room-detail-container">
      {/* Top Header */}
      <div className="detail-header">
        <button className="btn-back-link" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
        <div className="detail-title-row">
          <h1>{roomType.name}</h1>
          <span className="capacity-badge">👤 Tối đa {roomType.capacity} khách</span>
        </div>
      </div>

      <div className="detail-main-layout">
        {/* Left Column: Gallery & Description */}
        <div className="detail-left-col">
          {/* Main Gallery */}
          <div className="gallery-main-view">
            <img
              src={roomType.images?.[activeImageIndex] || roomType.images?.[0] || DEFAULT_ROOM_IMAGE}
              alt={roomType.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_ROOM_IMAGE;
              }}
            />
          </div>

          {/* Thumbnails */}
          {roomType.images && roomType.images.length > 1 && (
            <div className="gallery-thumbs">
              {roomType.images.map((img, idx) => (
                <div
                  key={idx}
                  className={`thumb-box ${idx === activeImageIndex ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img
                    src={img || DEFAULT_ROOM_IMAGE}
                    alt={`${roomType.name} thumbnail ${idx + 1}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_ROOM_IMAGE;
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Room Description */}
          <div className="detail-section">
            <h3>Mô tả không gian & Tiện nghi</h3>
            <p className="detail-description">{roomType.description}</p>
          </div>

          {/* Amenities Grid */}
          <div className="detail-section">
            <h3>Trang thiết bị & Dịch vụ đi kèm</h3>
            <div className="amenities-grid-full">
              {roomType.amenities.map((item, idx) => (
                <div key={idx} className="amenity-item-card">
                  <span className="amenity-check">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hotel & Cancellation Policy */}
          <div className="detail-section policy-box">
            <h3>Chính sách nhận/trả phòng & Hủy cọc</h3>
            <div className="policy-bullet-list">
              <div className="policy-bullet">
                <strong>🕒 Giờ nhận phòng:</strong> Từ <strong>14:00</strong> ngày nhận phòng.
              </div>
              <div className="policy-bullet">
                <strong>🕛 Giờ trả phòng:</strong> Trước <strong>12:00</strong> trưa ngày trả phòng.
              </div>
              <div className="policy-bullet">
                <strong>💳 Quy chuẩn đặt cọc:</strong> Bắt buộc cọc đúng <strong>50% tổng tiền phòng</strong> khi đặt trực tuyến qua VNPay Sandbox (giữ quota 15 phút).
              </div>
              <div className="policy-bullet">
                <strong>🔄 Chính sách hoàn cọc bậc thang (Chuẩn mốc 14:00):</strong>
                <ul>
                  <li>Hủy trước ≥ 24 giờ: Hoàn lại <strong>100%</strong> tiền cọc.</li>
                  <li>Hủy từ đủ 12 giờ đến dưới 24 giờ: Phạt 30% tiền cọc, hoàn lại <strong>70%</strong>.</li>
                  <li>Hủy dưới 12 giờ trước giờ nhận phòng: Phạt 50% tiền cọc, hoàn lại <strong>50%</strong>.</li>
                  <li>Hủy tại hoặc sau 14:00 ngày Check-in: Khách sạn thu 100% cọc (bảo lưu hoàn 100% phần tiền phòng các đêm tiếp theo nếu đã thanh toán 100%).</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Floating Booking Calculation Card */}
        <div className="detail-right-col">
          <div className="sticky-booking-widget">
            <div className="widget-price-header">
              <span className="price-num">
                {roomType.basePrice.toLocaleString('vi-VN')} VNĐ
              </span>
              <span className="price-unit">/ đêm</span>
            </div>

            <div className="widget-form">
              <div className="form-field">
                <label>Ngày nhận phòng (Check-in 14:00)</label>
                <input
                  type="date"
                  value={checkIn}
                  min="2026-10-20"
                  onChange={(e) => setCheckIn(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>Ngày trả phòng (Check-out 12:00)</label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn}
                  onChange={(e) => setCheckOut(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>Số khách</label>
                  <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                    {Array.from({ length: roomType.capacity }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} Khách
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Số phòng (N)</label>
                  <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
                    <option value="1">1 Phòng</option>
                    <option value="2">2 Phòng</option>
                    <option value="3">3 Phòng</option>
                  </select>
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="price-breakdown-card">
                <div className="breakdown-line">
                  <span>
                    {roomType.basePrice.toLocaleString('vi-VN')}đ × {nights} đêm × {quantity} phòng
                  </span>
                  <span>{totalPrice.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div className="breakdown-divider" />
                <div className="breakdown-line total-line">
                  <span>Tổng tiền phòng:</span>
                  <strong>{totalPrice.toLocaleString('vi-VN')} VNĐ</strong>
                </div>
                <div className="breakdown-line deposit-line">
                  <span>Tiền cọc 50% trực tuyến:</span>
                  <strong className="green-text">{depositAmount.toLocaleString('vi-VN')} VNĐ</strong>
                </div>
              </div>

              <button className="btn-proceed-booking" onClick={handleProceedToCheckout}>
                Tiến hành Đặt phòng ({quantity} phòng)
              </button>

              <div className="security-guarantee-note">
                🔒 Cam kết giữ chỗ tức thì - Chống Overbooking với Pessimistic Lock
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

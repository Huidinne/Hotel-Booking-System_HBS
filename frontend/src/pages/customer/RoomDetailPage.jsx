import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { roomService, DEFAULT_ROOM_IMAGE } from '../../services/roomService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { RoomVirtualTour } from '../../components/room/RoomVirtualTour';
import { hasVirtualTour } from '../../config/virtualTours';
import {
  getTodayString,
  addDays,
  calculateNights,
  getValidCheckInDate,
  getValidCheckOutDate,
  isPastDate,
} from '../../utils/dateUtils';

export function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [roomType, setRoomType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Booking widget state - strictly enforce today or future dates
  const today = getTodayString();
  const initialCheckIn = getValidCheckInDate(searchParams.get('checkIn'));
  const initialCheckOut = getValidCheckOutDate(searchParams.get('checkOut'), initialCheckIn);

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(Number(searchParams.get('guests')) || 2);
  const [quantity, setQuantity] = useState(Number(searchParams.get('quantity')) || 1);

  // Real-time room availability state
  const [availableRoomsCount, setAvailableRoomsCount] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const loadRoomDetails = async () => {
    setLoading(true);
    try {
      const data = await roomService.getRoomTypeById(Number(id));
      setRoomType(data);
    } catch (err) {
      showToast(err.message || 'Lỗi tải chi tiết loại phòng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoomDetails();
  }, [id]);

  // Check real-time room availability for selected stay period
  const checkAvailability = useCallback(async (inDate, outDate) => {
    if (!inDate || !outDate || outDate <= inDate || isPastDate(inDate)) {
      setAvailableRoomsCount(0);
      return;
    }

    setCheckingAvailability(true);
    try {
      const searchResults = await roomService.searchAvailableRooms({
        checkIn: inDate,
        checkOut: outDate,
        guests: 1,
        quantity: 1,
      });

      const matched = searchResults.find((r) => r.roomTypeId === Number(id));
      const avail = matched ? matched.availableRooms : 0;
      setAvailableRoomsCount(avail);

      // Business Rule: maxRooms = availableRooms
      if (avail <= 0) {
        setQuantity(0);
      } else {
        setQuantity((prevQty) => {
          if (prevQty <= 0) return 1;
          if (prevQty > avail) return avail;
          return prevQty;
        });
      }
    } catch (err) {
      console.warn('[RoomDetailPage] Lỗi kiểm tra số phòng trống khả dụng:', err);
    } finally {
      setCheckingAvailability(false);
    }
  }, [id]);

  useEffect(() => {
    if (checkIn && checkOut && checkOut > checkIn && !isPastDate(checkIn)) {
      checkAvailability(checkIn, checkOut);
    }
  }, [checkIn, checkOut, checkAvailability]);

  // Total capacity of selected quantity of rooms
  const totalCapacity = roomType ? roomType.capacity * Math.max(1, quantity) : 2;

  // Auto-adjust guests if it exceeds total capacity
  useEffect(() => {
    if (totalCapacity > 0 && guests > totalCapacity) {
      setGuests(totalCapacity);
    }
  }, [totalCapacity, guests]);

  const nights = calculateNights(checkIn, checkOut);
  const safeQuantity = Math.max(0, quantity);
  const totalPrice = roomType ? roomType.basePrice * nights * safeQuantity : 0;
  const depositAmount = Math.round(totalPrice * 0.5);

  const handleProceedToCheckout = () => {
    if (isPastDate(checkIn)) {
      showToast('Ngày nhận phòng không được ở trong quá khứ! Vui lòng chọn từ hôm nay trở đi.', 'error');
      setCheckIn(today);
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      showToast('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm!', 'warning');
      return;
    }
    if (availableRoomsCount === 0 || quantity <= 0) {
      showToast('Rất tiếc, loại phòng này đã hết phòng trống trong khoảng thời gian đã chọn. Vui lòng chọn ngày khác!', 'error');
      return;
    }
    if (availableRoomsCount !== null && quantity > availableRoomsCount) {
      showToast(`Số phòng muốn đặt (${quantity} phòng) vượt quá số phòng còn trống (${availableRoomsCount} phòng)!`, 'error');
      return;
    }
    if (guests > totalCapacity) {
      showToast(`Số khách (${guests} người) vượt quá tổng sức chứa tối đa (${totalCapacity} người cho ${quantity} phòng)!`, 'error');
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
          <span className="capacity-badge">👤 Tối đa {roomType.capacity} khách / phòng</span>
          {hasVirtualTour(roomType.id) && (
            <button
              type="button"
              className="btn-open-virtual-tour"
              onClick={() => setIsTourOpen(true)}
              title="Tham quan phòng thực tế ảo 360°"
            >
              <Compass size={18} />
              <span>Tham quan phòng 360°</span>
            </button>
          )}
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
                <strong>💳 Quy chuẩn đặt cọc:</strong> Thanh toán tiền cọc <strong>50% tổng tiền phòng</strong> khi đặt trực tuyến (giữ phòng trong 15 phút để hoàn tất thanh toán).
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
                  min={today}
                  onChange={(e) => {
                    const newIn = e.target.value;
                    setCheckIn(newIn);
                    if (newIn && !isPastDate(newIn)) {
                      if (!checkOut || newIn >= checkOut) {
                        setCheckOut(addDays(newIn, 1));
                      }
                    }
                  }}
                  onBlur={() => {
                    if (!checkIn || isPastDate(checkIn)) {
                      showToast('Ngày nhận phòng phải từ hôm nay trở đi!', 'warning');
                      const safeIn = today;
                      setCheckIn(safeIn);
                      if (!checkOut || safeIn >= checkOut) {
                        setCheckOut(addDays(safeIn, 1));
                      }
                    }
                  }}
                  required
                />
              </div>

              <div className="form-field">
                <label>Ngày trả phòng (Check-out 12:00)</label>
                <input
                  type="date"
                  value={checkOut}
                  min={addDays(checkIn || today, 1)}
                  onChange={(e) => setCheckOut(e.target.value)}
                  onBlur={() => {
                    const minOut = addDays(checkIn || today, 1);
                    if (!checkOut || checkOut < minOut) {
                      setCheckOut(minOut);
                    }
                  }}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>Số khách ({totalCapacity} tối đa)</label>
                  <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                    {Array.from({ length: totalCapacity }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} Khách {num === totalCapacity ? '(Tối đa)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>
                    Số phòng {availableRoomsCount !== null ? `(Tối đa: ${availableRoomsCount})` : ''}
                  </label>
                  {checkingAvailability ? (
                    <select disabled className="select-disabled">
                      <option>Đang tính phòng trống...</option>
                    </select>
                  ) : availableRoomsCount === 0 ? (
                    <select disabled className="select-disabled" value="0">
                      <option value="0">0 Phòng (Hết phòng)</option>
                    </select>
                  ) : (
                    <select
                      value={quantity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQuantity(val);
                      }}
                    >
                      {Array.from({ length: availableRoomsCount || 1 }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num} Phòng {num === availableRoomsCount ? '(Tối đa)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Real-time Availability Quota Badge */}
              <div style={{ marginBottom: '0.85rem' }}>
                {checkingAvailability ? (
                  <span className="quota-tag" style={{ background: '#F1F5F9', color: '#475569' }}>
                    ⏳ Đang kiểm tra số lượng phòng trống khả dụng...
                  </span>
                ) : availableRoomsCount === 0 ? (
                  <span className="quota-tag red" style={{ display: 'block', padding: '0.5rem 0.75rem', lineHeight: 1.4 }}>
                    ✕ Rất tiếc, loại phòng này đã <strong>hết phòng trống</strong> trong khoảng thời gian đã chọn ({checkIn} → {checkOut}). Vui lòng đổi ngày lưu trú hoặc chọn loại phòng khác.
                  </span>
                ) : availableRoomsCount !== null ? (
                  <span className="quota-tag green">
                    ✓ Còn <strong>{availableRoomsCount}</strong> phòng trống khả dụng ({checkIn} → {checkOut})
                  </span>
                ) : null}
              </div>

              {/* Price Calculation Summary */}
              <div className="price-breakdown-card">
                <div className="breakdown-line">
                  <span>
                    {roomType.basePrice.toLocaleString('vi-VN')}đ × {nights} đêm × {safeQuantity} phòng
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

              <button
                className="btn-proceed-booking"
                disabled={checkingAvailability || availableRoomsCount === 0 || safeQuantity === 0}
                onClick={handleProceedToCheckout}
              >
                {checkingAvailability
                  ? 'Đang kiểm tra phòng trống...'
                  : availableRoomsCount === 0 || safeQuantity === 0
                  ? 'Tạm hết phòng trong đợt này'
                  : `Tiến hành Đặt phòng (${safeQuantity} phòng)`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 360 Virtual Tour Modal */}
      {hasVirtualTour(roomType.id) && (
        <RoomVirtualTour
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          roomType={roomType}
          onProceedToBooking={handleProceedToCheckout}
          bookingDisabled={checkingAvailability || availableRoomsCount === 0 || safeQuantity === 0}
        />
      )}
    </div>
  );
}

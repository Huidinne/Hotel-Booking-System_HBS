import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { roomService, DEFAULT_ROOM_IMAGE } from '../../services/roomService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';

export function RoomCatalogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search filter state
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '2026-10-25');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '2026-10-27');
  const [guests, setGuests] = useState(Number(searchParams.get('guests')) || 2);
  const [quantity, setQuantity] = useState(Number(searchParams.get('quantity')) || 1);

  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Compute number of nights
  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
  );

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await roomService.searchAvailableRooms({
        checkIn,
        checkOut,
        guests,
        quantity,
      });
      setAvailableRooms(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [checkIn, checkOut, guests, quantity]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ checkIn, checkOut, guests: String(guests), quantity: String(quantity) });
    fetchRooms();
  };

  return (
    <div className="catalog-page-container">
      {/* Search Header Banner */}
      <div className="catalog-search-banner">
        <h2>Tra cứu & Tìm kiếm phòng trống</h2>
        <p>Kiểm tra tình trạng buồng phòng theo khoảng ngày lưu trú và số lượng phòng</p>

        <form className="catalog-filter-bar" onSubmit={handleFilterSubmit}>
          <div className="filter-group">
            <label>Ngày nhận phòng</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
            />
          </div>

          <div className="filter-group">
            <label>Ngày trả phòng</label>
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              required
            />
          </div>

          <div className="filter-group">
            <label>Số khách</label>
            <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
              <option value="1">1 Khách</option>
              <option value="2">2 Khách</option>
              <option value="4">4 Khách</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Số lượng phòng (N)</label>
            <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
              <option value="1">1 Phòng</option>
              <option value="2">2 Phòng</option>
              <option value="3">3 Phòng</option>
            </select>
          </div>

          <button type="submit" className="btn-filter-apply">
            Cập nhật kết quả
          </button>
        </form>
      </div>

      {/* Catalog Results */}
      <div className="catalog-content">
        <div className="results-info-bar">
          <span>
            Tìm thấy <strong>{availableRooms.length}</strong> loại phòng cho {nights} đêm lưu trú ({checkIn} → {checkOut})
          </span>
          <span className="policy-pill">Giờ Check-in chuẩn: 14:00 | Check-out: 12:00</span>
        </div>

        {loading ? (
          <LoadingSpinner text="Đang tính toán số lượng phòng khả dụng theo khoảng ngày..." />
        ) : availableRooms.length === 0 ? (
          <EmptyState
            icon="🏨"
            title="Không tìm thấy phòng phù hợp"
            message="Rất tiếc, không có loại phòng nào đáp ứng số lượng khách hoặc khoảng ngày bạn đã chọn. Vui lòng thay đổi tiêu chí tìm kiếm."
            actionText="Xem tất cả loại phòng"
            onAction={() => {
              setGuests(1);
              setQuantity(1);
            }}
          />
        ) : (
          <div className="catalog-rooms-list">
            {availableRooms.map((room) => {
              const totalPrice = room.basePrice * nights * quantity;
              const depositPrice = Math.round(totalPrice * 0.5);

              return (
                <div key={room.roomTypeId} className="catalog-room-row-card">
                  <div className="room-thumb-col">
                    <img
                      src={room.imageUrls?.[0] || DEFAULT_ROOM_IMAGE}
                      alt={room.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_ROOM_IMAGE;
                      }}
                    />
                  </div>

                  <div className="room-detail-col">
                    <div className="room-top-info">
                      <h3>{room.name}</h3>
                      <span className="room-capacity-tag">👤 Tối đa {room.capacity} Khách</span>
                    </div>

                    <p className="room-desc-excerpt">{room.description}</p>

                    <div className="room-amenities-tags">
                      {room.amenities.map((item, idx) => (
                        <span key={idx} className="amenity-tag">
                          ✓ {item}
                        </span>
                      ))}
                    </div>

                    <div className="availability-notice">
                      {room.available ? (
                        <span className="quota-tag green">
                          ✓ Còn <strong>{room.availableRooms}</strong> phòng khả dụng cho đợt này
                        </span>
                      ) : (
                        <span className="quota-tag red">
                          ✕ Hết phòng trống (Chỉ còn {room.availableRooms} phòng, bạn yêu cầu {quantity} phòng)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="room-pricing-col">
                    <div className="price-box">
                      <span className="price-label">Giá mỗi đêm:</span>
                      <span className="unit-price">
                        {room.basePrice.toLocaleString('vi-VN')} VNĐ
                      </span>
                      <div className="total-calculation">
                        <span>Tổng {nights} đêm ({quantity} phòng):</span>
                        <strong>{totalPrice.toLocaleString('vi-VN')} VNĐ</strong>
                      </div>
                      <div className="deposit-preview">
                        <span>Cọc 50% giữ chỗ:</span>
                        <strong className="deposit-val">{depositPrice.toLocaleString('vi-VN')} VNĐ</strong>
                      </div>
                    </div>

                    <button
                      className="btn-select-room"
                      disabled={!room.available}
                      onClick={() =>
                        navigate(
                          `/rooms/${room.roomTypeId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&quantity=${quantity}`
                        )
                      }
                    >
                      {room.available ? 'Xem chi tiết & Đặt' : 'Tạm hết phòng'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

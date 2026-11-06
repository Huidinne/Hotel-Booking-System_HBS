import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Calendar,
  Users,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Maximize2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { roomService, DEFAULT_ROOM_IMAGE } from '../../services/roomService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  getTodayString,
  addDays,
  calculateNights,
  getValidCheckInDate,
  getValidCheckOutDate,
  isPastDate,
} from '../../utils/dateUtils';

export function RoomCatalogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const today = getTodayString();
  const rawCheckIn = searchParams.get('checkIn');
  const rawCheckOut = searchParams.get('checkOut');
  const hasUrlSearch = Boolean(rawCheckIn && rawCheckOut);

  const initialCheckIn = getValidCheckInDate(rawCheckIn);
  const initialCheckOut = getValidCheckOutDate(rawCheckOut, initialCheckIn);

  // Form input state (persisted across open/close of form)
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(Number(searchParams.get('guests')) || 2);
  const [quantity, setQuantity] = useState(Number(searchParams.get('quantity')) || 1);

  // Search form collapsible state (collapsed by default)
  const [isSearchFormOpen, setIsSearchFormOpen] = useState(false);

  // Mode: Has user searched or did they arrive with search query params?
  const [hasSearched, setHasSearched] = useState(hasUrlSearch);

  // Room data states
  const [allRoomTypes, setAllRoomTypes] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Compute number of nights
  const nights = calculateNights(checkIn, checkOut);

  // Helper for area
  const getRoomArea = (room) => {
    if (room.area) return `${room.area} m²`;
    if (room.capacity === 1) return '28 m²';
    if (room.capacity === 2) return '45 m²';
    if (room.capacity <= 4) return '85 m²';
    return '120 m²';
  };

  // Load all room types for initial exploration view
  const fetchAllRoomTypes = async () => {
    setLoading(true);
    try {
      const data = await roomService.getRoomTypes();
      setAllRoomTypes(data.filter((r) => r.isActive !== false));
    } catch (err) {
      console.error('Failed to load room types:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search available rooms according to criteria
  const fetchAvailableRooms = async (inDate = checkIn, outDate = checkOut, gCount = guests, qCount = quantity) => {
    setLoading(true);
    try {
      const data = await roomService.searchAvailableRooms({
        checkIn: inDate,
        checkOut: outDate,
        guests: gCount,
        quantity: qCount,
      });
      setAvailableRooms(data);
    } catch (err) {
      console.error('Failed to search available rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize on mount or when searchParams change
  useEffect(() => {
    const qIn = searchParams.get('checkIn');
    const qOut = searchParams.get('checkOut');
    const hasSearch = Boolean(qIn && qOut);

    if (hasSearch) {
      setHasSearched(true);
      const safeIn = getValidCheckInDate(qIn);
      const safeOut = getValidCheckOutDate(qOut, safeIn);
      const g = Number(searchParams.get('guests')) || 2;
      const q = Number(searchParams.get('quantity')) || 1;
      setCheckIn(safeIn);
      setCheckOut(safeOut);
      setGuests(g);
      setQuantity(q);
      fetchAvailableRooms(safeIn, safeOut, g, q);
    } else {
      setHasSearched(false);
      fetchAllRoomTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Form submit handler
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    const safeCheckIn = isPastDate(checkIn) ? today : checkIn;
    const safeCheckOut = getValidCheckOutDate(checkOut, safeCheckIn);
    setCheckIn(safeCheckIn);
    setCheckOut(safeCheckOut);
    setHasSearched(true);
    setSearchParams({
      checkIn: safeCheckIn,
      checkOut: safeCheckOut,
      guests: String(guests),
      quantity: String(quantity),
    });
    fetchAvailableRooms(safeCheckIn, safeCheckOut, guests, quantity);
  };

  // Reset to default explore all rooms view
  const handleResetToAllRooms = () => {
    setHasSearched(false);
    setSearchParams({});
    fetchAllRoomTypes();
  };

  return (
    <div className="catalog-page-container">
      {/* =========================================================================
         1. PAGE HEADER & TITLE (Khám Phá Phòng)
         ========================================================================= */}
      <div className="catalog-header-section">
        <span className="catalog-gold-subtitle">BỘ SƯU TẬP PHÒNG NGHỈ THƯỢNG LƯU</span>
        <h1 className="catalog-page-title">Khám phá phòng</h1>
        <div className="catalog-gold-separator" />
        <p className="catalog-lead-text">
          Trải nghiệm không gian lưu trú sang trọng bậc nhất tại Grand Aurora với thiết kế tân cổ điển tinh xảo,
          ban công riêng hướng trọn cảnh quan và chuẩn mực phục vụ 5 sao quốc tế.
        </p>

        {/* Nút hành động nổi bật: Tìm kiếm phòng trống */}
        <div className="catalog-search-trigger-bar">
          <button
            type="button"
            className={`btn-catalog-search-toggle ${isSearchFormOpen ? 'active' : ''}`}
            onClick={() => setIsSearchFormOpen(!isSearchFormOpen)}
            aria-expanded={isSearchFormOpen}
          >
            <Search size={18} />
            <span>{isSearchFormOpen ? 'Thu gọn bộ lọc tra cứu' : 'Tìm kiếm phòng trống'}</span>
            {isSearchFormOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* =========================================================================
         2. KHU VỰC TRA CỨU & TÌM KIẾM PHÒNG TRỐNG (Collapsible Form)
         ========================================================================= */}
      {isSearchFormOpen && (
        <div className="catalog-search-collapsible-panel">
          <div className="catalog-search-banner">
            <div className="catalog-search-banner-top">
              <div className="search-banner-title-box">
                <Sparkles size={22} className="text-gold" />
                <div>
                  <h2>Tra cứu & Tìm kiếm phòng trống</h2>
                  <p>Kiểm tra tình trạng buồng phòng theo khoảng ngày lưu trú và số lượng phòng</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-search-panel"
                onClick={() => setIsSearchFormOpen(false)}
                title="Thu gọn bộ lọc"
              >
                <X size={18} />
                <span>Thu gọn</span>
              </button>
            </div>

            <form className="catalog-filter-bar" onSubmit={handleFilterSubmit}>
              <div className="filter-group">
                <label>
                  <Calendar size={14} /> Ngày nhận phòng (Check-in 14:00)
                </label>
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

              <div className="filter-group">
                <label>
                  <Calendar size={14} /> Ngày trả phòng (Check-out 12:00)
                </label>
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

              <div className="filter-group">
                <label>
                  <Users size={14} /> Số khách
                </label>
                <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                  <option value="1">1 Khách</option>
                  <option value="2">2 Khách (Tiêu chuẩn)</option>
                  <option value="3">3 Khách</option>
                  <option value="4">4 Khách (Gia đình)</option>
                  <option value="6">6 Khách (Đoàn nhỏ)</option>
                  <option value="8">8 Khách (Đoàn lớn)</option>
                  <option value="10">10 Khách</option>
                </select>
              </div>

              <div className="filter-group">
                <label>
                  <Award size={14} /> Số lượng phòng (N)
                </label>
                <select value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} Phòng
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-actions-group">
                <button type="submit" className="btn-filter-apply">
                  <Search size={16} />
                  <span>Cập nhật kết quả</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         3. DANH SÁCH PHÒNG & KẾT QUẢ TÌM KIẾM
         ========================================================================= */}
      <div className="catalog-content">
        {hasSearched ? (
          /* TRẠNG THÁI KẾT QUẢ TÌM KIẾM THEO TIÊU CHÍ */
          <>
            <div className="results-info-bar">
              <div className="results-summary-info">
                <span>
                  Tìm thấy <strong>{availableRooms.length}</strong> loại phòng cho {nights} đêm lưu trú ({checkIn} → {checkOut})
                </span>
                <button
                  type="button"
                  className="btn-reset-view-all"
                  onClick={handleResetToAllRooms}
                  title="Xem toàn bộ danh mục phòng"
                >
                  <RotateCcw size={13} />
                  <span>Xem tất cả loại phòng</span>
                </button>
              </div>
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
                onAction={handleResetToAllRooms}
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
                        <div className="room-thumb-badges">
                          <span className="badge-area">
                            <Maximize2 size={12} />
                            {getRoomArea(room)}
                          </span>
                          <span className="badge-capacity">
                            <Users size={12} />
                            Tối đa {room.capacity} khách
                          </span>
                        </div>
                      </div>

                      <div className="room-detail-col">
                        <div className="room-spec-mini-row">
                          <span>Diện tích: {getRoomArea(room)}</span>
                          <span>•</span>
                          <span>Sức chứa: {room.capacity} người lớn</span>
                        </div>
                        <div className="room-top-info">
                          <h3>{room.name}</h3>
                        </div>

                        <p className="room-desc-excerpt">{room.description}</p>

                        <div className="room-amenities-tags">
                          {(room.amenities || []).map((item, idx) => (
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
                            {room.basePrice.toLocaleString('vi-VN')} <small>VNĐ</small>
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

                        <div className="catalog-card-action-btns">
                          <button
                            className="btn-select-room"
                            disabled={room.availableRooms <= 0}
                            onClick={() => {
                              const targetQty = room.availableRooms < quantity ? room.availableRooms : quantity;
                              navigate(
                                `/rooms/${room.roomTypeId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&quantity=${targetQty}`
                              );
                            }}
                          >
                            <span>
                              {room.availableRooms <= 0
                                ? 'Tạm hết phòng'
                                : room.availableRooms < quantity
                                ? `Đặt ${room.availableRooms} phòng còn trống`
                                : 'Xem chi tiết & Đặt'}
                            </span>
                            {room.availableRooms > 0 && <ArrowRight size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* TRẠNG THÁI KHÁM PHÁ BAN ĐẦU (HIỂN THỊ ĐẦY ĐỦ CÁC LOẠI PHÒNG ĐANG KINH DOANH) */
          <>
            <div className="results-info-bar">
              <span className="catalog-status-lead">
                Đang hiển thị đầy đủ <strong>{allRoomTypes.length}</strong> hạng phòng nghỉ dưỡng tiêu biểu
              </span>
              <span className="policy-pill">Dịch vụ quản gia 24/7 | Tiêu chuẩn 5 sao</span>
            </div>

            {loading ? (
              <LoadingSpinner text="Đang tải danh mục các hạng phòng nghỉ dưỡng..." />
            ) : (
              <div className="catalog-rooms-list">
                {allRoomTypes.map((room) => {
                  const img = room.images?.[0] || DEFAULT_ROOM_IMAGE;
                  return (
                    <div key={room.id} className="catalog-room-row-card">
                      <div className="room-thumb-col">
                        <img
                          src={img}
                          alt={room.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = DEFAULT_ROOM_IMAGE;
                          }}
                        />
                        <div className="room-thumb-badges">
                          <span className="badge-area">
                            <Maximize2 size={12} />
                            {getRoomArea(room)}
                          </span>
                          <span className="badge-capacity">
                            <Users size={12} />
                            Tối đa {room.capacity} khách
                          </span>
                        </div>
                      </div>

                      <div className="room-detail-col">
                        <div className="room-spec-mini-row">
                          <span>Diện tích: {getRoomArea(room)}</span>
                          <span>•</span>
                          <span>Sức chứa: {room.capacity} người lớn</span>
                        </div>
                        <div className="room-top-info">
                          <h3>{room.name}</h3>
                        </div>

                        <p className="room-desc-excerpt">{room.description}</p>

                        <div className="room-amenities-tags">
                          {(room.amenities || []).map((item, idx) => (
                            <span key={idx} className="amenity-tag">
                              ✓ {item}
                            </span>
                          ))}
                        </div>

                        <div className="availability-notice">
                          <span className="quota-tag green">
                            ✓ Đang mở bán trực tuyến • Nhận phòng 14:00
                          </span>
                        </div>
                      </div>

                      <div className="room-pricing-col">
                        <div className="price-box">
                          <span className="price-label">Giá niêm yết mỗi đêm:</span>
                          <span className="unit-price">
                            {room.basePrice.toLocaleString('vi-VN')} <small>VNĐ</small>
                          </span>
                          <div className="deposit-preview">
                            <span>Chính sách cọc:</span>
                            <span className="deposit-info-note">50% khi xác nhận đặt phòng</span>
                          </div>
                        </div>

                        <div className="catalog-card-action-btns">
                          <button
                            className="btn-select-room"
                            onClick={() => {
                              navigate(
                                `/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&quantity=${quantity}`
                              );
                            }}
                          >
                            <span>Xem chi tiết & Đặt</span>
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

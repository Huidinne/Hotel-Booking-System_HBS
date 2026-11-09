import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Calendar,
  Users,
  Maximize2,
  ArrowRight,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  Wifi,
  Wind,
  Bath,
  Coffee,
  Tv,
  BedDouble,
  ShieldCheck,
  X,
  AlertCircle,
} from 'lucide-react';
import { roomService, DEFAULT_ROOM_IMAGE } from '../../services/roomService';
import {
  getTodayString,
  addDays,
  calculateNights,
  getValidCheckInDate,
  getValidCheckOutDate,
  isPastDate,
} from '../../utils/dateUtils';

const ITEMS_PER_PAGE = 5;
const PRICE_STEP = 50000; // Bước nhảy 50.000 VNĐ

// Helper: ánh xạ icon tương ứng với tiện nghi
function getAmenityIcon(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('wifi') || lower.includes('mạng')) return <Wifi size={13} />;
  if (lower.includes('lạnh') || lower.includes('điều hòa') || lower.includes('air')) return <Wind size={13} />;
  if (lower.includes('bồn tắm') || lower.includes('jacuzzi') || lower.includes('tắm')) return <Bath size={13} />;
  if (lower.includes('ban công') || lower.includes('tầm nhìn') || lower.includes('view')) return <Maximize2 size={13} />;
  if (lower.includes('bar') || lower.includes('trà') || lower.includes('cà phê') || lower.includes('coffee')) return <Coffee size={13} />;
  if (lower.includes('tv') || lower.includes('truyền hình')) return <Tv size={13} />;
  return <Check size={13} />;
}

// Helper: hiển thị thông số giường ước tính theo sức chứa
function getRoomBedInfo(room) {
  const cap = Number(room?.capacity) || 2;
  if (cap === 1) return '1 giường đơn cao cấp';
  if (cap === 2) return '1 giường đôi lớn (King size)';
  if (cap === 3) return '1 giường đôi & 1 giường đơn';
  return '2 giường đôi lớn (Queen size)';
}

// Helper: hiển thị diện tích phòng
function getRoomArea(room) {
  if (room?.area) return `${room.area} m²`;
  const cap = Number(room?.capacity) || 2;
  if (cap === 1) return '28 m²';
  if (cap === 2) return '45 m²';
  if (cap <= 4) return '85 m²';
  return '120 m²';
}

export function RoomCatalogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const today = getTodayString();
  const rawCheckIn = searchParams.get('checkIn');
  const rawCheckOut = searchParams.get('checkOut');

  const initialCheckIn = getValidCheckInDate(rawCheckIn);
  const initialCheckOut = getValidCheckOutDate(rawCheckOut, initialCheckIn);

  // Form search state (mặc định lấy ngày hôm nay và ngày mai nếu không có trên URL)
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(Number(searchParams.get('guests')) || 2);
  const [quantity, setQuantity] = useState(Number(searchParams.get('quantity')) || 1);

  // Filter states
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(5000000);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sortBy, setSortBy] = useState('DEFAULT');

  // UI state
  const [showAllAmenitiesInSidebar, setShowAllAmenitiesInSidebar] = useState(false);
  const [modalRoomAmenities, setModalRoomAmenities] = useState(null);
  const [activeImageIndexes, setActiveImageIndexes] = useState({});
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Pagination & Data Loading
  const [currentPage, setCurrentPage] = useState(1);
  const [allRoomTypes, setAllRoomTypes] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const nights = calculateNights(checkIn, checkOut);

  // Tải dữ liệu phòng thực tế từ Backend API (Không hardcode)
  const fetchCatalogData = useCallback(async (inDate, outDate, gCount, qCount) => {
    setLoading(true);
    setFetchError(null);
    try {
      const [roomTypesData, availabilityData] = await Promise.all([
        roomService.getRoomTypes().catch((err) => {
          console.warn('[RoomCatalogPage] Lỗi lấy getRoomTypes:', err.message);
          return [];
        }),
        roomService.searchAvailableRooms({
          checkIn: inDate,
          checkOut: outDate,
          guests: gCount,
          quantity: qCount,
        }),
      ]);

      const activeTypes = (roomTypesData || []).filter((r) => r.isActive !== false);
      setAllRoomTypes(activeTypes);
      setAvailableRooms(availabilityData || []);
    } catch (err) {
      console.error('[RoomCatalogPage] Lỗi tra cứu tình trạng phòng:', err);
      setFetchError(err.message || 'Không thể tải dữ liệu tình trạng phòng trống từ hệ thống.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Khởi động và đồng bộ khi URL searchParams thay đổi
  useEffect(() => {
    const qIn = searchParams.get('checkIn');
    const qOut = searchParams.get('checkOut');
    const safeIn = getValidCheckInDate(qIn);
    const safeOut = getValidCheckOutDate(qOut, safeIn);
    const g = Number(searchParams.get('guests')) || 2;
    const q = Number(searchParams.get('quantity')) || 1;

    setCheckIn(safeIn);
    setCheckOut(safeOut);
    setGuests(g);
    setQuantity(q);

    // Luôn gọi API searchAvailableRooms với ngày hợp lệ để nhận số phòng khả dụng thực tế từ Database
    fetchCatalogData(safeIn, safeOut, g, q);
  }, [searchParams, fetchCatalogData]);

  // Trích xuất danh sách tiện nghi thực tế từ Database
  const availableAmenitiesList = useMemo(() => {
    const set = new Set();
    allRoomTypes.forEach((room) => {
      if (Array.isArray(room.amenities)) {
        room.amenities.forEach((a) => {
          if (a && typeof a === 'string' && a.trim()) {
            set.add(a.trim());
          }
        });
      }
    });
    return Array.from(set).sort();
  }, [allRoomTypes]);

  // Trích xuất hạng phòng thực tế từ tên các loại phòng
  const availableCategoriesList = useMemo(() => {
    const set = new Set();
    allRoomTypes.forEach((room) => {
      const name = String(room.name || '');
      if (/standard/i.test(name)) set.add('Standard');
      else if (/deluxe/i.test(name)) set.add('Deluxe');
      else if (/suite/i.test(name)) set.add('Suite');
      else if (/family/i.test(name)) set.add('Family');
      else if (name.trim()) set.add(name.trim());
    });
    return Array.from(set);
  }, [allRoomTypes]);

  // Giới hạn giá sàn và giá trần động từ dữ liệu phòng thực tế
  const priceLimits = useMemo(() => {
    if (allRoomTypes.length === 0) return { min: 0, max: 5000000 };
    const prices = allRoomTypes.map((r) => Number(r.basePrice) || 0).filter((p) => p > 0);
    const maxVal = prices.length > 0 ? Math.max(...prices) : 5000000;
    return {
      min: 0,
      max: Math.max(3000000, Math.ceil(maxVal / 500000) * 500000),
    };
  }, [allRoomTypes]);

  // Đồng bộ maxPrice ban đầu nếu chưa được gán
  useEffect(() => {
    if (priceLimits.max && maxPrice === 5000000 && priceLimits.max !== 5000000) {
      setMaxPrice(priceLimits.max);
    }
  }, [priceLimits.max, maxPrice]);

  // Đếm số lượng bộ lọc đang được người dùng áp dụng
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (minPrice > 0) count++;
    if (maxPrice < priceLimits.max) count++;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    if (selectedAmenities.length > 0) count += selectedAmenities.length;
    return count;
  }, [minPrice, maxPrice, priceLimits.max, selectedCategories, selectedAmenities]);

  // Xử lý bộ lọc
  const handleToggleAmenity = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
    setCurrentPage(1);
  };

  const handleToggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
    setCurrentPage(1);
  };

  // Kéo Dual Range Slider: Min Price
  const handleMinSliderChange = (e) => {
    const value = Number(e.target.value);
    const newMin = Math.min(value, maxPrice - PRICE_STEP);
    setMinPrice(Math.max(priceLimits.min, newMin));
    setCurrentPage(1);
  };

  // Kéo Dual Range Slider: Max Price
  const handleMaxSliderChange = (e) => {
    const value = Number(e.target.value);
    const newMax = Math.max(value, minPrice + PRICE_STEP);
    setMaxPrice(Math.min(priceLimits.max, newMax));
    setCurrentPage(1);
  };

  // Nhập trực tiếp ô giá tối thiểu
  const handleMinInputChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) || 0;
    if (num <= maxPrice - PRICE_STEP) {
      setMinPrice(Math.max(priceLimits.min, num));
    } else {
      setMinPrice(maxPrice - PRICE_STEP);
    }
    setCurrentPage(1);
  };

  // Nhập trực tiếp ô giá tối đa
  const handleMaxInputChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) || 0;
    if (num >= minPrice + PRICE_STEP) {
      setMaxPrice(Math.min(priceLimits.max, num));
    } else {
      setMaxPrice(minPrice + PRICE_STEP);
    }
    setCurrentPage(1);
  };

  // Submit form tra cứu ngày & số lượng phòng
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const safeCheckIn = isPastDate(checkIn) ? today : checkIn;
    const safeCheckOut = getValidCheckOutDate(checkOut, safeCheckIn);
    setCheckIn(safeCheckIn);
    setCheckOut(safeCheckOut);
    setCurrentPage(1);
    setIsMobileFilterOpen(false);

    setSearchParams({
      checkIn: safeCheckIn,
      checkOut: safeCheckOut,
      guests: String(guests),
      quantity: String(quantity),
    });

    fetchCatalogData(safeCheckIn, safeCheckOut, guests, quantity);
  };

  // Đặt lại bộ lọc giá và tiện nghi
  const handleResetFilters = () => {
    setMinPrice(priceLimits.min);
    setMaxPrice(priceLimits.max);
    setSelectedCategories([]);
    setSelectedAmenities([]);
    setSortBy('DEFAULT');
    setCurrentPage(1);
  };

  // Đặt lại toàn bộ cả tìm kiếm và bộ lọc về mặc định
  const handleResetAll = () => {
    handleResetFilters();
    const defaultIn = today;
    const defaultOut = addDays(today, 1);
    setCheckIn(defaultIn);
    setCheckOut(defaultOut);
    setGuests(2);
    setQuantity(1);
    setSearchParams({});
    fetchCatalogData(defaultIn, defaultOut, 2, 1);
  };

  // Chuyển ảnh trong card
  const handleNextImage = (e, roomId, totalImages) => {
    e.stopPropagation();
    setActiveImageIndexes((prev) => ({
      ...prev,
      [roomId]: ((prev[roomId] || 0) + 1) % totalImages,
    }));
  };

  const handlePrevImage = (e, roomId, totalImages) => {
    e.stopPropagation();
    setActiveImageIndexes((prev) => ({
      ...prev,
      [roomId]: ((prev[roomId] || 0) - 1 + totalImages) % totalImages,
    }));
  };

  // Xử lý dữ liệu phòng: ánh xạ số lượng phòng khả dụng thực tế 100% từ Backend
  const rawRoomList = useMemo(() => {
    // 1. Nếu Backend trả về kết quả tra cứu availability từ searchAvailableRooms:
    if (availableRooms.length > 0) {
      return availableRooms.map((avail) => {
        const fullDetails = allRoomTypes.find((r) => r.id === avail.roomTypeId) || {};
        const realAvail = Number(avail.availableRooms !== undefined ? avail.availableRooms : 0);

        return {
          ...fullDetails,
          ...avail,
          id: avail.roomTypeId || fullDetails.id,
          name: avail.name || fullDetails.name,
          basePrice: avail.basePrice || fullDetails.basePrice || 0,
          capacity: avail.capacity || fullDetails.capacity || 2,
          images: avail.imageUrls || fullDetails.images || [],
          amenities: avail.amenities || fullDetails.amenities || [],
          description: avail.description || fullDetails.description || '',
          // Lấy đúng số phòng khả dụng từ Backend, tuyệt đối KHÔNG hardcode || 5
          availableRooms: realAvail,
          isAvailable: Boolean(avail.available && realAvail >= quantity),
        };
      });
    }

    // 2. Nếu Backend chưa kịp load xong hoặc kết quả rỗng:
    if (allRoomTypes.length > 0) {
      return allRoomTypes.map((room) => ({
        ...room,
        availableRooms: 0,
        isAvailable: false,
      }));
    }

    return [];
  }, [availableRooms, allRoomTypes, quantity]);

  // Bộ lọc kết hợp Client-Side (Giá min-max, Hạng phòng, Tiện nghi, Sắp xếp)
  const filteredRooms = useMemo(() => {
    let result = rawRoomList.filter((room) => {
      const price = Number(room.basePrice) || 0;
      const roomName = String(room.name || '').toLowerCase();

      // 1. Bộ lọc khoảng giá (minPrice <= price <= maxPrice)
      if (price < minPrice || price > maxPrice) {
        return false;
      }

      // 2. Bộ lọc hạng phòng
      if (selectedCategories.length > 0) {
        const matchesCategory = selectedCategories.some((cat) =>
          roomName.includes(cat.toLowerCase())
        );
        if (!matchesCategory) return false;
      }

      // 3. Bộ lọc tiện nghi
      if (selectedAmenities.length > 0) {
        const roomAmenities = Array.isArray(room.amenities) ? room.amenities : [];
        const hasAll = selectedAmenities.every((selected) =>
          roomAmenities.some((item) => item.toLowerCase() === selected.toLowerCase())
        );
        if (!hasAll) return false;
      }

      return true;
    });

    // 4. Sắp xếp
    if (sortBy === 'PRICE_ASC') {
      result.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortBy === 'PRICE_DESC') {
      result.sort((a, b) => b.basePrice - a.basePrice);
    } else if (sortBy === 'CAPACITY_DESC') {
      result.sort((a, b) => b.capacity - a.capacity);
    } else if (sortBy === 'AREA_DESC') {
      result.sort((a, b) => (parseInt(getRoomArea(b)) || 0) - (parseInt(getRoomArea(a)) || 0));
    }

    return result;
  }, [rawRoomList, minPrice, maxPrice, selectedCategories, selectedAmenities, sortBy]);

  // Phân trang
  const totalItems = filteredRooms.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRooms.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRooms, currentPage]);

  // Tính phần trăm vị trí thanh trượt Dual Range Slider
  const sliderMinPercent = useMemo(() => {
    const range = priceLimits.max - priceLimits.min;
    if (range <= 0) return 0;
    return Math.min(100, Math.max(0, ((minPrice - priceLimits.min) / range) * 100));
  }, [minPrice, priceLimits]);

  const sliderMaxPercent = useMemo(() => {
    const range = priceLimits.max - priceLimits.min;
    if (range <= 0) return 100;
    return Math.min(100, Math.max(0, ((maxPrice - priceLimits.min) / range) * 100));
  }, [maxPrice, priceLimits]);

  return (
    <div className="luxury-catalog-wrapper">
      {/* 1. Header Section */}
      <div className="luxury-catalog-header">
        <div className="header-inner-container">
          <div className="header-titles">
            <span className="header-gold-tag">GRAND AURORA LUXURY HOTEL</span>
            <h1 className="header-title-text">Khám phá phòng nghỉ</h1>
            <p className="header-desc-text">
              Lựa chọn không gian nghỉ dưỡng lý tưởng với chuẩn mực dịch vụ 5 sao quốc tế tại Grand Aurora.
            </p>
          </div>

          {/* Nút bật bộ lọc trên Mobile */}
          <div className="mobile-filter-trigger-box">
            <button
              type="button"
              className="btn-mobile-filter-toggle"
              onClick={() => setIsMobileFilterOpen(true)}
            >
              <SlidersHorizontal size={16} />
              <span>Bộ lọc & Tìm kiếm</span>
              {activeFiltersCount > 0 && <span className="mobile-filter-count">{activeFiltersCount}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Layout */}
      <div className="luxury-catalog-main-layout">
        {/* SIDEBAR BÊN TRÁI: FORM TÌM KIẾM & BỘ LỌC */}
        <aside className={`luxury-filter-sidebar ${isMobileFilterOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-card">
            {/* Header Sidebar */}
            <div className="sidebar-card-header">
              <div className="sidebar-title-row">
                <SlidersHorizontal size={18} className="text-gold" />
                <span className="sidebar-title-label">Bộ Lọc & Tra Cứu</span>
                {activeFiltersCount > 0 && (
                  <span className="filter-active-pill">{activeFiltersCount} đang chọn</span>
                )}
              </div>
              <div className="sidebar-header-actions">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    className="btn-text-reset"
                    onClick={handleResetFilters}
                    title="Xóa các bộ lọc giá, hạng phòng và tiện nghi"
                  >
                    Xóa lọc
                  </button>
                )}
                {isMobileFilterOpen && (
                  <button
                    type="button"
                    className="btn-close-mobile-drawer"
                    onClick={() => setIsMobileFilterOpen(false)}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* A. THỜI GIAN LƯU TRÚ & SỐ KHÁCH */}
            <div className="sidebar-section search-section">
              <div className="section-title">
                <Calendar size={14} className="section-title-icon" />
                <span>Thời gian lưu trú</span>
              </div>

              <form onSubmit={handleSearchSubmit} className="sidebar-search-fields">
                <div className="input-group">
                  <label htmlFor="catalog-checkin">Nhận phòng (14:00)</label>
                  <input
                    id="catalog-checkin"
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
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="catalog-checkout">Trả phòng (12:00)</label>
                  <input
                    id="catalog-checkout"
                    type="date"
                    value={checkOut}
                    min={addDays(checkIn || today, 1)}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                  />
                </div>

                <div className="two-cols-row">
                  <div className="input-group">
                    <label htmlFor="catalog-guests">Số khách</label>
                    <select
                      id="catalog-guests"
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                    >
                      <option value="1">1 Khách</option>
                      <option value="2">2 Khách</option>
                      <option value="3">3 Khách</option>
                      <option value="4">4 Khách</option>
                      <option value="6">6 Khách</option>
                      <option value="8">8 Khách</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="catalog-quantity">Số phòng</label>
                    <select
                      id="catalog-quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    >
                      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} Phòng
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-sidebar-search">
                  <Search size={15} />
                  <span>Cập nhật tìm phòng</span>
                </button>
              </form>
            </div>

            {/* B. BỘ LỌC KHOẢNG GIÁ PHÒNG - THANH TRƯỢT HAI ĐẦU (DUAL RANGE SLIDER) */}
            <div className="sidebar-section">
              <div className="section-title">
                <span>Khoảng giá mỗi đêm</span>
              </div>

              {/* Hiển thị khoảng giá hiện tại */}
              <div className="price-range-current-badge">
                <span>{minPrice.toLocaleString('vi-VN')} VNĐ</span>
                <span className="price-dash">–</span>
                <span>{maxPrice.toLocaleString('vi-VN')} VNĐ</span>
              </div>

              {/* Thanh trượt Dual Range Slider hai đầu kéo độc lập */}
              <div className="dual-range-slider-container">
                <div className="dual-slider-track" />
                <div
                  className="dual-slider-highlight"
                  style={{
                    left: `${sliderMinPercent}%`,
                    width: `${sliderMaxPercent - sliderMinPercent}%`,
                  }}
                />
                {/* Nút kéo giá tối thiểu (trái) */}
                <input
                  type="range"
                  min={priceLimits.min}
                  max={priceLimits.max}
                  step={PRICE_STEP}
                  value={minPrice}
                  onChange={handleMinSliderChange}
                  className="dual-range-input input-min"
                  aria-label="Giá tối thiểu"
                />
                {/* Nút kéo giá tối đa (phải) */}
                <input
                  type="range"
                  min={priceLimits.min}
                  max={priceLimits.max}
                  step={PRICE_STEP}
                  value={maxPrice}
                  onChange={handleMaxSliderChange}
                  className="dual-range-input input-max"
                  aria-label="Giá tối đa"
                />
              </div>

              {/* Hai ô nhập giá trị tương ứng bên dưới */}
              <div className="price-inputs-grid">
                <div className="price-input-wrapper">
                  <span className="input-prefix-label">Từ:</span>
                  <input
                    type="text"
                    value={minPrice.toLocaleString('vi-VN')}
                    onChange={handleMinInputChange}
                    className="price-number-input"
                    title="Nhập giá tối thiểu (VNĐ)"
                  />
                  <span className="input-currency-suffix">đ</span>
                </div>

                <div className="price-input-wrapper">
                  <span className="input-prefix-label">Đến:</span>
                  <input
                    type="text"
                    value={maxPrice.toLocaleString('vi-VN')}
                    onChange={handleMaxInputChange}
                    className="price-number-input"
                    title="Nhập giá tối đa (VNĐ)"
                  />
                  <span className="input-currency-suffix">đ</span>
                </div>
              </div>

              {/* Lựa chọn nhanh (Presets) */}
              <div className="price-preset-buttons">
                <button
                  type="button"
                  className={`preset-btn ${minPrice === 0 && maxPrice === 1000000 ? 'active' : ''}`}
                  onClick={() => {
                    setMinPrice(0);
                    setMaxPrice(1000000);
                    setCurrentPage(1);
                  }}
                >
                  Dưới 1 triệu
                </button>
                <button
                  type="button"
                  className={`preset-btn ${minPrice === 1000000 && maxPrice === 2000000 ? 'active' : ''}`}
                  onClick={() => {
                    setMinPrice(1000000);
                    setMaxPrice(2000000);
                    setCurrentPage(1);
                  }}
                >
                  1 – 2 triệu
                </button>
                <button
                  type="button"
                  className={`preset-btn ${minPrice === 2000000 && maxPrice === priceLimits.max ? 'active' : ''}`}
                  onClick={() => {
                    setMinPrice(2000000);
                    setMaxPrice(priceLimits.max);
                    setCurrentPage(1);
                  }}
                >
                  Trên 2 triệu
                </button>
              </div>
            </div>

            {/* C. HẠNG PHÒNG */}
            {availableCategoriesList.length > 0 && (
              <div className="sidebar-section">
                <div className="section-title">
                  <span>Hạng phòng</span>
                </div>
                <div className="checkbox-options-list">
                  {availableCategoriesList.map((cat) => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <label key={cat} className="filter-checkbox-row">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCategory(cat)}
                        />
                        <span className={`custom-checkbox-box ${isChecked ? 'checked' : ''}`}>
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span className="checkbox-text-label">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* D. TIỆN NGHI VÀ DỊCH VỤ */}
            {availableAmenitiesList.length > 0 && (
              <div className="sidebar-section">
                <div className="section-title">
                  <span>Tiện nghi & Dịch vụ</span>
                </div>
                <div className="checkbox-options-list">
                  {(showAllAmenitiesInSidebar
                    ? availableAmenitiesList
                    : availableAmenitiesList.slice(0, 7)
                  ).map((amenity) => {
                    const isChecked = selectedAmenities.includes(amenity);
                    return (
                      <label key={amenity} className="filter-checkbox-row">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAmenity(amenity)}
                        />
                        <span className={`custom-checkbox-box ${isChecked ? 'checked' : ''}`}>
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span className="checkbox-text-label">{amenity}</span>
                      </label>
                    );
                  })}
                </div>

                {availableAmenitiesList.length > 7 && (
                  <button
                    type="button"
                    className="btn-toggle-amenities-expand"
                    onClick={() => setShowAllAmenitiesInSidebar(!showAllAmenitiesInSidebar)}
                  >
                    {showAllAmenitiesInSidebar
                      ? 'Thu gọn tiện nghi'
                      : `+ Xem thêm ${availableAmenitiesList.length - 7} tiện nghi khác`}
                  </button>
                )}
              </div>
            )}

            {/* E. FOOTER ACTIONS */}
            {activeFiltersCount > 0 && (
              <div className="sidebar-footer-actions">
                <button
                  type="button"
                  className="btn-clear-all-filters"
                  onClick={handleResetFilters}
                >
                  <RotateCcw size={14} />
                  <span>Xóa tất cả bộ lọc</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* CỘT PHẢI: KẾT QUẢ DANH SÁCH PHÒNG & THẺ PHÒNG */}
        <main className="luxury-results-column">
          {/* Thanh điều khiển trên cùng: Số lượng kết quả & Dropdown sắp xếp */}
          <div className="results-control-banner">
            <div className="results-count-area">
              <span className="results-total-count">
                Tìm thấy <strong>{filteredRooms.length}</strong> loại phòng phù hợp
              </span>
              <span className="search-stay-pill">
                {nights} đêm: {checkIn} → {checkOut} ({guests} khách)
              </span>
            </div>

            <div className="results-sorter-area">
              <label htmlFor="catalog-sort-select">Sắp xếp:</label>
              <select
                id="catalog-sort-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="DEFAULT">Đề xuất nhiều nhất</option>
                <option value="PRICE_ASC">Giá: Thấp đến cao</option>
                <option value="PRICE_DESC">Giá: Cao đến thấp</option>
                <option value="AREA_DESC">Diện tích lớn nhất</option>
                <option value="CAPACITY_DESC">Sức chứa nhiều nhất</option>
              </select>
            </div>
          </div>

          {/* Trạng thái lỗi tải dữ liệu */}
          {fetchError && (
            <div className="catalog-error-state">
              <AlertCircle size={24} className="text-rose" />
              <div>
                <h4>Đã xảy ra lỗi tải dữ liệu từ máy chủ</h4>
                <p>{fetchError}</p>
              </div>
              <button
                type="button"
                className="btn-retry"
                onClick={() => fetchCatalogData(checkIn, checkOut, guests, quantity)}
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Trạng thái Skeleton Loading */}
          {loading && !fetchError && (
            <div className="cards-skeleton-list">
              {[1, 2, 3].map((n) => (
                <div key={n} className="room-card-skeleton">
                  <div className="skeleton-image-zone" />
                  <div className="skeleton-info-zone">
                    <div className="skeleton-bar title" />
                    <div className="skeleton-bar line" />
                    <div className="skeleton-bar line short" />
                    <div className="skeleton-badges-row">
                      <div className="skeleton-badge" />
                      <div className="skeleton-badge" />
                      <div className="skeleton-badge" />
                    </div>
                  </div>
                  <div className="skeleton-price-zone">
                    <div className="skeleton-bar price" />
                    <div className="skeleton-bar btn" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trạng thái Không tìm thấy phòng */}
          {!loading && !fetchError && filteredRooms.length === 0 && (
            <div className="catalog-empty-container">
              <div className="empty-icon-circle">
                <Search size={32} />
              </div>
              <h3>Không tìm thấy phòng phù hợp</h3>
              <p>
                Rất tiếc, không có loại phòng nào thỏa mãn các điều kiện ngày lưu trú ({checkIn} → {checkOut}), khoảng giá ({minPrice.toLocaleString('vi-VN')} – {maxPrice.toLocaleString('vi-VN')} đ) hoặc tiện nghi đã chọn.
              </p>
              <button type="button" className="btn-empty-reset" onClick={handleResetAll}>
                <RotateCcw size={15} />
                <span>Xóa bộ lọc & Khôi phục tra cứu</span>
              </button>
            </div>
          )}

          {/* Danh sách thẻ phòng nằm ngang */}
          {!loading && !fetchError && filteredRooms.length > 0 && (
            <>
              <div className="horizontal-room-cards-list">
                {paginatedRooms.map((room) => {
                  const roomImages = room.images && room.images.length > 0 ? room.images : [DEFAULT_ROOM_IMAGE];
                  const currentImgIdx = activeImageIndexes[room.id] || 0;
                  const activeImg = roomImages[currentImgIdx] || DEFAULT_ROOM_IMAGE;

                  const totalPrice = room.basePrice * nights * quantity;
                  const depositPrice = Math.round(totalPrice * 0.5);

                  // Số lượng phòng khả dụng thực tế 100% từ Backend Database
                  const availCount = Number(room.availableRooms !== undefined ? room.availableRooms : 0);
                  const isAvailable = Boolean(room.isAvailable && availCount >= quantity);

                  const roomAmenities = Array.isArray(room.amenities) ? room.amenities : [];
                  const displayedAmenities = roomAmenities.slice(0, 4);
                  const remainingAmenitiesCount = Math.max(0, roomAmenities.length - 4);

                  return (
                    <article key={room.id} className="horizontal-room-card">
                      {/* KHU VỰC 1: HÌNH ẢNH PHÒNG (~38% CHIỀU RỘNG) */}
                      <div className="card-image-section">
                        <div className="image-aspect-frame">
                          <img
                            src={activeImg}
                            alt={room.name}
                            className="card-main-image"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = DEFAULT_ROOM_IMAGE;
                            }}
                          />

                          {/* Bộ chuyển đổi ảnh nhanh nếu có nhiều ảnh */}
                          {roomImages.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="img-nav-btn prev"
                                onClick={(e) => handlePrevImage(e, room.id, roomImages.length)}
                                aria-label="Ảnh trước"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button
                                type="button"
                                className="img-nav-btn next"
                                onClick={(e) => handleNextImage(e, room.id, roomImages.length)}
                                aria-label="Ảnh kế tiếp"
                              >
                                <ChevronRight size={16} />
                              </button>
                              <div className="img-counter-pill">
                                {currentImgIdx + 1}/{roomImages.length}
                              </div>
                            </>
                          )}

                          {/* Spec Badges trên ảnh */}
                          <div className="image-spec-badges">
                            <span className="spec-pill">
                              <Maximize2 size={11} /> {getRoomArea(room)}
                            </span>
                            <span className="spec-pill">
                              <Users size={11} /> Tối đa {room.capacity} khách
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* KHU VỰC 2: THÔNG TIN PHÒNG (~37% CHIỀU RỘNG) */}
                      <div className="card-info-section">
                        <div className="info-main-content">
                          {/* Tên loại phòng */}
                          <div className="room-title-block">
                            <h2 className="room-title-name">{room.name}</h2>
                          </div>

                          {/* Giường & Diện tích */}
                          <div className="room-specs-line">
                            <span className="spec-feature-item">
                              <BedDouble size={14} className="feature-icon" />
                              <span>{getRoomBedInfo(room)}</span>
                            </span>
                            <span className="spec-dot">•</span>
                            <span className="spec-feature-item">
                              <Maximize2 size={14} className="feature-icon" />
                              <span>Diện tích {getRoomArea(room)}</span>
                            </span>
                          </div>

                          {/* Mô tả ngắn gọn */}
                          <p className="room-desc-clamped">
                            {room.description || 'Không gian nghỉ dưỡng sang trọng chuẩn 5 sao với đầy đủ tiện nghi cao cấp.'}
                          </p>

                          {/* Tiện nghi nổi bật dạng Chips */}
                          <div className="room-amenities-row">
                            {displayedAmenities.map((amenity, idx) => (
                              <span key={idx} className="amenity-chip">
                                {getAmenityIcon(amenity)}
                                <span>{amenity}</span>
                              </span>
                            ))}

                            {remainingAmenitiesCount > 0 && (
                              <button
                                type="button"
                                className="btn-amenity-more-chip"
                                onClick={() => setModalRoomAmenities(room)}
                              >
                                +{remainingAmenitiesCount} tiện nghi khác
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tình trạng buồng phòng khả dụng thực tế từ Database */}
                        <div className="card-availability-footer">
                          {isAvailable && availCount > 0 ? (
                            <span className="avail-status-tag green">
                              <ShieldCheck size={13} />
                              <span>
                                Còn <strong>{availCount}</strong> phòng trống khả dụng
                              </span>
                            </span>
                          ) : (
                            <span className="avail-status-tag red">
                              <span>
                                ✕ Hết phòng trống trong khoảng ngày đã chọn (0 phòng khả dụng)
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* KHU VỰC 3: BẢNG GIÁ VÀ HÀNH ĐỘNG (~25% CHIỀU RỘNG) */}
                      <div className="card-pricing-section">
                        <div className="pricing-content-top">
                          <span className="price-lead-label">Giá mỗi đêm từ</span>
                          <div className="price-big-number">
                            <span className="currency-num">
                              {Number(room.basePrice || 0).toLocaleString('vi-VN')}
                            </span>
                            <span className="currency-unit">VNĐ / đêm</span>
                          </div>
                          <span className="tax-inclusive-note">Đã bao gồm thuế & phí dịch vụ</span>

                          {/* Chi tiết tính tiền theo số đêm và số phòng */}
                          <div className="stay-calculation-box">
                            <div className="calc-row">
                              <span>Tổng {nights} đêm ({quantity} phòng):</span>
                              <strong>{totalPrice.toLocaleString('vi-VN')} đ</strong>
                            </div>
                            <div className="calc-row deposit">
                              <span>Cọc trực tuyến 50%:</span>
                              <strong className="gold-text">{depositPrice.toLocaleString('vi-VN')} đ</strong>
                            </div>
                          </div>
                        </div>

                        <div className="pricing-content-bottom">
                          <button
                            type="button"
                            className="btn-card-action-cta"
                            disabled={!isAvailable || availCount < quantity}
                            onClick={() => {
                              navigate(
                                `/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&quantity=${quantity}`
                              );
                            }}
                          >
                            <span>
                              {!isAvailable || availCount < quantity
                                ? 'Tạm hết phòng'
                                : 'Xem chi tiết & Đặt phòng'}
                            </span>
                            {isAvailable && availCount >= quantity && <ArrowRight size={15} />}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="luxury-pagination-container">
                  <button
                    type="button"
                    className="btn-pagination-control"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={16} />
                    <span>Trang trước</span>
                  </button>

                  <div className="pagination-numbers-row">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={`page-num-btn ${pageNum === currentPage ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn-pagination-control"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <span>Trang sau</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. Modal xem toàn bộ tiện nghi */}
      {modalRoomAmenities && (
        <div className="amenities-modal-overlay" onClick={() => setModalRoomAmenities(null)}>
          <div className="amenities-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Toàn bộ tiện nghi & dịch vụ</h3>
                <p className="modal-subtitle">{modalRoomAmenities.name}</p>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setModalRoomAmenities(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-amenities-grid">
              {(modalRoomAmenities.amenities || []).map((item, idx) => (
                <div key={idx} className="modal-amenity-item">
                  <div className="modal-amenity-icon">{getAmenityIcon(item)}</div>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-close-confirm"
                onClick={() => setModalRoomAmenities(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

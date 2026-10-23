import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  Award,
  Compass,
  UtensilsCrossed,
  Waves,
  Sparkle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { roomService } from '../../services/roomService';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const HERO_SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=85',
    tagline: 'ĐẲNG CẤP NGHỈ DƯỠNG HOÀNG GIA',
    title: 'Kỳ Nghỉ Thượng Lưu Giữa Lòng Thành Phố',
    description: 'Trải nghiệm không gian xa hoa với tầm nhìn panorama triệu đô, dịch vụ quản gia 24/7 và tiện nghi chuẩn mực 5 sao quốc tế.',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=85',
    tagline: 'KIẾN TRÚC TÂN CỔ ĐIỂN TINH HOA',
    title: 'Sự Giao Thoa Giữa Nghệ Thuật & Sang Trọng',
    description: 'Từng chi tiết nội thất tại Grand Aurora được chế tác tỉ mỉ từ gỗ quý, đá cẩm thạch Ý và điểm xuyết sắc vàng kim vương giả.',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1920&q=85',
    tagline: 'HỒ BƠI VÔ CỰC VIEW HOÀNG HÔN',
    title: 'Khoảnh Khắc Bình Yên Giữa Tầng Mây',
    description: 'Thả mình trong làn nước ấm vô cực ngắm hoàng hôn rực rỡ và thưởng thức cocktail signature từ các bartender danh tiếng.',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1920&q=85',
    tagline: 'ẨM THỰC THƯỢNG HẠNG MICHELIN',
    title: 'Hành Trình Vị Giác Đỉnh Cao',
    description: 'Thưởng thức phong vị ẩm thực Á - Âu tinh tế được biến tấu bởi Bếp trưởng 3 sao Michelin tại nhà hàng Le Ciel Aurora.',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);

  // Search Drawer State (Collapsible)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchDrawerRef = useRef(null);

  // Search form fields
  const [checkIn, setCheckIn] = useState('2026-10-25');
  const [checkOut, setCheckOut] = useState('2026-10-27');
  const [guests, setGuests] = useState(2);
  const [quantity, setQuantity] = useState(1);

  // Backend Health check
  const [healthStatus, setHealthStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRooms = async () => {
      try {
        const data = await roomService.getRoomTypes();
        if (isMounted) setRoomTypes(data);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchHealth = async () => {
      try {
        const res = await apiClient.checkHealth();
        if (isMounted) {
          setHealthStatus({
            success: res.online,
            message: res.online
              ? `Kết nối trực tiếp: ${res.service} (v${res.version})`
              : 'Chưa kết nối Backend (Port 8080)',
          });
        }
      } catch {
        if (isMounted) {
          setHealthStatus({
            success: false,
            message: 'Chưa kết nối Backend (Port 8080)',
          });
        }
      }
    };

    fetchRooms();
    fetchHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Carousel Autoplay Timer (5s per slide)
  useEffect(() => {
    if (isSlidePaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isSlidePaused]);

  // Handle ESC key to close search modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsSearchOpen(false);
    navigate(`/rooms?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&quantity=${quantity}`);
  };

  // Compute number of nights for display
  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="home-luxury-dark-page">
      {/* =========================================================================
         1. HERO SECTION WITH IMAGE BACKGROUND SLIDER & KEN BURNS EFFECT
         ========================================================================= */}
      <section
        className="hero-luxury-carousel"
        onMouseEnter={() => setIsSlidePaused(true)}
        onMouseLeave={() => setIsSlidePaused(false)}
      >
        {/* Background Images with Ken Burns Transition */}
        <div className="carousel-track">
          {HERO_SLIDES.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
              <div
                key={slide.id}
                className={`carousel-slide ${isActive ? 'active' : ''}`}
              >
                <div
                  className={`carousel-bg-image ${isActive ? 'ken-burns' : ''}`}
                  style={{ backgroundImage: `url(${slide.image})` }}
                />
              </div>
            );
          })}
        </div>

        {/* Dark Luxury Gradient Overlay */}
        <div className="carousel-gradient-overlay" />

        {/* Carousel Arrow Controls */}
        <button
          type="button"
          className="carousel-nav-btn prev-btn"
          onClick={prevSlide}
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          type="button"
          className="carousel-nav-btn next-btn"
          onClick={nextSlide}
          aria-label="Next slide"
        >
          <ChevronRight size={24} />
        </button>

        {/* Hero Content (Floating Center) */}
        <div className="hero-content-container">
          <div className="hero-animated-block" key={currentSlide}>
            <div className="hero-gold-badge">
              <Sparkle size={14} className="text-gold" />
              <span>{HERO_SLIDES[currentSlide].tagline}</span>
            </div>

            <h1 className="hero-heading-serif">
              {HERO_SLIDES[currentSlide].title}
            </h1>

            <p className="hero-lead-text">
              {HERO_SLIDES[currentSlide].description}
            </p>
          </div>

          {/* ===================================================================
             2. COLLAPSIBLE SEARCH TRIGGER BAR (Thanh Kích Hoạt Tìm Phòng Thu Gọn)
             =================================================================== */}
          <div className="search-trigger-container">
            <button
              type="button"
              className="search-trigger-bar"
              onClick={() => setIsSearchOpen(true)}
              title="Mở thanh tìm phòng trống nhanh"
            >
              <div className="trigger-left">
                <div className="trigger-text-group">
                  <span className="trigger-main-text">Tìm phòng trống ngay</span>
                </div>
              </div>

              <div className="trigger-action-badge">
                <Search size={16} />
                <span>Kiểm tra phòng</span>
              </div>
            </button>
          </div>
        </div>

        {/* Slide Indicators (Dots & Slide Number) */}
        <div className="carousel-bottom-bar">
          <div className="carousel-indicators">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`indicator-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
          <div className="carousel-counter">
            <span className="current-num">0{currentSlide + 1}</span>
            <span className="sep">/</span>
            <span className="total-num">0{HERO_SLIDES.length}</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
         3. ANIMATED FLOATING SEARCH FORM / GLASSMORPHISM DRAWER (Thu Gọn)
         ========================================================================= */}
      {isSearchOpen && (
        <div
          className="search-modal-backdrop"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="search-floating-drawer"
            ref={searchDrawerRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="drawer-header">
              <div className="drawer-title-group">
                <div className="drawer-crest">
                  <Calendar size={18} className="text-gold" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h3 className="drawer-title" style={{ margin: 0 }}>Tra Cứu & Đặt Phòng Nghỉ Dưỡng</h3>
                    {healthStatus && (
                      <span className={`backend-status-pill ${healthStatus.success ? 'live' : 'offline'}`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                        <span className="dot" />
                        <span>{healthStatus.success ? 'Live API (8080)' : 'Chưa kết nối API'}</span>
                      </span>
                    )}
                  </div>
                  <p className="drawer-subtitle">
                    Kiểm tra phòng trống tức thì với chính sách giữ chỗ 15 phút & cọc 50% qua VNPay
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-drawer-close"
                onClick={() => setIsSearchOpen(false)}
                aria-label="Đóng form tìm kiếm"
              >
                <X size={20} />
              </button>
            </div>

            {/* 4 Essential Booking Search Fields */}
            <form className="drawer-search-form" onSubmit={handleSearchSubmit}>
              <div className="drawer-fields-grid">
                {/* Field 1: Check-in */}
                <div className="drawer-field">
                  <label>
                    <Calendar size={14} className="field-icon text-gold" />
                    <span>Ngày nhận phòng (Check-in)</span>
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    min="2026-10-20"
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                  />
                  <span className="field-hint">Từ 14:00 chiều</span>
                </div>

                {/* Field 2: Check-out */}
                <div className="drawer-field">
                  <label>
                    <Calendar size={14} className="field-icon text-gold" />
                    <span>Ngày trả phòng (Check-out)</span>
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                  />
                  <span className="field-hint">Trước 12:00 trưa ({nights} đêm)</span>
                </div>

                {/* Field 3: Guests */}
                <div className="drawer-field">
                  <label>
                    <Users size={14} className="field-icon text-gold" />
                    <span>Số lượng khách</span>
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                  >
                    <option value="1">1 Người lớn</option>
                    <option value="2">2 Người lớn (Tiêu chuẩn)</option>
                    <option value="4">4 Người (Gia đình / Suite)</option>
                  </select>
                  <span className="field-hint">Phù hợp sức chứa</span>
                </div>

                {/* Field 4: Quantity */}
                <div className="drawer-field">
                  <label>
                    <Award size={14} className="field-icon text-gold" />
                    <span>Số lượng phòng (N)</span>
                  </label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  >
                    <option value="1">1 Phòng</option>
                    <option value="2">2 Phòng cùng hạng</option>
                    <option value="3">3 Phòng cùng hạng</option>
                  </select>
                  <span className="field-hint">Pessimistic Lock an toàn</span>
                </div>
              </div>

              {/* Submit Button & Assurance */}
              <div className="drawer-submit-row">
                <div className="drawer-assurance-text">
                  <ShieldCheck size={16} className="text-emerald" />
                  <span>Cam kết giá tốt nhất • Hoàn cọc 100% nếu hủy trước 24h</span>
                </div>

                <button type="submit" className="btn-drawer-search">
                  <Search size={18} />
                  <span>Tìm phòng trống</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         4. ABOUT SECTION (Kiến Trúc & Tinh Hoa Grand Aurora) - DARK THEME
         ========================================================================= */}
      <section className="luxury-about-section" id="about">
        <div className="luxury-content-limit">
          <div className="luxury-section-header">
            <span className="luxury-gold-subtitle">DI SẢN & ĐẲNG CẤP</span>
            <h2 className="luxury-title-serif">Khách Sạn Grand Aurora Luxury</h2>
            <div className="gold-separator" />
            <p className="luxury-desc-lead">
              Nằm kiêu hãnh bên dòng sông thơ mộng, Grand Aurora là biểu tượng của sự thanh lịch vượt thời gian, kết hợp giữa phong cách kiến trúc Pháp cổ điển và công nghệ quản trị lưu trú thông minh chuẩn mực quốc tế.
            </p>
          </div>

          <div className="about-pillars-grid">
            <div className="pillar-glass-card">
              <div className="pillar-icon-box">
                <Compass size={28} />
              </div>
              <h3>Vị Trí Độc Tôn</h3>
              <p>
                Tọa lạc ngay trung tâm tài chính và giải trí, chỉ cách các địa danh biểu tượng của thành phố vài phút di chuyển nhưng vẫn giữ trọn không gian biệt lập, yên bình.
              </p>
            </div>

            <div className="pillar-glass-card">
              <div className="pillar-icon-box">
                <UtensilsCrossed size={28} />
              </div>
              <h3>Ẩm Thực Thượng Hạng</h3>
              <p>
                Hệ thống 3 nhà hàng fine-dining và lounge sang trọng với thực đơn phong phú từ hải sản tươi sống nhập khẩu đến bộ sưu tập rượu vang thượng hạng lâu năm.
              </p>
            </div>

            <div className="pillar-glass-card">
              <div className="pillar-icon-box">
                <Waves size={28} />
              </div>
              <h3>Spa & Chăm Sóc Sức Khỏe</h3>
              <p>
                Trải nghiệm liệu trình phục hồi chuyên sâu với thảo mộc thiên nhiên tại Aurora Lotus Spa, cùng hồ bơi nước ấm trên tầng thượng view 360 độ ngắm trọn thành phố.
              </p>
            </div>

            <div className="pillar-glass-card">
              <div className="pillar-icon-box">
                <ShieldCheck size={28} />
              </div>
              <h3>Bảo Mật & An Toàn Tuyệt Đối</h3>
              <p>
                Hệ thống đặt phòng trực tuyến áp dụng cơ chế khóa ghi dòng CSDL chống Overbooking, mã hóa dữ liệu giao dịch và quy trình đối soát hoàn cọc minh bạch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
         5. FEATURED ROOM TYPES (Danh Mục Phòng Tiêu Biểu) - DARK THEME
         ========================================================================= */}
      <section className="luxury-rooms-section">
        <div className="luxury-content-limit">
          <div className="luxury-section-header">
            <span className="luxury-gold-subtitle">KHÔNG GIAN LƯU TRÚ XA HOA</span>
            <h2 className="luxury-title-serif">Các Hạng Phòng Nghỉ Dưỡng Nổi Bật</h2>
            <div className="gold-separator" />
            <p className="luxury-desc-lead">
              Được thiết kế tinh xảo với ban công riêng, giường đệm cao cấp và phòng tắm ốp đá cẩm thạch sang trọng mang đến giấc ngủ thư thái nhất.
            </p>
          </div>

          {loading ? (
            <LoadingSpinner text="Đang tải danh mục phòng nghỉ cao cấp..." />
          ) : (
            <div className="luxury-rooms-grid">
              {roomTypes.slice(0, 3).map((room) => {
                const img = room.images?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';
                return (
                  <div key={room.id} className="luxury-room-card">
                    <div className="room-card-media">
                      <img
                        src={img}
                        alt={room.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="room-capacity-badge">
                        <Users size={13} />
                        <span>Tối đa {room.capacity} khách</span>
                      </div>
                      <div className="room-price-overlay">
                        <span className="price-val">{room.basePrice.toLocaleString('vi-VN')}</span>
                        <span className="price-unit">VNĐ / đêm</span>
                      </div>
                    </div>

                    <div className="room-card-content">
                      <h3 className="room-name-title">{room.name}</h3>
                      <p className="room-brief-desc">{room.description}</p>

                      <div className="room-amenities-tags">
                        {room.amenities.slice(0, 3).map((am, i) => (
                          <span key={i} className="amenity-dark-tag">
                            ✓ {am}
                          </span>
                        ))}
                      </div>

                      <div className="room-card-actions">
                        <Link
                          to={`/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&quantity=${quantity}`}
                          className="btn-room-detail"
                        >
                          <span>Xem chi tiết</span>
                          <ArrowRight size={15} />
                        </Link>
                        <Link
                          to={`/booking/checkout?roomTypeId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&quantity=${quantity}`}
                          className="btn-room-book-now"
                        >
                          <span>Đặt ngay</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="view-all-rooms-row">
            <Link to="/rooms" className="btn-view-all-catalog">
              <span>Xem toàn bộ danh mục phòng & kiểm tra tình trạng trống</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
         6. LUXURY AMENITIES & EXPERIENCE - DARK THEME
         ========================================================================= */}
      <section className="luxury-amenities-section" id="amenities">
        <div className="luxury-content-limit">
          <div className="luxury-section-header">
            <span className="luxury-gold-subtitle">DỊCH VỤ 5 SAO</span>
            <h2 className="luxury-title-serif">Trải Nghiệm Nghỉ Dưỡng Hoàn Hảo</h2>
            <div className="gold-separator" />
          </div>

          <div className="amenities-features-grid">
            <div className="feature-item-box">
              <span className="feature-num">01</span>
              <h4>Dịch Vụ Quản Gia 24/7</h4>
              <p>Đội ngũ quản gia chuyên nghiệp luôn sẵn sàng phục vụ từ sắp xếp hành lý, ủi đồ đến đặt bàn tại các nhà hàng nổi tiếng.</p>
            </div>
            <div className="feature-item-box">
              <span className="feature-num">02</span>
              <h4>Đưa Đón Sân Bay Bằng Limousine</h4>
              <p>Xe đưa đón riêng hạng sang đón tiếp chu đáo ngay tại cổng ga quốc tế, mang lại sự tiện nghi và riêng tư tối đa.</p>
            </div>
            <div className="feature-item-box">
              <span className="feature-num">03</span>
              <h4>Buffet Sáng Hoàng Gia</h4>
              <p>Hơn 120 món ăn Á - Âu tinh tế được chuẩn bị mỗi sáng cùng quầy bánh tươi nướng tại chỗ và cà phê đặc sản.</p>
            </div>
            <div className="feature-item-box">
              <span className="feature-num">04</span>
              <h4>Phòng Tiệc & Hội Nghị Thượng Đỉnh</h4>
              <p>Không gian Grand Ballroom trần cao 8 mét với màn hình LED 4K và hệ thống âm thanh ánh sáng hiện đại bậc nhất.</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
         7. DIRECT BOOKING ASSURANCE & CANCELLATION POLICY
         ========================================================================= */}
      <section className="booking-policy-banner">
        <div className="luxury-content-limit">
          <div className="policy-banner-card">
            <div className="policy-left">
              <div className="policy-icon-circle">
                <CheckCircle2 size={32} className="text-gold" />
              </div>
              <div>
                <h3>Chính Sách Đặt Phòng & Hủy Cọc Minh Bạch</h3>
                <p>
                  Đặt cọc an toàn 50% qua VNPay Sandbox với thời gian giữ chỗ 15 phút.
                  Chính sách phạt cọc 4 bậc mốc cố định <strong>14:00 ngày Check-in</strong> bảo vệ tối đa quyền lợi khách hàng:
                  Hủy trước ≥ 24h hoàn 100% tiền cọc!
                </p>
              </div>
            </div>
            <div className="policy-right">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsSearchOpen(true)}
              >
                Đặt phòng ngay hôm nay
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

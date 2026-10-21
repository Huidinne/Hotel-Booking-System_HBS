import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { roomService } from '../../services/roomService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export function HomePage() {
  const navigate = useNavigate();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search form state
  const [checkIn, setCheckIn] = useState('2026-10-25');
  const [checkOut, setCheckOut] = useState('2026-10-27');
  const [guests, setGuests] = useState(2);
  const [quantity, setQuantity] = useState(1);

  // Backend Health check
  const [healthStatus, setHealthStatus] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const loadFeaturedRooms = async () => {
    try {
      const data = await roomService.getRoomTypes();
      setRoomTypes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeaturedRooms();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/rooms?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&quantity=${quantity}`);
  };

  const checkBackendHealth = async () => {
    setCheckingHealth(true);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus({ success: true, message: `${data.service} v${data.version} - Trạng thái: ${data.status}` });
      } else {
        setHealthStatus({ success: false, message: `Lỗi kết nối HTTP: ${res.status}` });
      }
    } catch {
      setHealthStatus({
        success: false,
        message: 'Backend API chưa được bật (Frontend đang hoạt động mượt mà với Mock Service Layer)',
      });
    } finally {
      setCheckingHealth(false);
    }
  };

  return (
    <div className="home-page">
      {/* 1. HERO BANNER */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">🌟 Trải nghiệm nghỉ dưỡng 5 sao giữa lòng thành phố</div>
          <h1>Khám Phá Kỳ Nghỉ Sang Trọng & Bình Yên</h1>
          <p>
            Hệ thống đặt phòng trực tuyến tiện lợi, an toàn, hỗ trợ đặt cọc VNPay Sandbox 50%
            với cơ chế giữ chỗ 15 phút và chính sách hủy cọc bảo vệ tối đa quyền lợi khách hàng.
          </p>

          {/* Quick Search Card */}
          <form className="search-box" onSubmit={handleSearch}>
            <div className="search-field">
              <label>Ngày nhận phòng</label>
              <input
                type="date"
                value={checkIn}
                min="2026-10-20"
                onChange={(e) => setCheckIn(e.target.value)}
                required
              />
            </div>
            <div className="search-field">
              <label>Ngày trả phòng</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                required
              />
            </div>
            <div className="search-field">
              <label>Số lượng khách</label>
              <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                <option value="1">1 Người lớn</option>
                <option value="2">2 Người lớn</option>
                <option value="4">4 Người (Gia đình)</option>
              </select>
            </div>
            <div className="search-field">
              <label>Số phòng (N)</label>
              <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
                <option value="1">1 Phòng</option>
                <option value="2">2 Phòng</option>
                <option value="3">3 Phòng</option>
              </select>
            </div>
            <button type="submit" className="btn-search">
              Tìm phòng trống
            </button>
          </form>
        </div>
      </section>

      {/* 2. SYSTEM INTRODUCTION (About Section) */}
      <section className="intro-section" id="about">
        <div className="intro-container">
          <div className="intro-badge">Về khách sạn & Hệ thống</div>
          <h2>Chào Mừng Đến Với Grand Aurora Hotel</h2>
          <p className="intro-lead">
            Hệ thống quản lý và kinh doanh phòng nghỉ độc lập chuẩn Modular Monolith – kết hợp giữa kiến trúc công nghệ hiện đại và sự hiếu khách chuẩn mực quốc tế.
          </p>

          <div className="intro-columns-grid">
            <div className="intro-card">
              <div className="intro-icon">💎</div>
              <h3>Không Gian Sang Trọng</h3>
              <p>
                Tọa lạc tại vị trí đắc địa nhìn ra bờ sông lung linh, Grand Aurora Hotel sở hữu hệ thống phòng nghỉ tiện nghi từ Standard, Deluxe đến Penthouse Executive Suite sang trọng bậc nhất.
              </p>
            </div>

            <div className="intro-card">
              <div className="intro-icon">⚡</div>
              <h3>Trải Nghiệm Số Hóa Liền Mạch</h3>
              <p>
                Tra cứu phòng trống tức thì theo ngày, chọn số lượng phòng $N \ge 1$, thanh toán cọc bảo mật và theo dõi trực quan trạng thái đặt phòng từ lúc giữ chỗ đến khi Check-out.
              </p>
            </div>

            <div className="intro-card">
              <div className="intro-icon">🤝</div>
              <h3>Minh Bạch & Tận Tâm</h3>
              <p>
                Quy chuẩn giờ nhận phòng 14:00, giờ trả phòng 12:00 trưa; chính sách hoàn tiền cọc rõ ràng bảo lưu 100% chi phí các đêm chưa ở khi khách hủy đơn hoặc có việc đột xuất.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURE OVERVIEW SECTION */}
      <section className="features-overview-section">
        <div className="section-header">
          <h2>Tính Năng Nổi Bật Của Hệ Thống</h2>
          <p>Thiết kế nghiệp vụ chuyên sâu, giải quyết triệt để các rủi ro vận hành khách sạn</p>
        </div>

        <div className="feature-grid">
          <div className="feature-item">
            <span className="feature-icon">🛡️</span>
            <h4>Chống Overbooking Tuyệt Đối</h4>
            <p>
              Áp dụng cơ chế khóa ghi <code>Pessimistic Lock</code> tại tầng dữ liệu, đảm bảo không bao giờ xảy ra tình trạng hai khách hàng cùng đặt một phòng trong cùng thời điểm.
            </p>
          </div>

          <div className="feature-item">
            <span className="feature-icon">💳</span>
            <h4>Cọc 50% & Giữ Quota 15 Phút</h4>
            <p>
              Tích hợp cổng thanh toán VNPay Sandbox với thời hạn giữ chỗ đúng 15 phút. Hệ thống tự động kích hoạt trạng thái <code>CONFIRMED</code> ngay sau khi thanh toán thành công.
            </p>
          </div>

          <div className="feature-item">
            <span className="feature-icon">🔄</span>
            <h4>Chính Sách Hoàn Cọc Bậc Thang</h4>
            <p>
              Căn cứ duy nhất mốc 14:00 ngày Check-in: Hủy trước $\ge 24h$ hoàn 100% cọc; 12h-24h phạt 30% cọc; &lt; 12h phạt 50% cọc; sau 14:00 thu 100% cọc (hoàn 100% tiền vượt cọc).
            </p>
          </div>

          <div className="feature-item">
            <span className="feature-icon">🛎️</span>
            <h4>Vận Hành Lễ Tân & Gán Phòng Vật Lý</h4>
            <p>
              Khách đặt theo Loại phòng $\to$ Khi Check-in, Lễ tân gán đúng $N$ phòng vật lý cụ thể đang <code>AVAILABLE</code>, tự động chuyển buồng phòng sang <code>CLEANING</code> khi trả phòng.
            </p>
          </div>
        </div>
      </section>

      {/* 4. FEATURED ROOM TYPES */}
      <section className="rooms-section">
        <div className="section-header">
          <h2>Các Loại Phòng Nghỉ Tiêu Biểu</h2>
          <p>Không gian nội thất tinh tế, ban công ngắm nhìn toàn cảnh phố lung linh</p>
        </div>

        {loading ? (
          <LoadingSpinner text="Đang tải danh mục loại phòng..." />
        ) : (
          <div className="room-grid">
            {roomTypes.map((room) => (
              <div key={room.id} className="room-card">
                <div className="room-image-wrap">
                  <img src={room.images[0]} alt={room.name} />
                  <div className="room-badge">
                    {room.basePrice.toLocaleString('vi-VN')} VNĐ / đêm
                  </div>
                </div>

                <div className="room-info">
                  <h3>{room.name}</h3>
                  <p>{room.description}</p>

                  <div className="room-meta">
                    <span className="capacity-tag">👤 Sức chứa: {room.capacity} Khách</span>
                    <span className="deposit-tag">💳 Cọc 50%</span>
                  </div>

                  <div className="amenities-preview">
                    {room.amenities.slice(0, 3).map((a, idx) => (
                      <span key={idx} className="amenity-pill">
                        ✓ {a}
                      </span>
                    ))}
                    {room.amenities.length > 3 && (
                      <span className="amenity-more">+{room.amenities.length - 3}</span>
                    )}
                  </div>

                  <div className="card-actions">
                    <button
                      className="btn-card-detail"
                      onClick={() => navigate(`/rooms/${room.id}`)}
                    >
                      Chi tiết & Đặt phòng
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. BENEFITS SECTION */}
      <section className="benefits-section">
        <div className="benefits-container">
          <div className="section-header">
            <h2>Lợi Ích Hệ Thống Mang Lại Cho Bạn</h2>
            <p>Tối ưu hóa trải nghiệm khách hàng và nâng cao năng lực quản trị khách sạn</p>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-badge guest">Dành cho Khách hàng</div>
              <h3>Chủ Động & Minh Bạch</h3>
              <ul className="benefit-list">
                <li>✓ Tìm kiếm phòng trống theo số lượng khách và khoảng ngày chính xác 100%.</li>
                <li>✓ Đặt nhiều phòng cùng loại ($N \ge 1$) trong một thao tác duy nhất.</li>
                <li>✓ Thanh toán cọc trực tuyến tiện lợi, giữ quota tức thì trong 15 phút.</li>
                <li>✓ Tự hủy phòng trên trang cá nhân và nhận tiền hoàn cọc minh bạch.</li>
              </ul>
            </div>

            <div className="benefit-card">
              <div className="benefit-badge staff">Dành cho Lễ tân & Vận hành</div>
              <h3>Chính Xác & Nhanh Chóng</h3>
              <ul className="benefit-list">
                <li>✓ Bảng danh sách booking trực quan với bộ lọc trạng thái đa tiêu chí.</li>
                <li>✓ Quy trình Check-in an toàn: Khóa phòng vật lý chống xung đột giữa các quầy.</li>
                <li>✓ Check-out đối soát tất toán công nợ và tự động đưa phòng vào dọn dẹp.</li>
                <li>✓ Quản trị hoàn cọc an toàn, số tài khoản ngân hàng được che bảo mật.</li>
              </ul>
            </div>

            <div className="benefit-card">
              <div className="benefit-badge admin">Dành cho Ban Quản lý</div>
              <h3>Toàn Diện & Hiệu Quả</h3>
              <ul className="benefit-list">
                <li>✓ Báo cáo Doanh thu dự kiến, Doanh thu thực thu và Tỷ lệ lấp đầy phòng (%).</li>
                <li>✓ Sơ đồ cơ cấu buồng phòng thời gian thực (Available, Occupied, Cleaning, Maintenance).</li>
                <li>✓ Linh hoạt điều chỉnh bảng giá loại phòng và cấu hình buồng phòng vật lý.</li>
                <li>✓ Tự động hóa giải phóng quota cho đơn vắng mặt (No-Show) lúc 12:00 trưa.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL-TO-ACTION (CTA) SECTION */}
      <section className="cta-banner-section">
        <div className="cta-box">
          <h2>Sẵn Sàng Cho Kỳ Nghỉ Đẳng Cấp Tại Grand Aurora?</h2>
          <p>
            Đặt phòng ngay hôm nay để nhận phòng ưng ý với giá ưu đãi tốt nhất cùng dịch vụ chăm sóc chuẩn 5 sao.
          </p>
          <div className="cta-actions">
            <button className="btn-cta-primary" onClick={() => navigate('/rooms')}>
              Tìm & Đặt phòng ngay
            </button>
            <Link to="/register" className="btn-cta-secondary">
              Đăng ký tài khoản thành viên
            </Link>
          </div>
        </div>
      </section>

      {/* 7. CONTACT & LOCATION SECTION */}
      <section className="contact-section" id="contact">
        <div className="contact-container">
          <div className="contact-info-col">
            <div className="intro-badge">Thông tin liên hệ</div>
            <h2>Liên Hệ Với Chúng Tôi</h2>
            <p>Bộ phận Chăm sóc khách hàng và Lễ tân sẵn sàng phục vụ quý khách 24/7.</p>

            <div className="contact-details-list">
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div>
                  <strong>Địa chỉ:</strong>
                  <p>123 Đại lộ Aurora, Phường Thạch Thang, Quận Hải Châu, TP. Đà Nẵng</p>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <div>
                  <strong>Hotline đặt phòng:</strong>
                  <p>1900 6868 - (0236) 3888 999</p>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">✉️</span>
                <div>
                  <strong>Email hỗ trợ:</strong>
                  <p>booking@aurorahotel.vn | support@aurorahotel.vn</p>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">⏰</span>
                <div>
                  <strong>Thời gian phục vụ:</strong>
                  <p>Lễ tân mở cửa 24/7 | Giờ nhận phòng: 14:00 | Giờ trả phòng: 12:00</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-col">
            <div className="quick-message-card">
              <h3>Gửi tin nhắn yêu cầu hỗ trợ</h3>
              <form onSubmit={(e) => { e.preventDefault(); alert('Cảm ơn bạn! Yêu cầu của bạn đã được ghi nhận.'); }}>
                <div className="form-group">
                  <label>Họ và tên</label>
                  <input type="text" placeholder="Nguyễn Văn A" required />
                </div>
                <div className="form-group">
                  <label>Email hoặc Số điện thoại</label>
                  <input type="text" placeholder="name@example.com hoặc 090..." required />
                </div>
                <div className="form-group">
                  <label>Nội dung cần tư vấn</label>
                  <textarea rows={3} placeholder="Bạn muốn hỏi về loại phòng nào hoặc có yêu cầu gì đặc biệt?..." required />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Gửi yêu cầu
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 8. BACKEND API HEALTH INTEGRATION SECTION */}
      <section className="api-status-section">
        <div className="status-card">
          <div className="status-header">
            <span className="status-dot-pulse" />
            <h3>Trạng thái tích hợp Backend API & Mock Services</h3>
          </div>
          <p>
            Mọi màn hình hiện đang tiêu thụ dữ liệu qua tầng <code>mockAuthService</code> & <code>Service Layer</code> cách ly độc lập.
            Bạn có thể kiểm tra endpoint thực tế <code>GET /api/v1/health</code> của Spring Boot Backend tại đây.
          </p>
          <button className="btn-check" onClick={checkBackendHealth} disabled={checkingHealth}>
            {checkingHealth ? 'Đang kiểm tra...' : 'Kiểm tra Backend Health (/api/v1/health)'}
          </button>
          {healthStatus && (
            <div className={`status-result ${healthStatus.success ? 'success' : 'warning'}`}>
              {healthStatus.message}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

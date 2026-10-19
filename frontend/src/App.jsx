import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [healthStatus, setHealthStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const checkBackendHealth = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
      const res = await fetch(`${apiUrl}/health`)
      if (res.ok) {
        const data = await res.json()
        setHealthStatus({ success: true, message: `${data.service} v${data.version} - Status: ${data.status}` })
      } else {
        setHealthStatus({ success: false, message: `Lỗi kết nối HTTP: ${res.status}` })
      }
    } catch (err) {
      setHealthStatus({ success: false, message: 'Chưa kết nối được Backend (hãy đảm bảo Backend đang chạy tại port 8080)' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hotel-container">
      {/* Navigation Bar */}
      <header className="hotel-header">
        <div className="logo-section">
          <span className="hotel-icon">🏨</span>
          <span className="brand-name">Grand Aurora Hotel</span>
        </div>
        <nav className="nav-links">
          <a href="#home" className="active">Trang chủ</a>
          <a href="#rooms">Loại phòng</a>
          <a href="#booking">Đặt phòng</a>
          <a href="#history">Lịch sử</a>
          <button className="btn-login" onClick={() => alert('Chức năng Đăng nhập đang phát triển')}>Đăng nhập</button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Khám Phá Kỳ Nghỉ Sang Trọng & Bình Yên</h1>
          <p>Hệ thống đặt phòng trực tuyến tiện lợi, an toàn, hỗ trợ đặt cọc VNPay Sandbox và giữ chỗ tức thì.</p>
          
          {/* Quick Search Card */}
          <div className="search-box">
            <div className="search-field">
              <label>Ngày nhận phòng</label>
              <input type="date" defaultValue="2026-10-20" />
            </div>
            <div className="search-field">
              <label>Ngày trả phòng</label>
              <input type="date" defaultValue="2026-10-22" />
            </div>
            <div className="search-field">
              <label>Số lượng khách</label>
              <select defaultValue="2">
                <option value="1">1 Người lớn</option>
                <option value="2">2 Người lớn</option>
                <option value="4">4 Người (Gia đình)</option>
              </select>
            </div>
            <button className="btn-search" onClick={() => alert('Hệ thống tìm kiếm phòng trống theo ngày đang kết nối Backend')}>
              Tìm phòng trống
            </button>
          </div>
        </div>
      </section>

      {/* Featured Room Types */}
      <section className="rooms-section">
        <h2>Các Loại Phòng Nổi Bật</h2>
        <div className="room-grid">
          <div className="room-card">
            <div className="room-badge">500.000 VNĐ / đêm</div>
            <div className="room-info">
              <h3>Standard Single Room</h3>
              <p>Phù hợp cho khách công tác hoặc đi 1 mình, đầy đủ tiện nghi, wifi tốc độ cao.</p>
              <span className="capacity-tag">👤 1 Khách</span>
            </div>
          </div>
          <div className="room-card">
            <div className="room-badge">950.000 VNĐ / đêm</div>
            <div className="room-info">
              <h3>Deluxe Double Room</h3>
              <p>Phòng 1 giường đôi lớn với ban công hướng phố thoáng mát, sang trọng.</p>
              <span className="capacity-tag">👥 2 Khách</span>
            </div>
          </div>
          <div className="room-card">
            <div className="room-badge">1.800.000 VNĐ / đêm</div>
            <div className="room-info">
              <h3>Executive Suite Luxury</h3>
              <p>Căn hộ cao cấp 2 phòng ngủ, bồn tắm nằm ngắm toàn cảnh thành phố.</p>
              <span className="capacity-tag">👨‍👩‍👧‍👦 4 Khách</span>
            </div>
          </div>
        </div>
      </section>

      {/* Backend API Connection Status */}
      <section className="api-status-section">
        <div className="status-card">
          <h3>Kiểm tra kết nối Backend API</h3>
          <p>Xác thực kết nối endpoint <code>GET /api/v1/health</code></p>
          <button className="btn-check" onClick={checkBackendHealth} disabled={loading}>
            {loading ? 'Đang kiểm tra...' : 'Kiểm tra Backend Health'}
          </button>
          {healthStatus && (
            <div className={`status-result ${healthStatus.success ? 'success' : 'warning'}`}>
              {healthStatus.message}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="hotel-footer">
        <p>© 2026 Hotel Booking System (MVP) - Spring Boot 3 + ReactJS/Vite + MySQL 8 + Docker Compose</p>
      </footer>
    </div>
  )
}

export default App

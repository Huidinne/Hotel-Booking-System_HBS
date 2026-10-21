import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';

export function Navbar() {
  const { currentUser, logout, isCustomer, isReceptionist, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);

  useEffect(() => {
    apiClient.checkHealth().then((status) => {
      setBackendStatus(status);
    }).catch(() => {
      setBackendStatus({ online: false });
    });
  }, []);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return <span className="role-tag admin">Quản trị viên</span>;
      case 'ROLE_RECEPTIONIST':
        return <span className="role-tag receptionist">Lễ tân</span>;
      default:
        return <span className="role-tag customer">Khách hàng</span>;
    }
  };

  const handleNavScroll = (anchorId) => {
    if (location.pathname !== '/') {
      navigate(`/${anchorId}`);
    } else {
      const element = document.querySelector(anchorId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="hotel-header">
      {/* 1. Logo / System Name */}
      <div className="logo-section">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div className="hotel-crest">
            <span className="hotel-icon">⚜️</span>
          </div>
          <div className="brand-group">
            <span className="brand-name">Grand Aurora</span>
            <span className="brand-stars">★★★★★ LUXURY HOTEL & SUITES</span>
          </div>
        </Link>

        {/* Backend live status indicator */}
        {backendStatus !== null && backendStatus.online && (
          <div
            className="backend-status-pill live"
            title="Đang kết nối trực tiếp với Spring Boot Backend (Port 8080)"
          >
            <span className="dot" />
            <span className="lbl">Live API (8080)</span>
          </div>
        )}
      </div>

      {/* 2. Navigation Links */}
      <nav className="nav-links">
        <Link to="/" className={location.pathname === '/' && !location.hash ? 'active' : ''}>
          Trang chủ
        </Link>

        <Link to="/rooms" className={location.pathname === '/rooms' ? 'active' : ''}>
          Khám phá phòng
        </Link>

        <a
          href="#about"
          onClick={(e) => {
            e.preventDefault();
            handleNavScroll('#about');
          }}
          className={location.hash === '#about' ? 'active' : ''}
        >
          Giới thiệu
        </a>

        <a
          href="#amenities"
          onClick={(e) => {
            e.preventDefault();
            handleNavScroll('#amenities');
          }}
          className={location.hash === '#amenities' ? 'active' : ''}
        >
          Dịch vụ & Tiện ích
        </a>

        {/* Customer history */}
        {isCustomer && (
          <Link to="/my-bookings" className={location.pathname.startsWith('/my-bookings') ? 'active' : ''}>
            Lịch sử đặt
          </Link>
        )}

        {/* Dedicated Staff Portal Quick-Access Pill */}
        {(isAdmin || isReceptionist) && (
          <Link
            to={isAdmin ? '/admin/dashboard' : '/receptionist/bookings'}
            className="btn-portal-badge"
            title="Truy cập giao diện quản trị riêng biệt"
          >
            <span>{isAdmin ? '⚙️ Cổng Quản Trị (Admin)' : '🛎️ Bàn Lễ Tân (Desk)'}</span>
          </Link>
        )}
      </nav>

      {/* 3. Header Right Actions: Login button, Register button, or User Profile */}
      <div className="header-right-actions">
        {currentUser ? (
          <div className="user-profile-widget">
            <div
              className="user-info-pill"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title="Thông tin tài khoản"
            >
              <div className="avatar-circle">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-text">
                <span className="user-name">{currentUser.fullName}</span>
                {getRoleBadge(currentUser.role)}
              </div>
              <span className="dropdown-arrow">▾</span>
            </div>

            {showUserMenu && (
              <div className="role-dropdown-menu">
                <div className="dropdown-title">Tài khoản hiện tại:</div>
                <div style={{ padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: '#0F1E36' }}>{currentUser.fullName}</div>
                  <div style={{ color: '#64748B', fontSize: '0.78rem' }}>{currentUser.email}</div>
                </div>
                <div className="dropdown-divider" />
                {isCustomer && (
                  <Link
                    to="/my-bookings"
                    className="dropdown-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    📋 Đơn đặt phòng của tôi
                  </Link>
                )}
                {(isAdmin || isReceptionist) && (
                  <Link
                    to={isAdmin ? '/admin/dashboard' : '/receptionist/bookings'}
                    className="dropdown-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    ⚙️ Phân hệ quản trị
                  </Link>
                )}
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item logout-item"
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                    navigate('/');
                  }}
                >
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="btn-secondary-sm">
              Đăng nhập
            </Link>
            <Link to="/register" className="btn-login">
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const { currentUser, logout, isCustomer, isReceptionist, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

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
              </div>
              <span className="dropdown-arrow">▾</span>
            </div>

            {showUserMenu && (
              <div className="role-dropdown-menu">
                <div className="dropdown-title">Tài khoản hiện tại:</div>
                <div style={{ padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: '#f5f6f7' }}>{currentUser.fullName}</div>
                  <div style={{ color: '#64748B', fontSize: '0.78rem' }}>{currentUser.email}</div>
                </div>
                <div className="dropdown-divider" />
                {isCustomer && (
                  <Link
                    to="/my-bookings"
                    className="dropdown-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Đơn đặt phòng của tôi
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
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="btn-header-login">
              Đăng nhập
            </Link>
            <Link to="/register" className="btn-header-register">
              Đăng ký
            </Link>
          </div>
        )}

        {/* 4. Mobile Hamburger Button (< 768px) */}
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Đóng menu" : "Mở menu điều hướng"}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 5. Mobile Slide-over Drawer (< 768px) */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="hotel-crest">
                <span className="hotel-icon">⚜️</span>
              </div>
              <div className="brand-group">
                <span className="brand-name">Grand Aurora</span>
                <span className="brand-stars">★★★★★ LUXURY HOTEL</span>
              </div>
              <button
                type="button"
                className="mobile-drawer-close-btn"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Đóng menu"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              <Link
                to="/"
                className={`mobile-nav-item ${location.pathname === '/' && !location.hash ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Trang chủ
              </Link>
              <Link
                to="/rooms"
                className={`mobile-nav-item ${location.pathname === '/rooms' ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Khám phá phòng
              </Link>
              <a
                href="#about"
                className={`mobile-nav-item ${location.hash === '#about' ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  handleNavScroll('#about');
                }}
              >
                Giới thiệu
              </a>
              <a
                href="#amenities"
                className={`mobile-nav-item ${location.hash === '#amenities' ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  handleNavScroll('#amenities');
                }}
              >
                Dịch vụ & Tiện ích
              </a>
              {isCustomer && (
                <Link
                  to="/my-bookings"
                  className={`mobile-nav-item ${location.pathname.startsWith('/my-bookings') ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  📋 Đơn đặt phòng của tôi
                </Link>
              )}
              {(isAdmin || isReceptionist) && (
                <Link
                  to={isAdmin ? '/admin/dashboard' : '/receptionist/bookings'}
                  className="mobile-nav-item mobile-portal-badge"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>{isAdmin ? '⚙️ Cổng Quản Trị (Admin)' : '🛎️ Bàn Lễ Tân (Desk)'}</span>
                </Link>
              )}
            </nav>

            <div className="mobile-drawer-footer">
              {currentUser ? (
                <div className="mobile-user-profile">
                  <div className="mobile-user-meta">
                    <div className="avatar-circle">
                      {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="mobile-user-names">
                      <strong>{currentUser.fullName}</strong>
                      <span>{currentUser.email}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-mobile-logout"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                      navigate('/');
                    }}
                  >
                    <LogOut size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <div className="mobile-auth-btn-stack">
                  <Link
                    to="/login"
                    className="btn-mobile-login"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="btn-mobile-register"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Đăng ký tài khoản
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mockAuthService } from '../../services/mockAuthService';

export function Navbar() {
  const { currentUser, logout, switchAccount, isCustomer, isReceptionist, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const demoUsers = mockAuthService.getDemoUsers();

  const handleSelectDemoUser = (user) => {
    switchAccount(user);
    setShowRoleMenu(false);
    if (user.role === 'ROLE_ADMIN') {
      navigate('/admin/dashboard');
    } else if (user.role === 'ROLE_RECEPTIONIST') {
      navigate('/receptionist/bookings');
    } else {
      navigate('/my-bookings');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return <span className="role-tag admin">Quản trị viên (Admin)</span>;
      case 'ROLE_RECEPTIONIST':
        return <span className="role-tag receptionist">Lễ tân (Receptionist)</span>;
      default:
        return <span className="role-tag customer">Khách hàng (Customer)</span>;
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
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="hotel-icon">🏨</span>
          <span className="brand-name">Grand Aurora Hotel</span>
        </Link>
      </div>

      {/* 2. Navigation Links */}
      <nav className="nav-links">
        {/* Home */}
        <Link to="/" className={location.pathname === '/' && !location.hash ? 'active' : ''}>
          Trang chủ
        </Link>

        {/* Room Catalog */}
        <Link to="/rooms" className={location.pathname === '/rooms' ? 'active' : ''}>
          Loại phòng
        </Link>

        {/* About */}
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

        {/* Contact */}
        <a
          href="#contact"
          onClick={(e) => {
            e.preventDefault();
            handleNavScroll('#contact');
          }}
          className={location.hash === '#contact' ? 'active' : ''}
        >
          Liên hệ
        </a>

        {/* Customer history */}
        {isCustomer && (
          <Link to="/my-bookings" className={location.pathname.startsWith('/my-bookings') ? 'active' : ''}>
            Lịch sử đặt
          </Link>
        )}

        {/* Receptionist links */}
        {(isReceptionist || isAdmin) && (
          <>
            <span className="nav-divider">|</span>
            <Link
              to="/receptionist/bookings"
              className={location.pathname === '/receptionist/bookings' ? 'active' : ''}
            >
              Vận hành Đơn
            </Link>
            <Link
              to="/receptionist/rooms"
              className={location.pathname === '/receptionist/rooms' ? 'active' : ''}
            >
              Buồng phòng
            </Link>
            <Link
              to="/receptionist/refunds"
              className={location.pathname === '/receptionist/refunds' ? 'active' : ''}
            >
              Duyệt Hoàn cọc
            </Link>
          </>
        )}

        {/* Admin links */}
        {isAdmin && (
          <>
            <span className="nav-divider">|</span>
            <Link to="/admin/dashboard" className={location.pathname === '/admin/dashboard' ? 'active' : ''}>
              Dashboard
            </Link>
            <Link to="/admin/room-types" className={location.pathname === '/admin/room-types' ? 'active' : ''}>
              QL Loại phòng
            </Link>
            <Link to="/admin/rooms" className={location.pathname === '/admin/rooms' ? 'active' : ''}>
              QL Phòng
            </Link>
          </>
        )}
      </nav>

      {/* 3. Header Right Actions: Login button, Register button, or User Profile */}
      <div className="header-right-actions">
        {currentUser ? (
          <div className="user-profile-widget">
            <div
              className="user-info-pill"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              title="Bấm để đổi vai trò thử nghiệm"
            >
              <div className="avatar-circle">
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="user-text">
                <span className="user-name">{currentUser.fullName}</span>
                {getRoleBadge(currentUser.role)}
              </div>
              <span className="dropdown-arrow">▾</span>
            </div>

            {showRoleMenu && (
              <div className="role-dropdown-menu">
                <div className="dropdown-title">Chuyển đổi tài khoản Demo:</div>
                {demoUsers.map((u) => (
                  <button
                    key={u.id}
                    className={`dropdown-item ${currentUser.id === u.id ? 'active' : ''}`}
                    onClick={() => handleSelectDemoUser(u)}
                  >
                    <div className="demo-user-name">{u.fullName}</div>
                    <div className="demo-user-email">{u.email} ({u.role})</div>
                  </button>
                ))}
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item logout-item"
                  onClick={() => {
                    logout();
                    setShowRoleMenu(false);
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
            {/* Quick Demo Switcher for convenience even when logged out */}
            <div className="user-profile-widget" style={{ marginRight: '0.4rem' }}>
              <button
                className="btn-demo-quick-toggle"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                title="Chọn nhanh vai trò để kiểm thử"
              >
                ⚡ Thử vai trò ▾
              </button>

              {showRoleMenu && (
                <div className="role-dropdown-menu">
                  <div className="dropdown-title">Chọn tài khoản Demo để đăng nhập nhanh:</div>
                  {demoUsers.map((u) => (
                    <button
                      key={u.id}
                      className="dropdown-item"
                      onClick={() => handleSelectDemoUser(u)}
                    >
                      <div className="demo-user-name">{u.fullName}</div>
                      <div className="demo-user-email">{u.email} ({u.role})</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

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

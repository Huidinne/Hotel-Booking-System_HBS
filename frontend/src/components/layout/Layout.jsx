import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ChatWidget } from '../chat/ChatWidget';
import { BookingStatusWatcher } from '../booking/BookingStatusWatcher';

export function Layout() {
  const { currentUser } = useAuth();

  // Chặn phía quản trị (Admin & Lễ tân) không thể truy cập vào giao diện trang chủ và website người dùng
  if (currentUser) {
    const role = (currentUser.role || '').toUpperCase();
    if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (role === 'ROLE_RECEPTIONIST' || role === 'RECEPTIONIST') {
      return <Navigate to="/receptionist/timeline" replace />;
    }
  }

  return (
    <div className="hotel-container">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
      <BookingStatusWatcher />
    </div>
  );
}

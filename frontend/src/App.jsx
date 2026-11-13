import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Customer Pages
import { HomePage } from './pages/customer/HomePage';
import { RoomCatalogPage } from './pages/customer/RoomCatalogPage';
import { RoomDetailPage } from './pages/customer/RoomDetailPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { PaymentReturnPage } from './pages/customer/PaymentReturnPage';
import { VnPayGatewayPage } from './pages/customer/VnPayGatewayPage';
import { QrPaymentPage } from './pages/customer/QrPaymentPage';
import { MyBookingsPage } from './pages/customer/MyBookingsPage';
import { ProfilePage } from './pages/customer/ProfilePage';

// Receptionist Pages
import { ReceptionistBookingsPage } from './pages/receptionist/ReceptionistBookingsPage';
import { HousekeepingPage } from './pages/receptionist/HousekeepingPage';
import { RefundManagementPage } from './pages/receptionist/RefundManagementPage';
import { RoomTimelinePage } from './pages/receptionist/RoomTimelinePage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminRoomTypesPage } from './pages/admin/AdminRoomTypesPage';
import { AdminRoomsPage } from './pages/admin/AdminRoomsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

import './App.css';

/**
 * CatchAllRedirect - Điều hướng an toàn cho các đường dẫn không tồn tại:
 * - Admin -> /admin/dashboard
 * - Lễ tân -> /receptionist/timeline
 * - Khách hàng / Khách vãng lai -> /
 */
function CatchAllRedirect() {
  const { currentUser } = useAuth();
  if (currentUser) {
    const role = (currentUser.role || '').toUpperCase();
    if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (role === 'ROLE_RECEPTIONIST' || role === 'RECEPTIONIST') {
      return <Navigate to="/receptionist/timeline" replace />;
    }
  }
  return <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              {/* 1. Website Khách Hàng (Customer Layout with Top Navbar & Footer) */}
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/rooms" element={<RoomCatalogPage />} />
                <Route path="/rooms/:id" element={<RoomDetailPage />} />
                <Route path="/booking/checkout" element={<ProtectedRoute allowedRoles={['CUSTOMER', 'RECEPTIONIST', 'ADMIN']}><CheckoutPage /></ProtectedRoute>} />
                <Route path="/payment/qr" element={<ProtectedRoute allowedRoles={['CUSTOMER', 'RECEPTIONIST', 'ADMIN']}><QrPaymentPage /></ProtectedRoute>} />
                <Route path="/payment/vnpay-gateway" element={<VnPayGatewayPage />} />
                <Route path="/payment/vnpay-return" element={<PaymentReturnPage />} />
                <Route path="/payment-result" element={<PaymentReturnPage />} />
                <Route path="/my-bookings" element={<ProtectedRoute allowedRoles={['CUSTOMER', 'RECEPTIONIST', 'ADMIN']}><MyBookingsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

                {/* Authentication Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* 2. Cổng Quản Trị & Vận Hành (Admin Layout with Left Navigation Sidebar) */}
              <Route element={<AdminLayout />}>
                {/* Admin Quick Redirect */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                {/* Admin Routes - Chỉ Admin có quyền truy cập */}
                <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>} />
                <Route path="/admin/room-types" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminRoomTypesPage /></ProtectedRoute>} />
                <Route path="/admin/rooms" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminRoomsPage /></ProtectedRoute>} />
                <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['ADMIN']}><AuditLogsPage /></ProtectedRoute>} />

                {/* Receptionist Quick Redirect */}
                <Route path="/receptionist" element={<Navigate to="/receptionist/timeline" replace />} />
                {/* Receptionist Routes - Lễ tân và Admin có quyền truy cập */}
                <Route path="/receptionist/bookings" element={<ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']}><ReceptionistBookingsPage /></ProtectedRoute>} />
                <Route path="/receptionist/rooms" element={<ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']}><HousekeepingPage /></ProtectedRoute>} />
                <Route path="/receptionist/refunds" element={<ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']}><RefundManagementPage /></ProtectedRoute>} />
                <Route path="/receptionist/timeline" element={<ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']}><RoomTimelinePage /></ProtectedRoute>} />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<CatchAllRedirect />} />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';

// Customer Pages
import { HomePage } from './pages/customer/HomePage';
import { RoomCatalogPage } from './pages/customer/RoomCatalogPage';
import { RoomDetailPage } from './pages/customer/RoomDetailPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { PaymentReturnPage } from './pages/customer/PaymentReturnPage';
import { MyBookingsPage } from './pages/customer/MyBookingsPage';

// Receptionist Pages
import { ReceptionistBookingsPage } from './pages/receptionist/ReceptionistBookingsPage';
import { HousekeepingPage } from './pages/receptionist/HousekeepingPage';
import { RefundManagementPage } from './pages/receptionist/RefundManagementPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminRoomTypesPage } from './pages/admin/AdminRoomTypesPage';
import { AdminRoomsPage } from './pages/admin/AdminRoomsPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              {/* Customer Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/rooms" element={<RoomCatalogPage />} />
              <Route path="/rooms/:id" element={<RoomDetailPage />} />
              <Route path="/booking/checkout" element={<CheckoutPage />} />
              <Route path="/payment/vnpay-return" element={<PaymentReturnPage />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />

              {/* Receptionist Routes */}
              <Route path="/receptionist/bookings" element={<ReceptionistBookingsPage />} />
              <Route path="/receptionist/rooms" element={<HousekeepingPage />} />
              <Route path="/receptionist/refunds" element={<RefundManagementPage />} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/room-types" element={<AdminRoomTypesPage />} />
              <Route path="/admin/rooms" element={<AdminRoomsPage />} />

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Catch-all redirect to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

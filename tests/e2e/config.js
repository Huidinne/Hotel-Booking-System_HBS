/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP2-1109-TRUNG], [SP2-1110-TRUNG], [SP3-1112-TRUNG]
 * File: tests/e2e/config.js
 * Purpose: Tham số hóa môi trường (BASE_URL), Mock/Sandbox flags & API Endpoints
 * =============================================================================
 */

const rawBaseUrl = process.env.BASE_URL || 'http://localhost:8080';
export const BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
export const API_BASE = `${BASE_URL}/api/v1`;
export const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 15000);

const cliArgs = new Set(process.argv.slice(2));

/**
 * Tách bạch chế độ CI Mock Mode vs Sandbox Manual Mode:
 * - USE_MOCK_PROVIDERS=true (mặc định trong CI / offline): Mock VNPay IPN & SMTP Mail, skip @sandbox-manual.
 * - RUN_SANDBOX_MANUAL=true hoặc cờ CLI `--include-sandbox`: Bật thực thi các ca kiểm thử @sandbox-manual.
 */
export const USE_MOCK_PROVIDERS = process.env.USE_MOCK_PROVIDERS !== 'false';
export const RUN_SANDBOX_MANUAL =
  process.env.RUN_SANDBOX_MANUAL === 'true' ||
  cliArgs.has('--include-sandbox') ||
  cliArgs.has('--sandbox-manual');

export const CHECK_KNOWN_BUGS =
  process.env.CHECK_KNOWN_BUGS === 'true' || cliArgs.has('--verify-bugs');

export const VNPAY_SANDBOX_URL = process.env.VNPAY_PAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
export const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET || 'DEMO_HASH_SECRET';

export const ENDPOINTS = {
  // Health & Actuator
  HEALTH: `${API_BASE}/health`,
  ACTUATOR_HEALTH: `${BASE_URL}/actuator/health`,

  // Auth
  REGISTER: `${API_BASE}/auth/register`,
  LOGIN: `${API_BASE}/auth/login`,
  ME: `${API_BASE}/auth/me`,
  REFRESH: `${API_BASE}/auth/refresh`,

  // Room & Room Types (Public + Timeline)
  ROOM_TYPES: `${API_BASE}/room-types`,
  ROOMS_TIMELINE: `${API_BASE}/rooms/timeline`,

  // Bookings (Customer)
  BOOKINGS: `${API_BASE}/bookings`,
  MY_BOOKINGS: `${API_BASE}/bookings/my-bookings`,
  BOOKING_BY_CODE: (code) => `${API_BASE}/bookings/${code}`,
  BOOKING_CANCEL: (code) => `${API_BASE}/bookings/${code}/cancel`,
  BOOKING_INVOICE_PDF: (idOrCode) => `${API_BASE}/bookings/${idOrCode}/invoice-pdf`,
  BOOKING_SEND_EMAIL: (idOrCode) => `${API_BASE}/bookings/${idOrCode}/send-invoice-email`,

  // Receptionist Operations (Timeline, Check-in, Check-out, Cleaning, Refunds)
  RECEPTIONIST_ROOMS: `${API_BASE}/receptionist/rooms`,
  RECEPTIONIST_AVAILABLE_ROOMS: `${API_BASE}/receptionist/rooms/available`,
  RECEPTIONIST_ROOM_STATUS: (roomId) => `${API_BASE}/receptionist/rooms/${roomId}/status`,
  RECEPTIONIST_TIMELINE: `${API_BASE}/receptionist/rooms/timeline`,
  RECEPTIONIST_BOOKINGS: `${API_BASE}/receptionist/bookings`,
  RECEPTIONIST_BOOKING_CONFIRM: (bookingId) => `${API_BASE}/receptionist/bookings/${bookingId}/confirm`,
  RECEPTIONIST_CHECK_IN: (bookingId) => `${API_BASE}/receptionist/bookings/${bookingId}/check-in`,
  RECEPTIONIST_CHECK_OUT: (bookingId) => `${API_BASE}/receptionist/bookings/${bookingId}/check-out`,
  RECEPTIONIST_REFUNDS: `${API_BASE}/receptionist/refunds`,
  RECEPTIONIST_REFUND_CONFIRM: (bookingId) => `${API_BASE}/receptionist/refunds/${bookingId}/confirm`,

  // Payments (VNPay & Ledger)
  VNPAY_IPN: `${API_BASE}/payments/vnpay-ipn`,
  VNPAY_RETURN: `${API_BASE}/payments/vnpay-return`,
  ADMIN_PAYMENT_LEDGER: `${API_BASE}/admin/payment-ledger`,
  ADMIN_PAYMENT_LEDGER_SUMMARY: `${API_BASE}/admin/payment-ledger/summary`,

  // Dashboard & Audit (Admin)
  ADMIN_DASHBOARD_SUMMARY: `${API_BASE}/admin/dashboard/summary`,
  ADMIN_DASHBOARD_MONTHLY: `${API_BASE}/admin/dashboard/monthly-revenue`,
  AUDIT_LOGS: `${API_BASE}/admin/audit-logs`,
  AUDIT_ACTIONS: `${API_BASE}/admin/audit-logs/actions`,

  // Chatbot
  CHAT_MESSAGE: `${API_BASE}/chat/message`,
  CHAT_CONFIRM: `${API_BASE}/chat/booking/confirm`,

  // Mock / Diagnostics Email Endpoint
  EMAIL_TEST_CONFIRMATION: `${API_BASE}/test/email/booking-confirmation`,
  EMAIL_TEST_MOCK_OUTBOX: `${API_BASE}/test/email/mock-outbox`,
};

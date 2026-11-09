/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP2-1109-TRUNG]
 * File: tests/e2e/config.js
 * Purpose: Cấu hình tham số môi trường và endpoints cho bộ test E2E
 * =============================================================================
 */

// Tham số hóa Base URL thông qua biến môi trường BASE_URL
const rawBaseUrl = process.env.BASE_URL || 'http://localhost:8080';
export const BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
export const API_BASE = `${BASE_URL}/api/v1`;

export const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 10000);

export const ENDPOINTS = {
  // Auth
  REGISTER: `${API_BASE}/auth/register`,
  LOGIN: `${API_BASE}/auth/login`,
  ME: `${API_BASE}/auth/me`,
  REFRESH: `${API_BASE}/auth/refresh`,
  
  // Booking
  ROOM_TYPES: `${API_BASE}/room-types`,
  BOOKINGS: `${API_BASE}/bookings`,
  MY_BOOKINGS: `${API_BASE}/bookings/my-bookings`,
  
  // Audit
  AUDIT_LOGS: `${API_BASE}/admin/audit-logs`,
  AUDIT_ACTIONS: `${API_BASE}/admin/audit-logs/actions`,
  
  // Chat
  CHAT_MESSAGE: `${API_BASE}/chat/message`,
  CHAT_CONFIRM: `${API_BASE}/chat/booking/confirm`,
};


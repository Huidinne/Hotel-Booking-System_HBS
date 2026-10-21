// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - AUTHENTICATION SERVICE ABSTRACTION
// File: src/services/authService.ts
// =============================================================================

import { mockAuthService } from './mockAuthService';

// Forwarding all calls to mockAuthService during MVP phase
// TODO: Replace mock implementation with real backend API when available:
// - POST /api/v1/auth/login
// - POST /api/v1/auth/register
// - POST /api/v1/auth/logout
// - GET /api/v1/auth/me
export const authService = mockAuthService;

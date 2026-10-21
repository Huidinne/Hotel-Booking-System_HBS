// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - AUTHENTICATION MOCK DATA
// File: src/mock/authMock.ts
// =============================================================================

import { User } from '../types/auth';

export const MOCK_USERS: (User & { passwordHash?: string })[] = [
  {
    id: 1,
    email: 'admin@hotel.com',
    fullName: 'Quản Trị Viên (Admin)',
    phone: '0901234567',
    role: 'ROLE_ADMIN',
    isActive: true,
  },
  {
    id: 2,
    email: 'receptionist@hotel.com',
    fullName: 'Lễ Tân Khách Sạn',
    phone: '0912345678',
    role: 'ROLE_RECEPTIONIST',
    isActive: true,
  },
  {
    id: 3,
    email: 'customer@gmail.com',
    fullName: 'Nguyễn Văn Khách',
    phone: '0987654321',
    role: 'ROLE_CUSTOMER',
    isActive: true,
  },
  {
    id: 4,
    email: 'tranvanb@gmail.com',
    fullName: 'Trần Văn Bình',
    phone: '0933445566',
    role: 'ROLE_CUSTOMER',
    isActive: true,
  },
];

// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOG MOCK DATA & FIXTURES
// File: src/mock/auditMock.ts
// Contract: [SP2-1104-ANH] docs/api/audit-log.md
// =============================================================================

import { AuditActionMeta, AuditLogItem, AuditLogPageResponse } from '../types/audit';

export const AUDIT_ACTIONS_METADATA: AuditActionMeta[] = [
  { name: 'CHECK_IN_ASSIGN_ROOM', description: 'Gán phòng & Check-in cho khách' },
  { name: 'CHECK_OUT_SETTLEMENT', description: 'Check-out & Đối soát thanh toán' },
  { name: 'CANCEL_BOOKING', description: 'Hủy đơn đặt phòng & Tính phạt' },
  { name: 'CONFIRM_BOOKING', description: 'Xác nhận đặt phòng' },
  { name: 'CONFIRM_REFUND', description: 'Xác nhận hoàn tiền' },
  { name: 'CHANGE_ROOM_STATUS', description: 'Thay đổi trạng thái phòng vật lý' },
  { name: 'UPDATE_PRICE', description: 'Cập nhật giá loại phòng' },
  { name: 'CREATE_BOOKING', description: 'Tạo đơn đặt phòng' },
  { name: 'MARK_NO_SHOW', description: 'Đánh dấu khách vắng mặt (No-Show)' },
  { name: 'LOGIN_SUCCESS', description: 'Đăng nhập thành công' },
  { name: 'LOGIN_FAILED', description: 'Đăng nhập thất bại' },
];

export const MOCK_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 112,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CHECK_IN_ASSIGN_ROOM',
    actionDescription: 'Gán phòng & Check-in cho khách',
    targetType: 'BOOKING',
    targetId: 'BK-20261104-005',
    description: 'Check-in thành công cho khách Nguyễn Hoàng Nam, gán phòng 204 (Deluxe Ocean)',
    oldValues: {
      bookingCode: 'BK-20261104-005',
      bookingStatus: 'CONFIRMED',
      assignedRooms: [],
    },
    newValues: {
      bookingCode: 'BK-20261104-005',
      bookingStatus: 'CHECKED_IN',
      assignedRooms: ['204'],
      roomStatus: 'OCCUPIED',
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T16:45:10',
  },
  {
    id: 111,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'CONFIRM_REFUND',
    actionDescription: 'Xác nhận hoàn tiền',
    targetType: 'PAYMENT',
    targetId: 'TXN-20261104-009',
    description: 'Duyệt hoàn trả tiền cọc 1,500,000 VND qua tài khoản Vietcombank ******5678',
    oldValues: {
      paymentStatus: 'REFUND_PENDING',
      refundAmount: 1500000.0,
      bankAccount: '******5678',
      bankName: 'Vietcombank',
    },
    newValues: {
      paymentStatus: 'REFUNDED',
      bankTransactionRef: 'VCB-REF-998822',
      refundedAt: '2026-11-04T16:15:00',
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T16:15:22',
  },
  {
    id: 110,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CANCEL_BOOKING',
    actionDescription: 'Hủy đơn đặt phòng & Tính phạt',
    targetType: 'BOOKING',
    targetId: 'BK-20261104-001',
    description: 'Hủy đơn đặt phòng theo yêu cầu của khách; áp dụng phạt 0% theo mốc >24h',
    oldValues: {
      bookingCode: 'BK-20261104-001',
      bookingStatus: 'CONFIRMED',
      totalAmount: 3000000.0,
      paidAmount: 1500000.0,
    },
    newValues: {
      bookingCode: 'BK-20261104-001',
      bookingStatus: 'CANCELLED',
      paymentStatus: 'REFUND_PENDING',
      penaltyAmount: 0.0,
      refundAmount: 1500000.0,
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T15:30:00',
  },
  {
    id: 109,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CHECK_OUT_SETTLEMENT',
    actionDescription: 'Check-out & Đối soát thanh toán',
    targetType: 'BOOKING',
    targetId: 'BK-20261102-018',
    description: 'Thu phần tiền còn lại 1,200,000 VND và hoàn tất trả phòng 102',
    oldValues: {
      bookingCode: 'BK-20261102-018',
      bookingStatus: 'CHECKED_IN',
      paymentStatus: 'PARTIALLY_PAID',
      remainingDue: 1200000.0,
      roomStatus: 'OCCUPIED',
    },
    newValues: {
      bookingCode: 'BK-20261102-018',
      bookingStatus: 'CHECKED_OUT',
      paymentStatus: 'FULLY_PAID',
      remainingDue: 0.0,
      roomStatus: 'CLEANING',
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T12:05:44',
  },
  {
    id: 108,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CHANGE_ROOM_STATUS',
    actionDescription: 'Thay đổi trạng thái phòng vật lý',
    targetType: 'ROOM',
    targetId: '105',
    description: 'Cập nhật buồng phòng sau vệ sinh: CLEANING -> AVAILABLE',
    oldValues: {
      roomNumber: '105',
      status: 'CLEANING',
    },
    newValues: {
      roomNumber: '105',
      status: 'AVAILABLE',
      inspectedBy: 'receptionist@hotel.com',
    },
    ipAddress: '192.168.1.18',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T11:40:12',
  },
  {
    id: 107,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'UPDATE_PRICE',
    actionDescription: 'Cập nhật giá loại phòng',
    targetType: 'ROOM_TYPE',
    targetId: 'RT-DELUXE-01',
    description: 'Điều chỉnh giá niêm yết phòng Deluxe từ 1,200,000 VND lên 1,350,000 VND',
    oldValues: {
      roomTypeCode: 'RT-DELUXE-01',
      basePrice: 1200000.0,
    },
    newValues: {
      roomTypeCode: 'RT-DELUXE-01',
      basePrice: 1350000.0,
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T10:20:00',
  },
  {
    id: 106,
    actorId: null,
    actorEmail: 'SYSTEM',
    actorRole: 'SYSTEM',
    action: 'MARK_NO_SHOW',
    actionDescription: 'Đánh dấu khách vắng mặt (No-Show)',
    targetType: 'BOOKING',
    targetId: 'BK-20261103-044',
    description: 'Cronjob tự động hủy đơn do quá 12:00 ngày CheckIn+1 không nhận phòng',
    oldValues: {
      bookingCode: 'BK-20261103-044',
      bookingStatus: 'CONFIRMED',
    },
    newValues: {
      bookingCode: 'BK-20261103-044',
      bookingStatus: 'NO_SHOW',
      quotaReleased: true,
    },
    ipAddress: '127.0.0.1',
    userAgent: 'Spring-Scheduled-CronJob',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T12:05:00',
  },
  {
    id: 105,
    actorId: 9,
    actorEmail: 'customer1@gmail.com',
    actorRole: 'ROLE_CUSTOMER',
    action: 'CREATE_BOOKING',
    actionDescription: 'Tạo đơn đặt phòng',
    targetType: 'BOOKING',
    targetId: 'BK-20261104-099',
    description: 'Khách hàng tạo đơn đặt 1 phòng Deluxe Ocean view ngày 10/11 - 12/11',
    oldValues: null,
    newValues: {
      bookingCode: 'BK-20261104-099',
      roomTypeId: 2,
      roomCount: 1,
      totalAmount: 2700000.0,
      holdExpiresAt: '2026-11-04T09:30:00',
    },
    ipAddress: '113.190.234.12',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari/604.1',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T09:15:00',
  },
  {
    id: 104,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'LOGIN_SUCCESS',
    actionDescription: 'Đăng nhập thành công',
    targetType: 'USER',
    targetId: '1',
    description: 'Quản trị viên đăng nhập hệ thống thành công',
    oldValues: null,
    newValues: {
      loginTime: '2026-11-04T08:00:15',
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T08:00:15',
  },
  {
    id: 103,
    actorId: null,
    actorEmail: 'unknown_hacker@dark.net',
    actorRole: 'ANONYMOUS',
    action: 'LOGIN_FAILED',
    actionDescription: 'Đăng nhập thất bại',
    targetType: 'USER',
    targetId: 'admin@hotel.com',
    description: 'Thử đăng nhập sai mật khẩu 3 lần liên tiếp',
    oldValues: null,
    newValues: null,
    ipAddress: '45.134.22.88',
    userAgent: 'Python-requests/2.31.0',
    status: 'FAILED',
    errorMessage: 'Bad credentials',
    createdAt: '2026-11-04T03:12:40',
  },
];

/**
 * Filter and paginate in-memory mock logs for development and testing.
 */
export function getMockAuditLogs(
  filter?: {
    startDate?: string;
    endDate?: string;
    action?: string;
    actorEmail?: string;
    actorRole?: string;
    status?: string;
    searchTerm?: string;
  },
  page = 0,
  size = 10
): AuditLogPageResponse {
  let filtered = [...MOCK_AUDIT_LOGS];

  if (filter?.action && filter.action !== 'ALL') {
    filtered = filtered.filter((item) => item.action === filter.action);
  }

  if (filter?.actorRole && filter.actorRole !== 'ALL') {
    filtered = filtered.filter((item) => item.actorRole === filter.actorRole);
  }

  if (filter?.status && filter.status !== 'ALL') {
    filtered = filtered.filter((item) => item.status === filter.status);
  }

  if (filter?.actorEmail) {
    const q = filter.actorEmail.toLowerCase().trim();
    filtered = filtered.filter((item) => item.actorEmail.toLowerCase().includes(q));
  }

  if (filter?.searchTerm) {
    const q = filter.searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (item) =>
        item.actorEmail.toLowerCase().includes(q) ||
        (item.targetId && item.targetId.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.ipAddress && item.ipAddress.includes(q))
    );
  }

  if (filter?.startDate) {
    filtered = filtered.filter((item) => item.createdAt >= filter.startDate!);
  }

  if (filter?.endDate) {
    // Include full day of endDate
    const endBound = filter.endDate.length <= 10 ? `${filter.endDate}T23:59:59` : filter.endDate;
    filtered = filtered.filter((item) => item.createdAt <= endBound);
  }

  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const currentPage = Math.min(Math.max(0, page), totalPages - 1);
  const startIdx = currentPage * size;
  const content = filtered.slice(startIdx, startIdx + size);

  return {
    content,
    page: currentPage,
    size,
    totalElements,
    totalPages,
    first: currentPage === 0,
    last: currentPage >= totalPages - 1,
  };
}

export const mockAuditLogs = MOCK_AUDIT_LOGS;


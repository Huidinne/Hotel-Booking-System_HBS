// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOG MOCK DATA & FIXTURES
// File: src/mock/auditMock.ts
// Contract: [SP2-1104-ANH] docs/api/audit-log.md
// Rich fixtures with null JSON, long strings, multiple pages (>25 items)
// =============================================================================

import { AuditActionMeta, AuditLogFilterParams, AuditLogItem, AuditLogPageResponse } from '../types/audit';

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
  // --- Page 1 (Items 1 - 8) ---
  {
    id: 126,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CHECK_IN_ASSIGN_ROOM',
    actionDescription: 'Gán phòng & Check-in cho khách',
    targetType: 'BOOKING',
    targetId: 'BK-20261105-012',
    description: 'Check-in thành công cho khách Đặng Thu Hà, gán phòng 302 (Deluxe Sea View)',
    oldValues: {
      bookingCode: 'BK-20261105-012',
      bookingStatus: 'CONFIRMED',
      assignedRooms: [],
    },
    newValues: {
      bookingCode: 'BK-20261105-012',
      bookingStatus: 'CHECKED_IN',
      assignedRooms: ['302'],
      roomStatus: 'OCCUPIED',
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-05T11:45:10',
  },
  {
    id: 125,
    actorId: null,
    actorEmail: 'nguyen.hoang.long.developer.specialist.verylong@corporation.international.hotel-group.vn',
    actorRole: 'ROLE_CUSTOMER',
    action: 'CREATE_BOOKING',
    actionDescription: 'Tạo đơn đặt phòng',
    targetType: 'BOOKING',
    targetId: 'BK-20261105-011',
    description: 'Khách hàng VIP tạo đơn đặt phòng trực tuyến 4 đêm phòng President Suite Luxury',
    // TEST CASE: oldValues is null for newly created entity
    oldValues: null,
    newValues: {
      bookingCode: 'BK-20261105-011',
      roomTypeId: 4,
      roomTypeName: 'President Suite Luxury Oceanfront',
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-14',
      totalAmount: 18000000.0,
      depositAmount: 9000000.0,
      paymentStatus: 'UNPAID',
    },
    ipAddress: '113.190.234.88',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-05T10:30:15',
  },
  {
    id: 124,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'UPDATE_PRICE',
    actionDescription: 'Cập nhật giá loại phòng',
    targetType: 'ROOM_TYPE',
    targetId: 'RT-03',
    description: 'Điều chỉnh giá phòng Deluxe hướng biển áp dụng mùa du lịch cao điểm cuối năm',
    oldValues: {
      roomTypeId: 3,
      name: 'Deluxe Sea View',
      basePricePerNight: 1200000.0,
      weekendSurchargePercent: 10,
    },
    newValues: {
      roomTypeId: 3,
      name: 'Deluxe Sea View',
      basePricePerNight: 1450000.0,
      weekendSurchargePercent: 15,
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-05T09:12:00',
  },
  {
    id: 123,
    actorId: null,
    actorEmail: 'unknown.intruder.suspicious@external-botnet.org',
    actorRole: 'SYSTEM',
    action: 'LOGIN_FAILED',
    actionDescription: 'Đăng nhập thất bại',
    targetType: 'AUTH',
    targetId: 'AUTH-FAIL-9941',
    description: 'Phát hiện đăng nhập thất bại vượt quá 5 lần từ địa chỉ IP bất thường',
    // TEST CASE: Both oldValues and newValues are null, with very long error message
    oldValues: null,
    newValues: null,
    ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    userAgent: 'Python-requests/2.32.3 (+https://bot.example.com)',
    status: 'FAILED',
    errorMessage: 'Sai mật khẩu 5 lần liên tiếp. Tài khoản tạm thời bị khóa 15 phút theo quy chuẩn bảo mật OWASP. IP nguồn đã bị đưa vào danh sách giám sát cảnh báo cấp độ 2.',
    createdAt: '2026-11-05T08:04:22',
  },
  {
    id: 122,
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
    id: 121,
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
    createdAt: '2026-11-04T15:20:44',
  },
  {
    id: 120,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CHANGE_ROOM_STATUS',
    actionDescription: 'Thay đổi trạng thái phòng vật lý',
    targetType: 'ROOM',
    targetId: 'ROOM-102',
    description: 'Chuyển trạng thái phòng 102 sang BẢO TRÌ do sự cố điều hòa rò nước',
    oldValues: {
      roomNumber: '102',
      status: 'AVAILABLE',
      cleanStatus: 'CLEAN',
    },
    newValues: {
      roomNumber: '102',
      status: 'MAINTENANCE',
      reason: 'Sự cố điều hòa Daikin rò nước, dự kiến khắc phục trong 24h',
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T14:10:05',
  },
  {
    id: 119,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CHECK_OUT_SETTLEMENT',
    actionDescription: 'Check-out & Đối soát thanh toán',
    targetType: 'BOOKING',
    targetId: 'BK-20261102-088',
    description: 'Khách Hoàng Văn Nam thanh toán nốt tiền phòng và check-out trả phòng 205',
    oldValues: {
      bookingCode: 'BK-20261102-088',
      bookingStatus: 'CHECKED_IN',
      assignedRooms: ['205'],
      remainingAmount: 1200000.0,
      paymentStatus: 'PARTIALLY_PAID',
    },
    newValues: {
      bookingCode: 'BK-20261102-088',
      bookingStatus: 'CHECKED_OUT',
      paymentStatus: 'FULLY_PAID',
      settledAt: '2026-11-04T12:00:00',
      roomStatus: 'CLEANING',
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T12:05:30',
  },

  // --- Page 2 (Items 9 - 16) ---
  {
    id: 118,
    actorId: null,
    actorEmail: 'system-scheduler@hotel.internal',
    actorRole: 'SYSTEM',
    action: 'MARK_NO_SHOW',
    actionDescription: 'Đánh dấu khách vắng mặt (No-Show)',
    targetType: 'BOOKING',
    targetId: 'BK-20261103-044',
    description: 'Cronjob tự động quét và đánh dấu No-Show sau 23:59 ngày nhận phòng',
    oldValues: {
      bookingCode: 'BK-20261103-044',
      bookingStatus: 'CONFIRMED',
      customerName: 'Trần Văn Hải',
      depositAmount: 800000.0,
    },
    newValues: {
      bookingCode: 'BK-20261103-044',
      bookingStatus: 'NO_SHOW',
      depositRetained: 800000.0,
      markedByCronAt: '2026-11-04T00:05:00',
    },
    ipAddress: '127.0.0.1',
    userAgent: 'Spring-Boot-TaskScheduler/3.3.5',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-04T00:05:01',
  },
  {
    id: 117,
    actorId: 5,
    actorEmail: 'customer.minhthu@gmail.com',
    actorRole: 'ROLE_CUSTOMER',
    action: 'LOGIN_SUCCESS',
    actionDescription: 'Đăng nhập thành công',
    targetType: 'AUTH',
    targetId: 'USER-5',
    description: 'Khách hàng đăng nhập thành công vào website cổng đặt phòng',
    // TEST CASE: oldValues is null (auth event)
    oldValues: null,
    newValues: {
      userId: 5,
      email: 'customer.minhthu@gmail.com',
      authMethod: 'PASSWORD_BCRYPT',
      issuedTokenExp: '2026-11-04T00:00:00',
    },
    ipAddress: '118.69.182.41',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-03T21:40:12',
  },
  {
    id: 116,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'CHANGE_ROOM_STATUS',
    actionDescription: 'Thay đổi trạng thái phòng vật lý',
    targetType: 'ROOM',
    targetId: 'ROOM-405',
    description: 'Chuyển phòng 405 từ Sẵn sàng sang Đang dọn dẹp sau khi phun khử khuẩn',
    oldValues: {
      roomNumber: '405',
      status: 'AVAILABLE',
    },
    newValues: {
      roomNumber: '405',
      status: 'CLEANING',
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-03T18:22:19',
  },
  {
    id: 115,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CONFIRM_BOOKING',
    actionDescription: 'Xác nhận đặt phòng',
    targetType: 'BOOKING',
    targetId: 'BK-20261103-019',
    description: 'Lễ tân xác nhận giữ phòng sau khi nhận được ủy nhiệm chi ngân hàng',
    oldValues: {
      bookingCode: 'BK-20261103-019',
      bookingStatus: 'PENDING',
    },
    newValues: {
      bookingCode: 'BK-20261103-019',
      bookingStatus: 'CONFIRMED',
      confirmedBy: 'receptionist@hotel.com',
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-03T15:10:45',
  },
  {
    id: 114,
    actorId: null,
    actorEmail: 'guest.checkout.error@unstable-network.com',
    actorRole: 'ROLE_CUSTOMER',
    action: 'CONFIRM_REFUND',
    actionDescription: 'Xác nhận hoàn tiền',
    targetType: 'PAYMENT',
    targetId: 'TXN-ERROR-4091',
    description: 'Thanh toán hoàn cọc bị gián đoạn do lỗi cổng kết nối trung gian',
    // TEST CASE: newValues is null on failure
    oldValues: {
      transactionId: 'TXN-ERROR-4091',
      expectedRefund: 2200000.0,
      gateway: 'VNPAY',
    },
    newValues: null,
    ipAddress: '42.118.10.99',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
    status: 'FAILED',
    errorMessage: 'Connection timeout while contacting VNPay Payment Gateway API v2 after 3 retries (5000ms threshold exceeded). Socket closed unexpectedly by remote peer 103.20.128.45:443.',
    createdAt: '2026-11-03T11:05:00',
  },
  {
    id: 113,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'UPDATE_PRICE',
    actionDescription: 'Cập nhật giá loại phòng',
    targetType: 'ROOM_TYPE',
    targetId: 'RT-01',
    description: 'Cập nhật giá phòng Standard Đơn từ 500,000 sang 550,000 VND',
    oldValues: {
      roomTypeId: 1,
      name: 'Standard Single',
      basePrice: 500000.0,
    },
    newValues: {
      roomTypeId: 1,
      name: 'Standard Single',
      basePrice: 550000.0,
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-02T16:30:00',
  },
  {
    id: 112,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CHECK_IN_ASSIGN_ROOM',
    actionDescription: 'Gán phòng & Check-in cho khách',
    targetType: 'BOOKING',
    targetId: 'BK-20261102-005',
    description: 'Check-in thành công cho khách Nguyễn Hoàng Nam, gán phòng 204 (Deluxe Ocean)',
    oldValues: {
      bookingCode: 'BK-20261102-005',
      bookingStatus: 'CONFIRMED',
      assignedRooms: [],
    },
    newValues: {
      bookingCode: 'BK-20261102-005',
      bookingStatus: 'CHECKED_IN',
      assignedRooms: ['204'],
      roomStatus: 'OCCUPIED',
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-02T14:45:10',
  },
  {
    id: 111,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CHANGE_ROOM_STATUS',
    actionDescription: 'Thay đổi trạng thái phòng vật lý',
    targetType: 'ROOM',
    targetId: 'ROOM-301',
    description: 'Hoàn tất dọn dẹp buồng phòng, chuyển phòng 301 sang trạng thái SẴN SÀNG',
    oldValues: {
      roomNumber: '301',
      status: 'CLEANING',
    },
    newValues: {
      roomNumber: '301',
      status: 'AVAILABLE',
      inspectedBy: 'receptionist@hotel.com',
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-02T10:15:00',
  },

  // --- Page 3 (Items 17 - 24) ---
  {
    id: 110,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'CREATE_BOOKING',
    actionDescription: 'Tạo đơn đặt phòng',
    targetType: 'BOOKING',
    targetId: 'BK-20261101-001',
    description: 'Admin tạo đặt phòng trực tiếp tại quầy cho đoàn khách doanh nghiệp',
    oldValues: null,
    newValues: {
      bookingCode: 'BK-20261101-001',
      groupName: 'Cong ty FPT Software',
      totalRooms: 5,
      totalAmount: 12500000.0,
      depositAmount: 6250000.0,
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-11-01T15:00:20',
  },
  {
    id: 109,
    actorId: null,
    actorEmail: 'khachhang.lethihong@outlook.com',
    actorRole: 'ROLE_CUSTOMER',
    action: 'LOGIN_FAILED',
    actionDescription: 'Đăng nhập thất bại',
    targetType: 'AUTH',
    targetId: 'AUTH-FAIL-109',
    description: 'Khách hàng nhập sai mật khẩu 2 lần',
    oldValues: null,
    newValues: null,
    ipAddress: '125.235.239.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0',
    status: 'FAILED',
    errorMessage: 'Sai mật khẩu xác thực (BadCredentialsException). Vui lòng thử lại.',
    createdAt: '2026-11-01T09:40:11',
  },
  {
    id: 108,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CHECK_OUT_SETTLEMENT',
    actionDescription: 'Check-out & Đối soát thanh toán',
    targetType: 'BOOKING',
    targetId: 'BK-20261031-099',
    description: 'Hoàn tất thủ tục trả phòng 104 cho khách Vũ Tuấn Anh',
    oldValues: {
      bookingCode: 'BK-20261031-099',
      bookingStatus: 'CHECKED_IN',
    },
    newValues: {
      bookingCode: 'BK-20261031-099',
      bookingStatus: 'CHECKED_OUT',
      roomStatus: 'CLEANING',
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-10-31T11:50:00',
  },
  {
    id: 107,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'CONFIRM_REFUND',
    actionDescription: 'Xác nhận hoàn tiền',
    targetType: 'PAYMENT',
    targetId: 'TXN-20261030-011',
    description: 'Duyệt lệnh hoàn tiền hủy phòng trước 48h cho khách hàng Phan Thị Mai',
    oldValues: {
      paymentStatus: 'REFUND_PENDING',
      amount: 900000.0,
    },
    newValues: {
      paymentStatus: 'REFUNDED',
      amount: 900000.0,
      bankTrace: 'MB-REF-332145',
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-10-30T17:25:33',
  },
  {
    id: 106,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CANCEL_BOOKING',
    actionDescription: 'Hủy đơn đặt phòng & Tính phạt',
    targetType: 'BOOKING',
    targetId: 'BK-20261029-015',
    description: 'Khách hủy phòng sát giờ (dưới 12h), thu phí phạt 50% tiền cọc',
    oldValues: {
      bookingCode: 'BK-20261029-015',
      bookingStatus: 'CONFIRMED',
      depositAmount: 1000000.0,
    },
    newValues: {
      bookingCode: 'BK-20261029-015',
      bookingStatus: 'CANCELLED',
      penaltyAmount: 500000.0,
      refundAmount: 500000.0,
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-10-29T14:12:00',
  },
  {
    id: 105,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'CHANGE_ROOM_STATUS',
    actionDescription: 'Thay đổi trạng thái phòng vật lý',
    targetType: 'ROOM',
    targetId: 'ROOM-501',
    description: 'Mở lại phòng 501 sau 3 ngày đại tu hệ thống nước nóng',
    oldValues: {
      roomNumber: '501',
      status: 'MAINTENANCE',
    },
    newValues: {
      roomNumber: '501',
      status: 'AVAILABLE',
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-10-28T16:00:00',
  },
  {
    id: 104,
    actorId: null,
    actorEmail: 'system-scheduler@hotel.internal',
    actorRole: 'SYSTEM',
    action: 'MARK_NO_SHOW',
    actionDescription: 'Đánh dấu khách vắng mặt (No-Show)',
    targetType: 'BOOKING',
    targetId: 'BK-20261027-040',
    description: 'Hệ thống tự động hủy phòng khách không đến nhận sau thời gian quy định',
    oldValues: {
      bookingCode: 'BK-20261027-040',
      bookingStatus: 'CONFIRMED',
    },
    newValues: {
      bookingCode: 'BK-20261027-040',
      bookingStatus: 'NO_SHOW',
    },
    ipAddress: '127.0.0.1',
    userAgent: 'Spring-Boot-TaskScheduler/3.3.5',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-10-28T00:05:00',
  },
  {
    id: 103,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'LOGIN_SUCCESS',
    actionDescription: 'Đăng nhập thành công',
    targetType: 'AUTH',
    targetId: 'USER-1',
    description: 'Quản trị viên đăng nhập vào hệ thống quản lý khách sạn HBS Admin Portal',
    oldValues: null,
    newValues: {
      username: 'admin@hotel.com',
      role: 'ROLE_ADMIN',
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-10-27T08:00:00',
  },

  // --- Page 4 (Items 25 - 26) ---
  {
    id: 102,
    actorId: 2,
    actorEmail: 'receptionist@hotel.com',
    actorRole: 'ROLE_RECEPTIONIST',
    action: 'CONFIRM_BOOKING',
    actionDescription: 'Xác nhận đặt phòng',
    targetType: 'BOOKING',
    targetId: 'BK-20261026-003',
    description: 'Xác nhận đơn đặt phòng cuối tuần của gia đình anh Nguyễn Văn Chung',
    oldValues: {
      bookingCode: 'BK-20261026-003',
      bookingStatus: 'PENDING',
    },
    newValues: {
      bookingCode: 'BK-20261026-003',
      bookingStatus: 'CONFIRMED',
    },
    ipAddress: '192.168.1.15',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-10-26T14:30:00',
  },
  {
    id: 101,
    actorId: 1,
    actorEmail: 'admin@hotel.com',
    actorRole: 'ROLE_ADMIN',
    action: 'UPDATE_PRICE',
    actionDescription: 'Cập nhật giá loại phòng',
    targetType: 'ROOM_TYPE',
    targetId: 'RT-02',
    description: 'Thiết lập bảng giá mùa thấp điểm cho phòng Superior Double',
    oldValues: {
      roomTypeId: 2,
      basePrice: 950000.0,
    },
    newValues: {
      roomTypeId: 2,
      basePrice: 850000.0,
    },
    ipAddress: '14.162.140.28',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status: 'SUCCESS',
    errorMessage: null,
    createdAt: '2026-10-25T10:00:00',
  },
];

/**
 * Filter and paginate mock data mimicking Spring Data Pageable
 */
export function getMockAuditLogs(
  filter?: AuditLogFilterParams,
  page = 0,
  size = 10
): AuditLogPageResponse {
  let filtered = [...MOCK_AUDIT_LOGS];

  if (filter?.action && filter.action !== 'ALL' && filter.action.trim() !== '') {
    filtered = filtered.filter((item) => item.action === filter.action);
  }

  if (filter?.actorRole && filter.actorRole !== 'ALL' && filter.actorRole.trim() !== '') {
    filtered = filtered.filter((item) => item.actorRole === filter.actorRole);
  }

  if (filter?.status && filter.status !== 'ALL' && filter.status.trim() !== '') {
    filtered = filtered.filter((item) => item.status === filter.status);
  }

  if (filter?.actorEmail && filter.actorEmail.trim() !== '') {
    const q = filter.actorEmail.toLowerCase().trim();
    filtered = filtered.filter((item) => item.actorEmail.toLowerCase().includes(q));
  }

  if (filter?.targetType && filter.targetType.trim() !== '') {
    const q = filter.targetType.toLowerCase().trim();
    filtered = filtered.filter((item) => item.targetType.toLowerCase().includes(q));
  }

  if (filter?.targetId && filter.targetId.trim() !== '') {
    const q = filter.targetId.toLowerCase().trim();
    filtered = filtered.filter((item) => item.targetId && item.targetId.toLowerCase().includes(q));
  }

  if (filter?.searchTerm && filter.searchTerm.trim() !== '') {
    const q = filter.searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (item) =>
        item.actorEmail.toLowerCase().includes(q) ||
        (item.targetId && item.targetId.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.ipAddress && item.ipAddress.includes(q))
    );
  }

  if (filter?.startDate && filter.startDate.trim() !== '') {
    filtered = filtered.filter((item) => item.createdAt >= filter.startDate!);
  }

  if (filter?.endDate && filter.endDate.trim() !== '') {
    // Include full day if end date has no time
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

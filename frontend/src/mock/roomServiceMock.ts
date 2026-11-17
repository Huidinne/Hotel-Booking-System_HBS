// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM SERVICE ORDERS MOCK DATA (SPRINT 4)
// File: src/mock/roomServiceMock.ts
// =============================================================================

import { RoomServiceOrder } from '../types/roomService';

export const INITIAL_ROOM_SERVICE_ORDERS: RoomServiceOrder[] = [
  {
    id: 1,
    orderCode: 'RS-20261116-001',
    roomId: 1,
    roomNumber: '101',
    bookingId: 1,
    bookingCode: 'BK-20261018-001',
    bookingRoomId: 'BR-101-01',
    customerName: 'Nguyễn Văn Khách',
    customerPhone: '0987654321',
    items: [
      {
        menuItemId: 4,
        itemCode: 'MC-001',
        name: 'Bò Wagyu A5 Áp Chảo Sốt Tiêu Đen Phú Quốc',
        unit: 'Phần',
        quantity: 1,
        price: 680000,
        note: 'Bò tái vừa (Medium Rare), sốt tiêu để riêng',
      },
      {
        menuItemId: 15,
        itemCode: 'DU-001',
        name: 'Nước Ép Cam Tươi Sành Mọng',
        unit: 'Ly',
        quantity: 2,
        price: 65000,
        note: 'Ít đá, không đường',
      },
    ],
    generalNote: 'Mang thêm 1 bộ dao nĩa phụ và khăn ăn vải',
    totalEstimatedAmount: 810000,
    status: 'DELIVERED',
    createdAt: '2026-11-16T02:30:00+07:00', // Đặt lúc 02:30 sáng - Minh chứng phục vụ 24/7 xuyên đêm
    updatedAt: '2026-11-16T02:55:00+07:00',
    handledBy: 'Lễ tân ca đêm - Hoàng Nam',
  },
  {
    id: 2,
    orderCode: 'RS-20261116-002',
    roomId: 1,
    roomNumber: '101',
    bookingId: 1,
    bookingCode: 'BK-20261018-001',
    bookingRoomId: 'BR-101-01',
    customerName: 'Nguyễn Văn Khách',
    customerPhone: '0987654321',
    items: [
      {
        menuItemId: 10,
        itemCode: 'AN-002',
        name: 'Mì Gói Bò Mỹ Thượng Hạng Đêm Khuya 24/7',
        unit: 'Tô',
        quantity: 1,
        price: 135000,
        note: 'Nhiều hành lá và ớt tươi',
      },
      {
        menuItemId: 16,
        itemCode: 'DU-002',
        name: 'Cà Phê Sữa Đá Sài Gòn Thượng Hạng',
        unit: 'Ly',
        quantity: 1,
        price: 55000,
        note: 'Đậm vị cà phê',
      },
    ],
    generalNote: 'Giao nhanh trước 15 phút nếu được',
    totalEstimatedAmount: 190000,
    status: 'PREPARING',
    createdAt: '2026-11-16T06:15:00+07:00', // Đặt sáng sớm 06:15
    updatedAt: '2026-11-16T06:20:00+07:00',
    handledBy: 'Lễ tân ca sáng - Nguyễn Thị Yến',
  },
  {
    id: 3,
    orderCode: 'RS-20261116-003',
    roomId: 2,
    roomNumber: '102',
    bookingId: 1,
    bookingCode: 'BK-20261018-001',
    bookingRoomId: 'BR-102-01',
    customerName: 'Nguyễn Văn Khách (Khách đi cùng)',
    customerPhone: '0987654321',
    items: [
      {
        menuItemId: 11,
        itemCode: 'AN-003',
        name: 'Cháo Gà Hạt Sen Bổ Dưỡng 24/7',
        unit: 'Tô',
        quantity: 1,
        price: 125000,
        note: 'Không tiêu',
      },
      {
        menuItemId: 17,
        itemCode: 'DU-003',
        name: 'Trà Hoa Cúc Mật Ong Rừng Ấm Nóng (Đêm)',
        unit: 'Ấm',
        quantity: 1,
        price: 75000,
      },
    ],
    generalNote: 'Khách đang nghỉ ngơi, vui lòng gõ cửa nhẹ',
    totalEstimatedAmount: 200000,
    status: 'PENDING',
    createdAt: '2026-11-16T14:40:00+07:00', // Chiều 14:40
    updatedAt: '2026-11-16T14:40:00+07:00',
    handledBy: 'Lễ tân ca chiều - Nguyễn Thị Yến',
  },
];

const ROOM_SERVICE_STORAGE_KEY = 'hbs_mock_room_service_orders';

export function getStoredRoomServiceOrders(): RoomServiceOrder[] {
  if (typeof window === 'undefined') return INITIAL_ROOM_SERVICE_ORDERS;
  const raw = localStorage.getItem(ROOM_SERVICE_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(ROOM_SERVICE_STORAGE_KEY, JSON.stringify(INITIAL_ROOM_SERVICE_ORDERS));
    return INITIAL_ROOM_SERVICE_ORDERS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_ROOM_SERVICE_ORDERS;
  }
}

export function saveStoredRoomServiceOrders(orders: RoomServiceOrder[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROOM_SERVICE_STORAGE_KEY, JSON.stringify(orders));
}

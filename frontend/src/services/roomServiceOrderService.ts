// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM SERVICE 24/7 ORDER SERVICE (SPRINT 4)
// File: src/services/roomServiceOrderService.ts
// Handles 24/7 Room Service Orders for guests staying in active BookingRooms.
// =============================================================================

import {
  CreateRoomServiceOrderRequest,
  MenuItem,
  RoomServiceOrder,
  RoomServiceOrderItem,
} from '../types/roomService';
import { getStoredMenuItems } from '../mock/menuMock';
import {
  getStoredRoomServiceOrders,
  saveStoredRoomServiceOrders,
} from '../mock/roomServiceMock';
import { MOCK_ROOMS } from '../mock/roomMock';
import { MOCK_BOOKINGS } from '../mock/bookingMock';

const SIMULATE_LATENCY_MS = 300;

export interface ActiveBookingRoomInfo {
  roomId: number;
  roomNumber: string;
  roomTypeName: string;
  bookingId: number;
  bookingCode: string;
  bookingRoomId: string | number;
  customerName: string;
  customerPhone?: string;
  checkIn: string;
  checkOut: string;
  status: string; // CHECKED_IN
}

export const roomServiceOrderService = {
  /**
   * Lấy thông tin lượt lưu trú đang hoạt động của phòng (BookingRoom tương ứng).
   * Điều kiện: Chỉ phòng đang có khách lưu trú (OCCUPIED / CHECKED_IN) mới có dữ liệu.
   * Target Backend Endpoint: GET /api/v1/receptionist/rooms/{roomId}/active-stay
   */
  async getActiveBookingRoom(roomId: number): Promise<ActiveBookingRoomInfo | null> {
    await new Promise((res) => setTimeout(res, 150));

    // Tìm thông tin phòng
    const room = MOCK_ROOMS.find((r) => r.id === roomId);
    if (!room) return null;

    // Tìm booking đang CHECKED_IN có gán phòng này
    const activeBooking = MOCK_BOOKINGS.find(
      (b) =>
        b.bookingStatus === 'CHECKED_IN' &&
        Array.isArray(b.assignedRooms) &&
        b.assignedRooms.some((ar) => ar.id === roomId || String(ar.roomNumber) === String(room.roomNumber))
    );

    if (activeBooking) {
      return {
        roomId: room.id,
        roomNumber: room.roomNumber,
        roomTypeName: room.roomTypeName || 'Phòng tiêu chuẩn',
        bookingId: activeBooking.id,
        bookingCode: activeBooking.bookingCode,
        bookingRoomId: `BR-${room.roomNumber}-${activeBooking.id}`,
        customerName: activeBooking.customerName,
        customerPhone: activeBooking.customerPhone,
        checkIn: activeBooking.checkIn,
        checkOut: activeBooking.checkOut,
        status: activeBooking.bookingStatus,
      };
    }

    // Nếu phòng có trạng thái OCCUPIED nhưng chưa khớp mock booking, tạo active stay mặc định
    if (room.status === 'OCCUPIED') {
      return {
        roomId: room.id,
        roomNumber: room.roomNumber,
        roomTypeName: room.roomTypeName || 'Phòng tiêu chuẩn',
        bookingId: 99,
        bookingCode: `BK-20261116-${room.roomNumber}`,
        bookingRoomId: `BR-${room.roomNumber}-99`,
        customerName: `Khách phòng ${room.roomNumber}`,
        customerPhone: '0901234567',
        checkIn: '2026-11-16',
        checkOut: '2026-11-18',
        status: 'CHECKED_IN',
      };
    }

    return null;
  },

  /**
   * Lấy thực đơn phục vụ dịch vụ phòng.
   * Mặc định chỉ lấy các món đang được phép bán (status = AVAILABLE).
   * Món ngừng bán sẽ bị ẩn hoặc disabled khi chọn.
   */
  async getMenuItems(availableOnly = true): Promise<MenuItem[]> {
    await new Promise((res) => setTimeout(res, 150));
    const all = getStoredMenuItems();
    if (availableOnly) {
      return all.filter((it) => it.status === 'AVAILABLE');
    }
    return all;
  },

  /**
   * Tạo đơn gọi món dịch vụ phòng 24/7.
   * QUY TẮC BẮT BUỘC:
   * 1. Phục vụ 24/7, không giới hạn khung giờ, không phụ thuộc vào giờ nhà hàng.
   * 2. Chỉ phòng có lượt lưu trú hợp lệ (BookingRoom) mới được tạo đơn.
   * 3. Số lượng từng món phải lớn hơn 0, đơn hàng không được rỗng.
   * Target Backend Endpoint: POST /api/v1/receptionist/room-service/orders
   */
  async createRoomServiceOrder(
    data: CreateRoomServiceOrderRequest,
    options?: { simulateConflict409?: boolean }
  ): Promise<RoomServiceOrder> {
    await new Promise((res) => setTimeout(res, SIMULATE_LATENCY_MS));

    // Mô phỏng HTTP 409 Conflict nếu người dùng yêu cầu kiểm thử
    if (options?.simulateConflict409) {
      const err = new Error(
        'Xung đột dữ liệu (HTTP 409): Trạng thái phòng hoặc lượt lưu trú đã thay đổi bởi nhân viên khác. Vui lòng làm mới lại dữ liệu.'
      ) as any;
      err.status = 409;
      throw err;
    }

    if (!data.bookingRoomId) {
      throw new Error('Không xác định được lượt lưu trú (BookingRoom) hợp lệ của phòng này.');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một món ăn vào đơn hàng.');
    }

    for (const item of data.items) {
      if (!item.quantity || Number(item.quantity) <= 0) {
        throw new Error('Số lượng của từng món ăn phải lớn hơn 0.');
      }
    }

    const currentMenu = getStoredMenuItems();
    const orderItems: RoomServiceOrderItem[] = [];
    let totalEstimated = 0;

    for (const reqItem of data.items) {
      const dish = currentMenu.find((m) => m.id === reqItem.menuItemId);
      if (!dish) {
        throw new Error(`Món ăn với ID #${reqItem.menuItemId} không tồn tại trong thực đơn.`);
      }
      if (dish.status !== 'AVAILABLE') {
        throw new Error(`Món "${dish.name}" hiện đang ngừng bán, không thể gọi món.`);
      }

      const itemTotal = dish.price * reqItem.quantity;
      totalEstimated += itemTotal;

      orderItems.push({
        menuItemId: dish.id,
        itemCode: dish.itemCode,
        name: dish.name,
        unit: dish.unit,
        quantity: Number(reqItem.quantity),
        price: dish.price, // Snapshot giá tại thời điểm đặt
        note: reqItem.note?.trim() || '',
      });
    }

    const allOrders = getStoredRoomServiceOrders();
    const newId = allOrders.length > 0 ? Math.max(...allOrders.map((o) => o.id)) + 1 : 1;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const orderCode = `RS-${dateStr}-${String(newId).padStart(3, '0')}`;

    const newOrder: RoomServiceOrder = {
      id: newId,
      orderCode,
      roomId: data.roomId,
      roomNumber: data.roomNumber,
      bookingId: data.bookingId,
      bookingCode: data.bookingCode,
      bookingRoomId: data.bookingRoomId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      items: orderItems,
      generalNote: data.generalNote?.trim() || '',
      totalEstimatedAmount: totalEstimated,
      status: 'PENDING',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      handledBy: 'Lễ tân tiếp nhận (24/7)',
    };

    allOrders.unshift(newOrder);
    saveStoredRoomServiceOrders(allOrders);

    return newOrder;
  },

  /**
   * Lấy lịch sử gọi món theo đúng lượt lưu trú (BookingRoom).
   * Không gộp lịch sử của những lượt lưu trú khác nhau.
   * Target Backend Endpoint: GET /api/v1/receptionist/room-service/history?bookingRoomId={id}
   */
  async getRoomServiceHistory(bookingRoomId: string | number): Promise<RoomServiceOrder[]> {
    await new Promise((res) => setTimeout(res, 200));
    const all = getStoredRoomServiceOrders();
    return all
      .filter((o) => String(o.bookingRoomId) === String(bookingRoomId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Lấy toàn bộ đơn dịch vụ phòng (phục vụ giám sát nếu cần)
   */
  async getAllOrders(): Promise<RoomServiceOrder[]> {
    await new Promise((res) => setTimeout(res, 200));
    return getStoredRoomServiceOrders();
  },
};

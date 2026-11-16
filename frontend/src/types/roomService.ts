// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM SERVICE & MENU TYPES (SPRINT 4)
// File: src/types/roomService.ts
// =============================================================================

export type MenuItemStatus = 'AVAILABLE' | 'UNAVAILABLE';

export interface MenuItem {
  id: number;
  itemCode: string; // Mã món ăn (ví dụ: FOOD-001, DRINK-002)
  name: string; // Tên món ăn
  category: string; // Nhóm món (Khai vị, Món chính, Ăn nhẹ 24/7, Tráng miệng, Đồ uống)
  unit: string; // Đơn vị tính (Phần, Tô, Dĩa, Ly, Chai, Combo)
  price: number; // Giá bán (VND)
  status: MenuItemStatus; // Trạng thái bán: AVAILABLE (Đang bán) | UNAVAILABLE (Ngừng bán)
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuItemRequest {
  name: string;
  category: string;
  unit: string;
  price: number;
  status: MenuItemStatus;
  description?: string;
}

export interface UpdateMenuItemRequest {
  name: string;
  category: string;
  unit: string;
  price: number;
  status: MenuItemStatus;
  description?: string;
}

export type RoomServiceOrderStatus =
  | 'PENDING' // Chờ tiếp nhận
  | 'PREPARING' // Bếp / Bar đang chuẩn bị
  | 'DELIVERED' // Đã phục vụ tới phòng
  | 'COMPLETED' // Đã hoàn tất
  | 'CANCELLED'; // Đã hủy

export interface RoomServiceOrderItem {
  menuItemId: number;
  itemCode: string;
  name: string;
  unit: string;
  quantity: number;
  price: number; // Giá tại thời điểm đặt (snapshot)
  note?: string; // Ghi chú riêng cho món (ví dụ: Ít cay, Không hành)
}

export interface RoomServiceOrder {
  id: number;
  orderCode: string; // Mã đơn dịch vụ (ví dụ: RS-20261116-001)
  roomId: number;
  roomNumber: string;
  bookingId: number;
  bookingCode: string;
  bookingRoomId: string | number; // Định danh lượt lưu trú BookingRoom
  customerName: string;
  customerPhone?: string;
  items: RoomServiceOrderItem[];
  generalNote?: string; // Ghi chú chung cho toàn bộ đơn hàng
  totalEstimatedAmount: number; // Tổng tiền dự kiến (tham khảo theo dữ liệu Backend)
  status: RoomServiceOrderStatus;
  createdAt: string; // Thời gian gọi món (ISO string - hỗ trợ 24/7 không giới hạn)
  updatedAt: string;
  handledBy?: string;
}

export interface CreateRoomServiceOrderRequest {
  roomId: number;
  roomNumber: string;
  bookingId: number;
  bookingCode: string;
  bookingRoomId: string | number;
  customerName: string;
  customerPhone?: string;
  items: {
    menuItemId: number;
    quantity: number;
    note?: string;
  }[];
  generalNote?: string;
}

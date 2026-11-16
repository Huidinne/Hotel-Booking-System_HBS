// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM SERVICE & MENU TYPES (SPRINT 4)
// File: src/types/roomService.ts
// Direct mapping with Spring Boot Backend DTOs (org.example.backend.roomservice)
// =============================================================================

export type ServiceItemCategory = 'FOOD' | 'BEVERAGE' | 'SNACK' | 'MINIBAR' | 'OTHER';

export const SERVICE_ITEM_CATEGORIES: { key: ServiceItemCategory; label: string }[] = [
  { key: 'FOOD', label: 'Món ăn chính (Food)' },
  { key: 'BEVERAGE', label: 'Đồ uống (Beverage)' },
  { key: 'SNACK', label: 'Ăn nhẹ (Snack)' },
  { key: 'MINIBAR', label: 'Minibar trong phòng' },
  { key: 'OTHER', label: 'Dịch vụ khác' },
];

export type MenuItemStatus = 'AVAILABLE' | 'UNAVAILABLE';

export interface MenuItem {
  id: number;
  itemCode?: string; // Optional code (e.g. SI-1)
  name: string; // Tên món ăn
  category: ServiceItemCategory | string; // Phân loại: FOOD, BEVERAGE, SNACK, MINIBAR, OTHER
  unit: string; // Đơn vị tính: Bát, Đĩa, Ly, Chai, Gói, Phần...
  price: number; // Đơn giá (VND)
  status: MenuItemStatus; // AVAILABLE (isActive = true) | UNAVAILABLE (isActive = false)
  isActive?: boolean;
  imageUrl?: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
}

export interface ServiceItemRequest {
  name: string;
  category: ServiceItemCategory;
  unit: string;
  price: number;
  imageUrl?: string;
  isActive?: boolean;
  version?: number;
}

export interface CreateMenuItemRequest {
  name: string;
  category: ServiceItemCategory | string;
  unit: string;
  price: number;
  status?: MenuItemStatus;
  isActive?: boolean;
  imageUrl?: string;
  description?: string;
}

export interface UpdateMenuItemRequest {
  name: string;
  category: ServiceItemCategory | string;
  unit: string;
  price: number;
  status?: MenuItemStatus;
  isActive?: boolean;
  imageUrl?: string;
  version?: number;
  description?: string;
}

export type RoomServiceOrderStatus =
  | 'PENDING'    // Chờ tiếp nhận
  | 'PREPARING'  // Bếp/Bar đang chuẩn bị
  | 'DELIVERED'  // Đã giao thành công tới phòng khách
  | 'CANCELLED'; // Đã hủy (có lý do)

export interface RoomServiceOrderItem {
  id?: number;
  serviceItemId: number;
  name: string;
  unit: string;
  quantity: number;
  price: number; // unitPriceSnapshot
  lineTotal?: number;
  note?: string;
  itemVersion?: number;
  imageUrl?: string;
}

export interface RoomServiceOrder {
  id: number;
  orderCode: string; // RSO-YYYYMMDD-XXXX
  bookingId: number;
  bookingRoomId: number;
  roomNumber?: string;
  status: RoomServiceOrderStatus;
  items: RoomServiceOrderItem[];
  totalAmount: number;
  note?: string;
  cancelReason?: string;
  cancelledBy?: string;
  deliveredAt?: string;
  createdBy?: string;
  version: number;
  createdAt: string;
  updatedAt?: string;
  customerConfirmed?: boolean;
  customerConfirmedAt?: string;
  customerRejected?: boolean;
}

export interface CreateRoomServiceOrderRequest {
  bookingId: number;
  bookingRoomId: number;
  roomId?: number;
  roomNumber?: string;
  bookingCode?: string;
  items: {
    serviceItemId: number;
    quantity: number;
    itemVersion?: number;
    name?: string;
    unit?: string;
    price?: number;
    imageUrl?: string;
  }[];
  note?: string;
}

export interface RoomServiceStatusUpdateRequest {
  status: RoomServiceOrderStatus;
  version: number;
  reason?: string;
}

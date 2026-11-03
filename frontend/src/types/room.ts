// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM TYPES & INVENTORY INTERFACES
// File: src/types/room.ts
// =============================================================================

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';

export interface RoomTypeImage {
  id: number;
  roomTypeId: number;
  imageUrl: string;
  isPrimary: boolean;
}

export interface RoomType {
  id: number;
  name: string;
  capacity: number;
  basePrice: number;
  description: string;
  isActive: boolean;
  images: string[];
  amenities: string[];
}

export interface Room {
  id: number;
  roomNumber: string;
  roomTypeId: number;
  roomTypeName?: string;
  floor: number;
  status: RoomStatus;
  updatedAt?: string;
}

export interface RoomSearchParams {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guests: number;
  quantity?: number;
}

export interface RoomTypeAvailabilityResponse {
  roomTypeId: number;
  name: string;
  description: string;
  capacity: number;
  basePrice: number;
  imageUrls: string[];
  amenities: string[];
  availableRooms: number;
  requestedQuantity: number;
  available: boolean;
}

export interface RoomStatusUpdateRequest {
  status: RoomStatus;
}

export type RoomTimelineStatus = 'AVAILABLE' | 'CONFIRMED' | 'CHECKED_IN' | 'CLEANING' | 'MAINTENANCE';

export interface RoomDailyStatus {
  date: string;
  status: RoomTimelineStatus;
  bookingId?: number;
  bookingCode?: string;
  customerName?: string;
  customerPhone?: string;
  checkInDate?: string;
  checkOutDate?: string;
  depositAmount?: number;
  paidAmount?: number;
  totalPrice?: number;
}

export interface RoomTimelineResponse {
  roomId: number;
  roomNumber: string;
  floor: number;
  roomTypeId: number;
  roomTypeName: string;
  currentPhysicalStatus: RoomStatus;
  dailyStatuses: RoomDailyStatus[];
}

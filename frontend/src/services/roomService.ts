// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM SERVICE
// File: src/services/roomService.ts
// =============================================================================

import {
  Room,
  RoomSearchParams,
  RoomStatus,
  RoomType,
  RoomTypeAvailabilityResponse,
} from '../types/room';
import { MOCK_ROOM_TYPES, MOCK_ROOMS } from '../mock/roomMock';

// In-memory persistent state across navigation
let roomTypesState: RoomType[] = [...MOCK_ROOM_TYPES];
let roomsState: Room[] = [...MOCK_ROOMS];

export const roomService = {
  // TODO: Replace mock implementation with real backend API when available: GET /api/v1/room-types
  async getRoomTypes(): Promise<RoomType[]> {
    await new Promise((res) => setTimeout(res, 200));
    return [...roomTypesState.filter((rt) => rt.isActive)];
  },

  // TODO: Replace mock implementation with real backend API when available: GET /api/v1/room-types/{id}
  async getRoomTypeById(id: number): Promise<RoomType> {
    await new Promise((res) => setTimeout(res, 200));
    const roomType = roomTypesState.find((rt) => rt.id === Number(id));
    if (!roomType) {
      throw new Error(`Không tìm thấy loại phòng với ID #${id}`);
    }
    return { ...roomType };
  },

  // TODO: Replace mock implementation with real backend API when available:
  // GET /api/v1/room-types/search?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=2&quantity=1
  async searchAvailableRooms(params: RoomSearchParams): Promise<RoomTypeAvailabilityResponse[]> {
    await new Promise((res) => setTimeout(res, 300));
    const { guests, quantity = 1 } = params;

    return roomTypesState
      .filter((rt) => rt.isActive && rt.capacity >= guests)
      .map((rt) => {
        // Count non-maintenance physical rooms for this room type
        const totalActiveRooms = roomsState.filter(
          (r) => r.roomTypeId === rt.id && r.status !== 'MAINTENANCE'
        ).length;

        // In production backend, this counts overlapping bookings with pessimistic lock.
        // For realistic mock, we compute available count based on active rooms
        // Deducting currently occupied rooms for immediate demo
        const occupiedCount = roomsState.filter(
          (r) => r.roomTypeId === rt.id && r.status === 'OCCUPIED'
        ).length;

        const availableRooms = Math.max(0, totalActiveRooms - occupiedCount);

        return {
          roomTypeId: rt.id,
          name: rt.name,
          description: rt.description,
          capacity: rt.capacity,
          basePrice: rt.basePrice,
          imageUrls: rt.images,
          amenities: rt.amenities,
          availableRooms,
          requestedQuantity: quantity,
          available: availableRooms >= quantity,
        };
      });
  },

  // TODO: Replace mock implementation with real backend API when available: GET /api/v1/receptionist/rooms or /admin/rooms
  async getRooms(filters?: { roomTypeId?: number; status?: RoomStatus | 'ALL'; floor?: number }): Promise<Room[]> {
    await new Promise((res) => setTimeout(res, 200));
    let result = [...roomsState];

    if (filters?.roomTypeId) {
      result = result.filter((r) => r.roomTypeId === Number(filters.roomTypeId));
    }
    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter((r) => r.status === filters.status);
    }
    if (filters?.floor) {
      result = result.filter((r) => r.floor === Number(filters.floor));
    }

    return result;
  },

  // TODO: Replace mock implementation with real backend API when available: PUT /api/v1/receptionist/rooms/{id}/status
  async updateRoomStatus(roomId: number, status: RoomStatus): Promise<Room> {
    await new Promise((res) => setTimeout(res, 250));
    const index = roomsState.findIndex((r) => r.id === Number(roomId));
    if (index === -1) {
      throw new Error(`Không tìm thấy phòng vật lý #${roomId}`);
    }

    roomsState[index] = {
      ...roomsState[index],
      status,
      updatedAt: new Date().toISOString(),
    };

    return { ...roomsState[index] };
  },

  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/admin/room-types
  async createRoomType(data: Omit<RoomType, 'id'>): Promise<RoomType> {
    await new Promise((res) => setTimeout(res, 300));
    const newRoomType: RoomType = {
      ...data,
      id: Date.now(),
    };
    roomTypesState.push(newRoomType);
    return newRoomType;
  },

  // TODO: Replace mock implementation with real backend API when available: PUT /api/v1/admin/room-types/{id}
  async updateRoomType(id: number, data: Partial<RoomType>): Promise<RoomType> {
    await new Promise((res) => setTimeout(res, 300));
    const index = roomTypesState.findIndex((rt) => rt.id === Number(id));
    if (index === -1) {
      throw new Error(`Không tìm thấy loại phòng #${id}`);
    }
    roomTypesState[index] = { ...roomTypesState[index], ...data };
    return { ...roomTypesState[index] };
  },

  // TODO: Replace mock implementation with real backend API when available: POST /api/v1/admin/rooms
  async createRoom(data: Omit<Room, 'id'>): Promise<Room> {
    await new Promise((res) => setTimeout(res, 300));
    const rt = roomTypesState.find((t) => t.id === Number(data.roomTypeId));
    const newRoom: Room = {
      ...data,
      id: Date.now(),
      roomTypeName: rt?.name || 'Unknown',
    };
    roomsState.push(newRoom);
    return newRoom;
  },

  // Helper method for check-in to get available physical rooms of a specific type
  async getAvailableRoomsForType(roomTypeId: number): Promise<Room[]> {
    await new Promise((res) => setTimeout(res, 150));
    return roomsState.filter(
      (r) => r.roomTypeId === Number(roomTypeId) && r.status === 'AVAILABLE'
    );
  },
};

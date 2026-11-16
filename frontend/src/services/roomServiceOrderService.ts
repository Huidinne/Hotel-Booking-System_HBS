// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - ROOM SERVICE 24/7 ORDER SERVICE (SPRINT 4)
// File: src/services/roomServiceOrderService.ts
// Real API Integration with Spring Boot Backend (/api/v1/receptionist/room-service-orders & service-items)
// =============================================================================

import { apiClient } from './apiClient';
import {
  CreateRoomServiceOrderRequest,
  MenuItem,
  RoomServiceOrder,
  RoomServiceOrderStatus,
} from '../types/roomService';
import { menuService } from './menuService';

export interface ActiveBookingRoomInfo {
  roomId: number;
  roomNumber: string;
  roomTypeName: string;
  bookingId: number;
  bookingCode: string;
  bookingRoomId: number;
  customerName: string;
  customerPhone?: string;
  checkIn: string;
  checkOut: string;
  status: string; // CHECKED_IN
}

const SYNC_STORAGE_KEY = 'room_service_orders_sync';

function getLocalSyncOrders(): Record<string, RoomServiceOrder[]> {
  try {
    return JSON.parse(localStorage.getItem(SYNC_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalSyncOrders(data: Record<string, RoomServiceOrder[]>) {
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('room_service_sync'));
  } catch (err) {
    console.warn('[RoomServiceOrderService] saveLocalSyncOrders error:', err);
  }
}

function isStaffUser(): boolean {
  try {
    const rawUser = localStorage.getItem('hbs_current_user');
    if (!rawUser) return false;
    const u = JSON.parse(rawUser);
    const role = String(u.role || '').toUpperCase();
    return (
      role.includes('RECEPTIONIST') ||
      role.includes('ADMIN') ||
      role === 'STAFF'
    );
  } catch {
    return false;
  }
}

function saveOrderToSync(order: RoomServiceOrder, bookingCode?: string) {
  if (!order || !order.id) return;
  const allSync = getLocalSyncOrders();
  const keysToUpdate: string[] = [];
  if (order.bookingId) keysToUpdate.push(String(order.bookingId));
  if (bookingCode) keysToUpdate.push(String(bookingCode).trim().toUpperCase());

  keysToUpdate.forEach((key) => {
    const list = allSync[key] || [];
    const idx = list.findIndex((o) => o.id === order.id || o.orderCode === order.orderCode);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...order };
    } else {
      list.unshift(order);
    }
    allSync[key] = list;
  });

  saveLocalSyncOrders(allSync);
}

function normalizeOrder(raw: any): RoomServiceOrder {
  if (!raw) return {} as RoomServiceOrder;
  const items = Array.isArray(raw.items)
    ? raw.items.map((it: any) => {
        const name = it.nameSnapshot || it.name || it.itemName || 'Món ăn';
        const unit = it.unitSnapshot || it.unit || 'Phần';
        const price = Number(it.unitPriceSnapshot || it.price || it.unitPrice || 0);
        const quantity = Number(it.quantity || 1);
        const lineTotal = Number(it.lineTotal || it.subtotal || it.totalPrice || price * quantity);
        return {
          id: it.id,
          serviceItemId: Number(it.serviceItemId),
          name,
          itemName: name,
          unit,
          price,
          unitPrice: price,
          quantity,
          lineTotal,
          subtotal: lineTotal,
          itemVersion: it.itemVersion,
          imageUrl: it.imageUrl,
          note: it.note,
        };
      })
    : [];

  const calcTotal = items.reduce((sum: number, it: any) => sum + (it.lineTotal || 0), 0);

  return {
    id: Number(raw.id),
    orderCode: raw.orderCode || `RSO-${raw.id}`,
    bookingId: Number(raw.bookingId || 0),
    bookingRoomId: Number(raw.bookingRoomId || 0),
    roomNumber: raw.roomNumber || '',
    status: (raw.status || 'PENDING') as RoomServiceOrderStatus,
    totalAmount: Number(raw.totalAmount ?? calcTotal),
    note: raw.note || '',
    cancelReason: raw.cancelReason,
    cancelledBy: raw.cancelledBy,
    deliveredAt: raw.deliveredAt,
    createdBy: raw.createdBy,
    version: Number(raw.version ?? 0),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt,
    customerConfirmed: Boolean(raw.customerConfirmed),
    customerConfirmedAt: raw.customerConfirmedAt,
    customerRejected: Boolean(raw.customerRejected),
    items,
  };
}

export const roomServiceOrderService = {
  /**
   * Lấy thông tin lượt lưu trú đang hoạt động của phòng (BookingRoom tương ứng).
   * Điều kiện nghiêm ngặt:
   * - Chỉ áp dụng cho phòng ĐANG CÓ KHÁCH LƯU TRÚ (OCCUPIED / CHECKED_IN).
   * - Phòng VACANT (AVAILABLE), CLEANING hoặc MAINTENANCE -> trả về null (không được phép dùng Room Service).
   * - Tự động đối chiếu đa nguồn: Danh sách CHECKED_IN bookings, chi tiết phân bổ phòng, Room Timeline API và local sync.
   */
  async getActiveBookingRoom(roomId?: number, roomNumberHint?: string): Promise<ActiveBookingRoomInfo | null> {
    const targetRoomId = roomId ? Number(roomId) : 0;
    const targetRoomNumber = roomNumberHint ? String(roomNumberHint).trim() : '';

    if (!targetRoomId && !targetRoomNumber) {
      return null;
    }

    try {
      // 1. Kiểm tra trạng thái vật lý của phòng trước
      // Nếu phòng không ở trạng thái OCCUPIED (ví dụ: AVAILABLE, CLEANING, MAINTENANCE)
      // thì chắc chắn phòng đang trống hoặc chưa có khách -> không cho phép dùng Room Service
      let _currentRoomStatus: string | null = null;
      let currentRoomType: string = '';
      try {
        const roomsRes = await apiClient.get<any>('/receptionist/rooms');
        const allRooms: any[] = Array.isArray(roomsRes) ? roomsRes : roomsRes?.content || [];
        const foundRoom = allRooms.find(
          (r) =>
            (targetRoomId && Number(r.id) === targetRoomId) ||
            (targetRoomNumber && String(r.roomNumber).trim() === targetRoomNumber)
        );
        if (foundRoom) {
          _currentRoomStatus = foundRoom.status;
          currentRoomType = foundRoom.roomTypeName || foundRoom.roomType?.name || '';
          if (foundRoom.status !== 'OCCUPIED') {
            console.info(
              `[RoomService] Phòng ${targetRoomNumber || targetRoomId} hiện có trạng thái '${foundRoom.status}' (không phải OCCUPIED). Từ chối dịch vụ phòng.`
            );
            return null;
          }
        }
      } catch (err) {
        console.warn('[RoomService] Không thể tải danh sách phòng vật lý, tiếp tục kiểm tra booking:', err);
      }

      // 2. Kiểm tra bộ nhớ tạm (localStorage) nếu lượt check-in vừa diễn ra trong phiên
      try {
        const localStays = JSON.parse(localStorage.getItem('active_checked_in_stays') || '{}');
        const localKey = String(targetRoomId || targetRoomNumber);
        const stayCandidate =
          localStays[localKey] ||
          Object.values(localStays).find(
            (s: any) =>
              (targetRoomId && Number(s.roomId) === targetRoomId) ||
              (targetRoomNumber && String(s.roomNumber).trim() === targetRoomNumber)
          );
        if (stayCandidate && stayCandidate.status === 'CHECKED_IN') {
          // Xác thực lại booking xem còn tồn tại và còn CHECKED_IN trên backend không
          try {
            const bCheck = await apiClient.get<any>(`/bookings/${stayCandidate.bookingCode}`);
            if (bCheck && bCheck.bookingStatus === 'CHECKED_IN') {
              return {
                roomId: Number(targetRoomId || stayCandidate.roomId),
                roomNumber: stayCandidate.roomNumber || targetRoomNumber,
                roomTypeName: stayCandidate.roomTypeName || currentRoomType || bCheck.roomTypeName || 'Phòng tiêu chuẩn',
                bookingId: Number(bCheck.id || stayCandidate.bookingId),
                bookingCode: bCheck.bookingCode || stayCandidate.bookingCode,
                bookingRoomId: Number(stayCandidate.bookingRoomId || targetRoomId || 1),
                customerName: bCheck.customerName || stayCandidate.customerName || 'Khách lưu trú',
                customerPhone: bCheck.customerPhone || stayCandidate.customerPhone,
                checkIn: bCheck.checkIn || stayCandidate.checkIn,
                checkOut: bCheck.checkOut || stayCandidate.checkOut,
                status: 'CHECKED_IN',
              };
            }
          } catch {
            // tiếp tục luồng bên dưới nếu lỗi xác thực
          }
        }
      } catch {
        // ignore parse error
      }

      // 3. Lấy danh sách booking đang CHECKED_IN từ Backend
      const res = await apiClient.get<any>('/receptionist/bookings?status=CHECKED_IN&page=0&size=50');
      const checkedInBookings: any[] = Array.isArray(res) ? res : res?.content || [];

      if (checkedInBookings.length > 0) {
        // Backend endpoint /receptionist/bookings trả về assignedRooms: null
        // Do đó, cần truy vấn chi tiết từng booking qua /bookings/{bookingCode} để lấy danh sách assignedRooms thực tế
        const detailedBookings = await Promise.all(
          checkedInBookings.map(async (b) => {
            if (!b.bookingCode) return b;
            try {
              const detail = await apiClient.get<any>(`/bookings/${b.bookingCode}`);
              return detail || b;
            } catch {
              return b;
            }
          })
        );

        // Tìm booking có chứa phòng này
        const matchedBooking = detailedBookings.find((b: any) => {
          if (b.bookingStatus !== 'CHECKED_IN') return false;
          if (!Array.isArray(b.assignedRooms)) return false;
          return b.assignedRooms.some(
            (ar: any) =>
              (targetRoomId && Number(ar.roomId || ar.id) === targetRoomId) ||
              (targetRoomNumber && String(ar.roomNumber).trim() === targetRoomNumber)
          );
        });

        if (matchedBooking) {
          const assigned = (matchedBooking.assignedRooms || []).find(
            (ar: any) =>
              (targetRoomId && Number(ar.roomId || ar.id) === targetRoomId) ||
              (targetRoomNumber && String(ar.roomNumber).trim() === targetRoomNumber)
          );

          let resolvedBookingRoomId = Number(assigned?.bookingRoomId || assigned?.id || assigned?.roomId || targetRoomId || 1);

          // Truy vấn lịch sử đơn buồng phòng để tìm bookingRoomId chính xác nhất
          try {
            const servicesRes = await apiClient.get<any>(
              `/receptionist/bookings/${matchedBooking.id}/room-services?page=0&size=20`
            );
            const orders = servicesRes?.orders?.content || [];
            const matchedOrder = orders.find(
              (o: any) => String(o.roomNumber).trim() === String(assigned?.roomNumber || targetRoomNumber).trim()
            );
            if (matchedOrder?.bookingRoomId) {
              resolvedBookingRoomId = Number(matchedOrder.bookingRoomId);
            } else {
              const reqs = servicesRes?.maintenanceRequests?.content || [];
              const matchedReq = reqs.find(
                (r: any) =>
                  (targetRoomId && Number(r.roomId) === targetRoomId) ||
                  String(r.roomNumber).trim() === String(assigned?.roomNumber || targetRoomNumber).trim()
              );
              if (matchedReq?.bookingRoomId) {
                resolvedBookingRoomId = Number(matchedReq.bookingRoomId);
              }
            }
          } catch {
            // ignore
          }

          const stayInfo: ActiveBookingRoomInfo = {
            roomId: Number(targetRoomId || assigned?.roomId || assigned?.id),
            roomNumber: assigned?.roomNumber || targetRoomNumber || '',
            roomTypeName: matchedBooking.roomTypeName || currentRoomType || 'Phòng tiêu chuẩn',
            bookingId: Number(matchedBooking.id),
            bookingCode: matchedBooking.bookingCode || '',
            bookingRoomId: resolvedBookingRoomId,
            customerName: matchedBooking.customerName || 'Khách lưu trú',
            customerPhone: matchedBooking.customerPhone,
            checkIn: matchedBooking.checkIn,
            checkOut: matchedBooking.checkOut,
            status: 'CHECKED_IN',
          };

          // Cache lại cho các thao tác sau
          try {
            const localStays = JSON.parse(localStorage.getItem('active_checked_in_stays') || '{}');
            localStays[String(stayInfo.roomId)] = stayInfo;
            if (stayInfo.roomNumber) localStays[String(stayInfo.roomNumber)] = stayInfo;
            localStorage.setItem('active_checked_in_stays', JSON.stringify(localStays));
          } catch {
            // ignore
          }

          return stayInfo;
        }
      }

      // 4. Kiểm tra qua Room Timeline API nếu danh sách booking chưa cập nhật
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const timelineRes = await apiClient.get<any>(
          `/receptionist/rooms/timeline?startDate=${todayStr}&endDate=${todayStr}`
        );
        const timelineList: any[] = Array.isArray(timelineRes) ? timelineRes : timelineRes?.content || [];
        const roomRow = timelineList.find(
          (r: any) =>
            (targetRoomId && Number(r.roomId) === targetRoomId) ||
            (targetRoomNumber && String(r.roomNumber).trim() === targetRoomNumber)
        );

        if (roomRow && Array.isArray(roomRow.dailyStatuses) && roomRow.dailyStatuses.length > 0) {
          const daily = roomRow.dailyStatuses[0];
          if (
            (daily.status === 'CHECKED_IN' || daily.bookingStatus === 'CHECKED_IN') &&
            daily.bookingId
          ) {
            return {
              roomId: Number(targetRoomId || roomRow.roomId),
              roomNumber: roomRow.roomNumber || targetRoomNumber,
              roomTypeName: roomRow.roomTypeName || currentRoomType || 'Phòng tiêu chuẩn',
              bookingId: Number(daily.bookingId),
              bookingCode: daily.bookingCode || '',
              bookingRoomId: Number(targetRoomId || 1),
              customerName: daily.customerName || 'Khách lưu trú',
              customerPhone: daily.customerPhone,
              checkIn: daily.checkInDate || daily.checkIn,
              checkOut: daily.checkOutDate || daily.checkOut,
              status: 'CHECKED_IN',
            };
          }
        }
      } catch (tErr) {
        console.warn('[RoomService] Timeline fallback lookup notice:', tErr);
      }

      return null;
    } catch (err: any) {
      console.warn('[RoomServiceOrderService] getActiveBookingRoom error:', err);
      return null;
    }
  },

  /**
   * Lấy danh mục món ăn đang mở bán cho Room Service 24/7
   * API: GET /api/v1/receptionist/service-items
   */
  async getMenuItems(): Promise<MenuItem[]> {
    return menuService.getActiveMenuItems();
  },

  /**
   * Đặt món dịch vụ phòng 24/7 (Không giới hạn khung giờ)
   * API: POST /api/v1/receptionist/bookings/{bookingId}/room-service-orders
   * Tự động giải quyết bookingRoomId đối với backend booking_rooms table.
   */
  async createRoomServiceOrder(data: CreateRoomServiceOrderRequest): Promise<RoomServiceOrder> {
    if (!data.bookingId) {
      throw new Error('Không tìm thấy bookingId của phòng lưu trú');
    }
    if (!data.items || data.items.length === 0) {
      throw new Error('Đơn dịch vụ phòng phải có ít nhất một món');
    }

    const basePayload = {
      items: data.items.map((it) => ({
        serviceItemId: Number(it.serviceItemId),
        quantity: Number(it.quantity),
        itemVersion: it.itemVersion ?? 0,
      })),
      note: data.note ? data.note.trim() : null,
    };

    // Chuẩn bị danh sách candidate bookingRoomId (ưu tiên bookingRoomId chính xác, dự phòng roomId vật lý)
    const candidateIds: number[] = [];
    if (data.bookingRoomId) candidateIds.push(Number(data.bookingRoomId));
    if (data.roomId && !candidateIds.includes(Number(data.roomId))) {
      candidateIds.push(Number(data.roomId));
    }
    if (candidateIds.length === 0) {
      candidateIds.push(1);
    }

    let lastError: any = null;

    for (const bRoomId of candidateIds) {
      const idempotencyKey = `RSO-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      try {
        const payload = {
          ...basePayload,
          bookingRoomId: bRoomId,
        };
        const res = await apiClient.post<any>(
          `/receptionist/bookings/${data.bookingId}/room-service-orders`,
          payload,
          {
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
          }
        );

        // Lưu lại bookingRoomId thành công vào cache để các lần gọi tiếp theo dùng ngay
        if (data.roomId) {
          try {
            const localStays = JSON.parse(localStorage.getItem('active_checked_in_stays') || '{}');
            if (localStays[String(data.roomId)]) {
              localStays[String(data.roomId)].bookingRoomId = bRoomId;
              localStorage.setItem('active_checked_in_stays', JSON.stringify(localStays));
            }
          } catch {
            // ignore
          }
        }

        const createdOrder = normalizeOrder(res);
        if (data.roomNumber && !createdOrder.roomNumber) {
          createdOrder.roomNumber = data.roomNumber;
        }
        // Gán hình ảnh hoặc chi tiết món nếu từ frontend đã chọn
        if (Array.isArray(data.items) && Array.isArray(createdOrder.items)) {
          createdOrder.items = createdOrder.items.map((it) => {
            const orig = data.items.find((x) => Number(x.serviceItemId) === Number(it.serviceItemId));
            return {
              ...it,
              imageUrl: orig?.imageUrl || it.imageUrl,
            };
          });
        }
        saveOrderToSync(createdOrder, data.bookingCode);
        return createdOrder;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err?.response?.data?.message || err?.data?.message || '');
        const isBookingRoomIdError =
          msg.includes('phòng gán') ||
          msg.includes('không thuộc lượt lưu trú') ||
          err?.status === 404 ||
          (err?.status === 409 && msg.includes('lưu trú'));

        if (!isBookingRoomIdError) {
          // Lỗi nghiệp vụ khác (ví dụ: món ngừng bán, version mismatch) -> ném lỗi ngay
          throw err;
        }
      }
    }

    throw lastError || new Error('Không thể tạo đơn dịch vụ phòng: không xác định được phòng gán hợp lệ');
  },

  /**
   * Xem lịch sử đơn dịch vụ phòng theo Booking / BookingRoom
   * API: GET /api/v1/receptionist/bookings/{bookingId}/room-services?type=ORDER
   * Đồng bộ và đối soát với local sync store.
   */
  async getRoomServiceHistory(bookingId: number, bookingRoomId?: number, bookingCode?: string): Promise<RoomServiceOrder[]> {
    if (!bookingId) return [];

    const params = new URLSearchParams({
      type: 'ORDER',
      page: '0',
      size: '50',
    });
    if (bookingRoomId) {
      params.append('bookingRoomId', String(bookingRoomId));
    }

    let backendOrders: RoomServiceOrder[] = [];
    try {
      const res = await apiClient.get<any>(`/receptionist/bookings/${bookingId}/room-services?${params.toString()}`);
      let orders = res?.orders?.content || [];
      if (orders.length === 0 && bookingRoomId) {
        try {
          const fallbackRes = await apiClient.get<any>(`/receptionist/bookings/${bookingId}/room-services?type=ORDER&page=0&size=50`);
          orders = fallbackRes?.orders?.content || [];
        } catch {
          // ignore
        }
      }
      backendOrders = orders.map(normalizeOrder);
    } catch (err: any) {
      console.warn('[RoomServiceOrderService] getRoomServiceHistory error:', err);
    }

    // Đọc sync store cho booking này
    const allSync = getLocalSyncOrders();
    const syncList = [
      ...(allSync[String(bookingId)] || []),
      ...(bookingCode ? allSync[String(bookingCode).trim().toUpperCase()] || [] : []),
    ];

    // Merge: backend là nguồn gốc, sync store bổ sung cờ xác nhận hoặc đơn mới tạo
    const mergedMap = new Map<number, RoomServiceOrder>();
    backendOrders.forEach((bo) => {
      mergedMap.set(bo.id, bo);
    });

    syncList.forEach((so) => {
      if (mergedMap.has(so.id)) {
        const exist = mergedMap.get(so.id)!;
        mergedMap.set(so.id, {
          ...exist,
          customerConfirmed: so.customerConfirmed ?? exist.customerConfirmed,
          customerConfirmedAt: so.customerConfirmedAt ?? exist.customerConfirmedAt,
          customerRejected: so.customerRejected ?? exist.customerRejected,
          cancelReason: so.cancelReason || exist.cancelReason,
          status: (so.status === 'CANCELLED' && exist.status === 'PENDING') ? 'CANCELLED' : exist.status,
        });
      } else {
        mergedMap.set(so.id, so);
      }
    });

    const finalOrders = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return finalOrders;
  },

  /**
   * Lấy danh sách dịch vụ của khách hàng:
   * Tự động quét từ API Lễ tân (/receptionist/bookings/{bookingId}/room-services)
   * và API Khách hàng (/bookings/{bookingCode}/services), kết hợp cùng sync store.
   * Luôn đảm bảo nạp đủ TOÀN BỘ các món ăn đã gọi (PENDING, PREPARING, DELIVERED, CANCELLED).
   */
  async getCustomerBookingServices(bookingCode?: string, bookingId?: number, roomNumber?: string) {
    const cleanCode = bookingCode ? String(bookingCode).trim().toUpperCase() : '';
    const targetBookingId = bookingId ? Number(bookingId) : 0;

    if (!cleanCode && !targetBookingId) {
      return {
        allOrders: [],
        deliveredOrders: [],
        pendingConfirmationOrders: [],
        totalDeliveredAmount: 0,
        totalPendingAmount: 0,
      };
    }

    const mergedMap = new Map<number, RoomServiceOrder>();
    let backendTotalAmount = 0;

    // 1. Chỉ gọi API Lễ tân nếu người dùng có vai trò Nhân viên (RECEPTIONIST hoặc ADMIN)
    if (isStaffUser() && targetBookingId > 0) {
      try {
        const recRes = await apiClient.get<any>(
          `/receptionist/bookings/${targetBookingId}/room-services?type=ORDER&page=0&size=50`
        );
        const orders = recRes?.orders?.content || [];
        if (Array.isArray(orders)) {
          orders.forEach((rawOrder: any) => {
            const norm = normalizeOrder(rawOrder);
            if (norm.id) mergedMap.set(norm.id, norm);
          });
        }
      } catch {
        // Có thể là tài khoản Customer không có quyền truy cập endpoint /receptionist -> bỏ qua
      }
    }

    // 2. Thử gọi API Khách hàng theo bookingCode
    if (cleanCode) {
      try {
        const res = await apiClient.get<any>(`/bookings/${cleanCode}/services`);
        if (res) {
          backendTotalAmount = Number(res.totalServicesAmount || 0);
          if (Array.isArray(res.orders)) {
            res.orders.forEach((rawOrder: any) => {
              const norm = normalizeOrder(rawOrder);
              if (norm.id && !mergedMap.has(norm.id)) {
                mergedMap.set(norm.id, norm);
              }
            });
          }
        }
      } catch (err: any) {
        console.warn('[RoomServiceOrderService] getCustomerBookingServices backend notice:', err);
      }
    }

    // 3. Đọc từ local sync store (quét cả theo bookingId, bookingCode, roomNumber và toàn bộ storage)
    const allSync = getLocalSyncOrders();
    const syncCandidates: RoomServiceOrder[] = [
      ...(cleanCode ? allSync[cleanCode] || [] : []),
      ...(targetBookingId ? allSync[String(targetBookingId)] || [] : []),
      ...(roomNumber ? allSync[String(roomNumber).trim()] || [] : []),
    ];

    // Quét thêm nếu có đơn thuộc bookingId hoặc bookingCode trong bất kỳ key nào
    Object.values(allSync).forEach((list) => {
      if (Array.isArray(list)) {
        list.forEach((so) => {
          if (
            (targetBookingId && Number(so.bookingId) === targetBookingId) ||
            (cleanCode && so.bookingCode && String(so.bookingCode).trim().toUpperCase() === cleanCode)
          ) {
            syncCandidates.push(so);
          }
        });
      }
    });

    syncCandidates.forEach((so) => {
      if (!so || !so.id) return;
      if (mergedMap.has(so.id)) {
        const exist = mergedMap.get(so.id)!;
        mergedMap.set(so.id, {
          ...exist,
          customerConfirmed: so.customerConfirmed ?? exist.customerConfirmed,
          customerConfirmedAt: so.customerConfirmedAt ?? exist.customerConfirmedAt,
          customerRejected: so.customerRejected ?? exist.customerRejected,
          cancelReason: so.cancelReason || exist.cancelReason,
          status: so.status || exist.status,
        });
      } else {
        mergedMap.set(so.id, so);
      }
    });

    const allOrders = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    // Đơn cần khách xác nhận: PENDING và chưa được xác nhận bởi khách
    const pendingConfirmationOrders = allOrders.filter(
      (o) => o.status === 'PENDING' && !o.customerConfirmed && !o.customerRejected
    );

    // Đơn được tính vào hóa đơn: Các đơn DELIVERED
    const deliveredOrders = allOrders.filter((o) => o.status === 'DELIVERED');
    const totalDelivered = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const finalDeliveredAmount = Math.max(backendTotalAmount, totalDelivered);

    // Tổng tiền của tất cả các món ăn đã gọi hợp lệ (không bị hủy)
    const totalActiveOrdersAmount = allOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Tiền dịch vụ ăn uống: tính theo toàn bộ món đã gọi (hoặc ít nhất bằng số tiền DELIVERED từ backend)
    const totalServicesAmount = totalActiveOrdersAmount > 0 ? totalActiveOrdersAmount : finalDeliveredAmount;

    const totalPending = pendingConfirmationOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      allOrders,
      deliveredOrders,
      pendingConfirmationOrders,
      totalDeliveredAmount: finalDeliveredAmount,
      totalPendingAmount: totalPending,
      totalServicesAmount,
    };
  },

  /**
   * Người dùng xác nhận đơn gọi món của phòng mình đang ở
   */
  async customerConfirmOrder(orderId: number, bookingCode?: string, bookingId?: number): Promise<void> {
    const allSync = getLocalSyncOrders();
    const keysToCheck = [
      ...(bookingCode ? [String(bookingCode).trim().toUpperCase()] : []),
      ...(bookingId ? [String(bookingId)] : []),
    ];

    Object.keys(allSync).forEach((key) => {
      if (keysToCheck.length === 0 || keysToCheck.includes(key)) {
        const list = allSync[key] || [];
        const found = list.find((o) => o.id === orderId);
        if (found) {
          found.customerConfirmed = true;
          found.customerConfirmedAt = new Date().toISOString();
        }
      }
    });

    saveLocalSyncOrders(allSync);
  },

  /**
   * Người dùng từ chối đơn gọi món của phòng mình
   */
  async customerRejectOrder(orderId: number, reason: string, bookingCode?: string, bookingId?: number): Promise<void> {
    const allSync = getLocalSyncOrders();
    const keysToCheck = [
      ...(bookingCode ? [String(bookingCode).trim().toUpperCase()] : []),
      ...(bookingId ? [String(bookingId)] : []),
    ];

    const rejectReason = (reason && reason.trim()) ? reason.trim() : 'Khách từ chối không nhận đơn';

    Object.keys(allSync).forEach((key) => {
      if (keysToCheck.length === 0 || keysToCheck.includes(key)) {
        const list = allSync[key] || [];
        const found = list.find((o) => o.id === orderId);
        if (found) {
          found.status = 'CANCELLED';
          found.customerRejected = true;
          found.cancelReason = 'Khách hàng từ chối: ' + rejectReason;
          found.cancelledBy = 'Khách lưu trú';
        }
      }
    });

    saveLocalSyncOrders(allSync);

    // Cố gắng gọi API Backend nếu token hiện tại có quyền hoặc bỏ qua nếu quyền là CUSTOMER
    try {
      await apiClient.patch(`/receptionist/room-service-orders/${orderId}/status`, {
        status: 'CANCELLED',
        version: 0,
        reason: 'Khách hàng từ chối: ' + rejectReason,
      });
    } catch {
      // Bỏ qua lỗi nếu backend hạn chế quyền RECEPTIONIST
    }
  },

  /**
   * Cập nhật trạng thái đơn dịch vụ phòng (PENDING -> PREPARING -> DELIVERED hoặc CANCELLED)
   * API: PATCH /api/v1/receptionist/room-service-orders/{id}/status
   */
  async updateOrderStatus(
    orderId: number,
    status: RoomServiceOrderStatus,
    version: number,
    reason?: string,
    bookingId?: number,
    bookingCode?: string
  ): Promise<RoomServiceOrder> {
    const payload = {
      status,
      version: Number(version ?? 0),
      reason: reason ? reason.trim() : null,
    };

    const res = await apiClient.patch<any>(`/receptionist/room-service-orders/${orderId}/status`, payload);
    const updated = normalizeOrder(res);

    // Đồng bộ vào local sync store
    saveOrderToSync(updated, bookingCode || (bookingId ? String(bookingId) : undefined));

    return updated;
  },

  /**
   * Lấy chi tiết đơn dịch vụ phòng theo ID
   * API: GET /api/v1/receptionist/room-service-orders/{id}
   */
  async getOrderById(orderId: number): Promise<RoomServiceOrder> {
    const res = await apiClient.get<any>(`/receptionist/room-service-orders/${orderId}`);
    return normalizeOrder(res);
  },
};

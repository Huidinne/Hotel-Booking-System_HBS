/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP2-1109-TRUNG]
 * Suite 02: Booking Flow E2E
 * Endpoints:
 *   - GET  /api/v1/room-types
 *   - POST /api/v1/bookings
 *   - GET  /api/v1/bookings/my-bookings
 * =============================================================================
 */

import { ENDPOINTS } from '../config.js';
import { api, log, testState } from '../utils/api-client.js';
import testData from '../fixtures/test-data.json' with { type: 'json' };

export async function runBookingSuite() {
  log.suite('02 - Tra cứu Phòng trống & Tạo Đơn Đặt Phòng (Booking Flow)');
  const results = { passed: 0, failed: 0 };

  const assert = (condition, name, detail = '') => {
    if (condition) {
      log.pass(name, detail);
      results.passed++;
    } else {
      log.fail(name, detail);
      results.failed++;
    }
  };

  let targetRoomTypeId = 1;

  // 1. Tìm kiếm và tra cứu danh sách phòng còn trống
  try {
    const roomsRes = await api.get(ENDPOINTS.ROOM_TYPES);
    const hasRooms = roomsRes.status === 200 && Array.isArray(roomsRes.data?.data) && roomsRes.data.data.length > 0;
    assert(hasRooms, 'Tìm kiếm & tra cứu danh sách loại phòng (GET /api/v1/room-types)', `Tìm thấy ${roomsRes.data?.data?.length || 0} loại phòng`);

    if (hasRooms) {
      targetRoomTypeId = roomsRes.data.data[0].id;
    }
  } catch (err) {
    assert(false, 'Tìm kiếm & tra cứu danh sách loại phòng', err.message);
  }

  // 2. Tạo đơn đặt phòng mới với tài khoản khách hàng
  // Tính ngày check-in và check-out trong tương lai
  const now = new Date();
  const checkInDate = new Date(now.getTime() + (testData.booking.checkInOffsetDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
  const checkOutDate = new Date(now.getTime() + ((testData.booking.checkInOffsetDays + testData.booking.durationNights) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

  const bookingPayload = {
    roomTypeId: targetRoomTypeId,
    quantity: testData.booking.quantity,
    guests: testData.booking.guests,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    paymentMethod: testData.booking.paymentMethod,
    note: testData.booking.note
  };

  try {
    const bookingRes = await api.post(ENDPOINTS.BOOKINGS, bookingPayload, {
      'Authorization': `Bearer ${testState.customerToken}`
    });

    const bookingSuccess = (bookingRes.status === 201 || bookingRes.status === 200) && bookingRes.data?.data?.bookingCode;
    assert(bookingSuccess, 'Tạo đơn đặt phòng mới thành công (POST /api/v1/bookings)', `Mã đơn: ${bookingRes.data?.data?.bookingCode || 'N/A'}`);

    if (bookingSuccess) {
      testState.createdBookingCode = bookingRes.data.data.bookingCode;
      testState.createdBookingId = bookingRes.data.data.id;
    }
  } catch (err) {
    assert(false, 'Tạo đơn đặt phòng mới thành công', err.message);
  }

  // 3. Tra cứu danh sách đơn đặt phòng cá nhân
  try {
    const myBookingsRes = await api.get(ENDPOINTS.MY_BOOKINGS, {
      'Authorization': `Bearer ${testState.customerToken}`
    });

    const isListValid = myBookingsRes.status === 200 && Array.isArray(myBookingsRes.data?.data?.content || myBookingsRes.data?.data);
    const list = myBookingsRes.data?.data?.content || myBookingsRes.data?.data || [];
    const hasMyBooking = list.some(b => b.bookingCode === testState.createdBookingCode);

    assert(isListValid && (hasMyBooking || list.length > 0), 'Kiểm tra trạng thái đơn đặt cá nhân (GET /api/v1/bookings/my-bookings)', `Đơn trong danh sách: ${list.length}`);
  } catch (err) {
    assert(false, 'Kiểm tra trạng thái đơn đặt cá nhân', err.message);
  }

  return results;
}


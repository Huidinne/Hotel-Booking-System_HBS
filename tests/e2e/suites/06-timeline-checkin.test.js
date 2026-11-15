/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP3-1112-TRUNG]
 * Suite 06: Luồng Vận Hành Nhận Phòng (Timeline Matrix & Check-in Assignment)
 * =============================================================================
 */

import { ENDPOINTS } from '../config.js';
import { api, createSuiteTracker, dateOffsetISO, log, testState } from '../utils/api-client.js';
import testData from '../fixtures/test-data.json' with { type: 'json' };

export async function runTimelineCheckInSuite() {
  log.suite('06 - Vận Hành Nhận Phòng: Room Timeline Matrix & Check-in Flow');
  const { results, assert } = createSuiteTracker();

  // 1. Đăng nhập tài khoản Lễ tân (RECEPTIONIST)
  try {
    const recRes = await api.post(ENDPOINTS.LOGIN, {
      email: testData.users.receptionist.email,
      password: testData.users.receptionist.password,
    });
    const ok = recRes.status === 200 && Boolean(recRes.data?.data?.accessToken);
    if (ok) {
      testState.receptionistToken = recRes.data.data.accessToken;
    }
    assert(ok, 'Đăng nhập tài khoản Lễ tân (RECEPTIONIST)', `HTTP ${recRes.status}`);
  } catch (err) {
    assert(false, 'Đăng nhập tài khoản Lễ tân (RECEPTIONIST)', err.message);
  }

  const custHeaders = { Authorization: `Bearer ${testState.customerToken}` };
  const recHeaders = { Authorization: `Bearer ${testState.receptionistToken}` };
  const today = dateOffsetISO(0);
  const checkOut = dateOffsetISO(testData.extendedFlows.checkInOutBooking.durationNights);
  const timelineEnd = dateOffsetISO(3);
  const deluxeRoomTypeId = testData.extendedFlows.deluxeRoomTypeId;

  // 2. Bảo mật phân quyền RBAC trên Timeline: Customer bị chặn 403
  try {
    const rbacRes = await api.get(
      `${ENDPOINTS.ROOMS_TIMELINE}?startDate=${today}&endDate=${timelineEnd}`,
      custHeaders
    );
    assert(
      rbacRes.status === 403,
      'Bảo mật endpoint Room Timeline: Chặn quyền Customer (HTTP 403 Forbidden)',
      `HTTP ${rbacRes.status}`
    );
  } catch (err) {
    assert(false, 'Bảo mật endpoint Room Timeline: Chặn quyền Customer', err.message);
  }

  // 3. Tạo đơn đặt phòng nhận phòng hôm nay & Lễ tân xác nhận đơn (PENDING -> CONFIRMED)
  let bookingId = null;
  let bookingCode = null;
  try {
    const createRes = await api.post(
      ENDPOINTS.BOOKINGS,
      {
        roomTypeId: deluxeRoomTypeId,
        quantity: testData.extendedFlows.checkInOutBooking.quantity,
        guests: testData.extendedFlows.checkInOutBooking.guests,
        checkIn: today,
        checkOut,
        paymentMethod: testData.extendedFlows.checkInOutBooking.paymentMethod,
        note: testData.extendedFlows.checkInOutBooking.note,
      },
      custHeaders
    );
    bookingId = createRes.data?.data?.id || null;
    bookingCode = createRes.data?.data?.bookingCode || null;

    const confirmRes = await api.put(
      ENDPOINTS.RECEPTIONIST_BOOKING_CONFIRM(bookingId),
      {},
      recHeaders
    );
    const confirmed = confirmRes.status === 200 && confirmRes.data?.data?.bookingStatus === 'CONFIRMED';
    testState.checkInBookingId = bookingId;
    testState.checkInBookingCode = bookingCode;

    assert(
      confirmed,
      'Tạo đơn nhận phòng hôm nay & Lễ tân xác nhận đơn CONFIRMED',
      `bookingCode=${bookingCode || 'N/A'}, HTTP=${confirmRes.status}`
    );
  } catch (err) {
    assert(false, 'Tạo đơn nhận phòng hôm nay & Lễ tân xác nhận đơn CONFIRMED', err.message);
  }

  // 4. Tra cứu Ma trận Lịch Phòng Timeline & danh sách phòng trống vật lý AVAILABLE
  let chosenRoomId = null;
  let chosenRoomNumber = null;
  try {
    const timelineRes = await api.get(
      `${ENDPOINTS.ROOMS_TIMELINE}?startDate=${today}&endDate=${timelineEnd}&roomTypeId=${deluxeRoomTypeId}`,
      recHeaders
    );
    const availRes = await api.get(
      `${ENDPOINTS.RECEPTIONIST_AVAILABLE_ROOMS}?roomTypeId=${deluxeRoomTypeId}`,
      recHeaders
    );

    const timelineRows = timelineRes.data?.data || [];
    const availRooms = availRes.data?.data || [];
    if (availRooms.length > 0) {
      chosenRoomId = availRooms[0].id;
      chosenRoomNumber = availRooms[0].roomNumber;
      testState.checkInRoomIds = [chosenRoomId];
    }

    assert(
      timelineRes.status === 200 &&
        Array.isArray(timelineRows) &&
        timelineRows.length > 0 &&
        Array.isArray(timelineRows[0].dailyStatuses) &&
        availRes.status === 200 &&
        Boolean(chosenRoomId),
      'Hiển thị Ma trận Timeline PMS & tra cứu phòng vật lý trống cho Check-in',
      `Timeline rooms=${timelineRows.length}, chọn phòng ${chosenRoomNumber || 'N/A'} (ID=${chosenRoomId})`
    );
  } catch (err) {
    assert(false, 'Hiển thị Ma trận Timeline PMS & tra cứu phòng vật lý trống', err.message);
  }

  // 5. Thực hiện Check-in gán phòng vật lý & kiểm tra cập nhật trên Timeline
  try {
    const checkInRes = await api.post(
      ENDPOINTS.RECEPTIONIST_CHECK_IN(bookingId),
      { assignedRoomIds: [chosenRoomId] },
      recHeaders
    );
    const ciData = checkInRes.data?.data;

    const afterTimelineRes = await api.get(
      `${ENDPOINTS.RECEPTIONIST_TIMELINE}?startDate=${today}&endDate=${timelineEnd}&roomTypeId=${deluxeRoomTypeId}`,
      recHeaders
    );
    const roomRow = (afterTimelineRes.data?.data || []).find((r) => r.roomId === chosenRoomId);
    const todayCell = (roomRow?.dailyStatuses || []).find((d) => d.date === today);

    assert(
      checkInRes.status === 200 &&
        ciData?.bookingStatus === 'CHECKED_IN' &&
        roomRow?.currentPhysicalStatus === 'OCCUPIED' &&
        todayCell?.status === 'CHECKED_IN' &&
        todayCell?.bookingCode === bookingCode,
      'Check-in gán phòng vật lý & đồng bộ trạng thái OCCUPIED/CHECKED_IN trên Timeline',
      `Phòng ${chosenRoomNumber}: physical=${roomRow?.currentPhysicalStatus}, cell=${todayCell?.status}, code=${todayCell?.bookingCode}`
    );
  } catch (err) {
    assert(false, 'Check-in gán phòng vật lý & đồng bộ Timeline', err.message);
  }

  // 6. Negative Check: Chặn Check-in lặp lại trên đơn đã CHECKED_IN (HTTP 409 Conflict)
  try {
    const dupCheckInRes = await api.post(
      ENDPOINTS.RECEPTIONIST_CHECK_IN(bookingId),
      { assignedRoomIds: [chosenRoomId] },
      recHeaders
    );
    assert(
      dupCheckInRes.status === 409,
      'Chặn Check-in trùng lặp cho đơn đã CHECKED_IN (HTTP 409 Conflict)',
      `HTTP ${dupCheckInRes.status}`
    );
  } catch (err) {
    assert(false, 'Chặn Check-in trùng lặp cho đơn đã CHECKED_IN', err.message);
  }

  return results;
}


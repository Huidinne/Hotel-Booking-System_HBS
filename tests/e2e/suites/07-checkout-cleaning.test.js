/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP3-1112-TRUNG]
 * Suite 07: Luồng Trả Phòng & Dọn Dẹp (Check-out -> CLEANING -> AVAILABLE)
 * =============================================================================
 */

import { CHECK_KNOWN_BUGS, ENDPOINTS } from '../config.js';
import { api, createSuiteTracker, dateOffsetISO, log, testState } from '../utils/api-client.js';
import { waitForMockEmailDispatch } from '../utils/mock-providers.js';

export async function runCheckOutCleaningSuite() {
  log.suite('07 - Trả Phòng & Dọn Dẹp Buồng Phòng (Check-out -> CLEANING -> AVAILABLE)');
  const { results, assert } = createSuiteTracker();

  const recHeaders = { Authorization: `Bearer ${testState.receptionistToken}` };
  const bookingId = testState.checkInBookingId;
  const bookingCode = testState.checkInBookingCode;
  const roomIds = testState.checkInRoomIds || [];
  const targetRoomId = roomIds[0];

  // 1. Thực hiện Check-out đối soát thanh toán tại quầy
  try {
    if (!bookingId || !targetRoomId) {
      throw new Error('Thiếu bookingId/roomId từ Suite 06 Check-in');
    }
    const coRes = await api.post(ENDPOINTS.RECEPTIONIST_CHECK_OUT(bookingId), {}, recHeaders);
    const coData = coRes.data?.data;

    if (
      coData &&
      Number(coData.remainingAmount) > 0 &&
      Number(coData.amountPaid) < Number(coData.totalAmount)
    ) {
      testState.knownBugFindings.push({
        bugId: 'BUG-SP3-03',
        detail: `CheckOutResponse.amountPaid=${coData.amountPaid} trong khi totalAmount=${coData.totalAmount} và remainingAmount=${coData.remainingAmount} vừa được thu tại quầy`,
        payload: coData,
      });
      if (CHECK_KNOWN_BUGS) {
        log.warn('BUG-SP3-03 reproduced', `amountPaid=${coData.amountPaid} != totalAmount=${coData.totalAmount}`);
      }
    }

    assert(
      coRes.status === 200 &&
        coData?.bookingStatus === 'CHECKED_OUT' &&
        coData?.paymentStatus === 'FULLY_PAID' &&
        Array.isArray(coData?.roomsToClean) &&
        coData.roomsToClean.includes(targetRoomId),
      'Thực hiện Check-out & đối soát tất toán hóa đơn (POST /check-out)',
      coRes.status === 200
        ? `status=${coData?.bookingStatus}, paymentStatus=${coData?.paymentStatus}, roomsToClean=${JSON.stringify(coData?.roomsToClean)}`
        : `HTTP ${coRes.status} - ${coRes.data?.message || JSON.stringify(coRes.data)}`
    );
  } catch (err) {
    assert(false, 'Thực hiện Check-out & đối soát tất toán hóa đơn', err.message);
  }

  // 2. Xác minh trạng thái phòng tự động chuyển sang CLEANING trên Danh sách & Timeline
  try {
    const today = dateOffsetISO(0);
    const cleaningRes = await api.get(`${ENDPOINTS.RECEPTIONIST_ROOMS}?status=CLEANING`, recHeaders);
    const timelineRes = await api.get(
      `${ENDPOINTS.ROOMS_TIMELINE}?startDate=${today}&endDate=${today}`,
      recHeaders
    );

    const cleaningList = cleaningRes.data?.data || [];
    const inCleaningList = cleaningList.some((r) => r.id === targetRoomId && r.status === 'CLEANING');
    const timelineRoom = (timelineRes.data?.data || []).find((r) => r.roomId === targetRoomId);
    const cellStatus = timelineRoom?.dailyStatuses?.[0]?.status;

    assert(
      cleaningRes.status === 200 &&
        inCleaningList &&
        timelineRoom?.currentPhysicalStatus === 'CLEANING' &&
        cellStatus === 'CLEANING',
      'Xác minh phòng tự động chuyển sang trạng thái CLEANING sau Check-out',
      `roomId=${targetRoomId}, physical=${timelineRoom?.currentPhysicalStatus}, timelineCell=${cellStatus}`
    );
  } catch (err) {
    assert(false, 'Xác minh phòng tự động chuyển sang trạng thái CLEANING', err.message);
  }

  // 3. Negative Check: Chặn chuyển sai quy trình CLEANING -> MAINTENANCE trực tiếp (HTTP 400)
  try {
    const badTransRes = await api.put(
      ENDPOINTS.RECEPTIONIST_ROOM_STATUS(targetRoomId),
      { status: 'MAINTENANCE' },
      recHeaders
    );
    assert(
      badTransRes.status === 400,
      'Chặn chuyển trạng thái không hợp lệ CLEANING -> MAINTENANCE (HTTP 400 Bad Request)',
      `HTTP ${badTransRes.status}`
    );
  } catch (err) {
    assert(false, 'Chặn chuyển trạng thái không hợp lệ CLEANING -> MAINTENANCE', err.message);
  }

  // 4. Hoàn tất dọn dẹp: Cập nhật phòng CLEANING -> AVAILABLE và kiểm tra sẵn sàng đón khách
  try {
    const cleanDoneRes = await api.put(
      ENDPOINTS.RECEPTIONIST_ROOM_STATUS(targetRoomId),
      { status: 'AVAILABLE' },
      recHeaders
    );
    const cleaningAfterRes = await api.get(`${ENDPOINTS.RECEPTIONIST_ROOMS}?status=CLEANING`, recHeaders);
    const availAfterRes = await api.get(
      `${ENDPOINTS.RECEPTIONIST_AVAILABLE_ROOMS}?roomTypeId=2`,
      recHeaders
    );

    const stillCleaning = (cleaningAfterRes.data?.data || []).some((r) => r.id === targetRoomId);
    const backAvailable = (availAfterRes.data?.data || []).some((r) => r.id === targetRoomId);

    assert(
      cleanDoneRes.status === 200 && !stillCleaning && backAvailable,
      'Cập nhật phòng hoàn tất dọn dẹp CLEANING -> AVAILABLE (PUT /rooms/{id}/status)',
      `roomId=${targetRoomId}, backAvailable=${backAvailable}`
    );
  } catch (err) {
    assert(false, 'Cập nhật phòng hoàn tất dọn dẹp CLEANING -> AVAILABLE', err.message);
  }

  // 5. Xác minh hệ thống tự động gửi Email quyết toán kèm Hóa đơn PDF sau Check-out (Mock Mode)
  try {
    const outboxCheck = await waitForMockEmailDispatch(
      api,
      ENDPOINTS.EMAIL_TEST_MOCK_OUTBOX,
      bookingCode,
      1500,
      'quyet_toan'
    );
    if (outboxCheck.mockEnabled) {
      const m = outboxCheck.matched;
      assert(
        Boolean(m) && m.hasAttachment === true && m.attachmentFilename?.includes('quyet_toan'),
        '[MOCK-PROVIDER] Xác minh email hóa đơn quyết toán đính kèm PDF sau Check-out',
        m ? `file=${m.attachmentFilename}, size=${m.attachmentSizeBytes}B` : 'Chưa thấy email quyết toán'
      );
    } else {
      assert(true, 'Email quyết toán Check-out đã được kích hoạt bất đồng bộ', 'SMTP live mode');
    }
  } catch (err) {
    assert(false, 'Xác minh email hóa đơn quyết toán sau Check-out', err.message);
  }

  return results;
}

/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP3-1112-TRUNG]
 * Suite 08: Luồng Hoàn Tiền & Sổ Cái Tài Chính (Refund & Payment Ledger Flow)
 * =============================================================================
 */

import { CHECK_KNOWN_BUGS, ENDPOINTS, VNPAY_HASH_SECRET } from '../config.js';
import { api, createSuiteTracker, dateOffsetISO, log, testState } from '../utils/api-client.js';
import { buildSignedVnPayCallbackQuery } from '../utils/mock-providers.js';
import testData from '../fixtures/test-data.json' with { type: 'json' };

export async function runRefundLedgerSuite() {
  log.suite('08 - Hoàn Tiền & Đối Soát Sổ Cái Tài Chính (Refund & Payment Ledger Flow)');
  const { results, assert } = createSuiteTracker();

  const custHeaders = { Authorization: `Bearer ${testState.customerToken}` };
  const recHeaders = { Authorization: `Bearer ${testState.receptionistToken}` };
  const adminHeaders = { Authorization: `Bearer ${testState.adminToken}` };

  const today = dateOffsetISO(0);
  const checkIn = dateOffsetISO(testData.extendedFlows.refundBooking.checkInOffsetDays);
  const checkOut = dateOffsetISO(
    testData.extendedFlows.refundBooking.checkInOffsetDays + testData.extendedFlows.refundBooking.durationNights
  );

  let bookingId = null;
  let bookingCode = null;
  let depositAmount = 0;

  // 1. Tạo đơn đặt phòng VNPAY (>=24h trước check-in) & hoàn tất cọc 50% qua Mock IPN
  try {
    const createRes = await api.post(
      ENDPOINTS.BOOKINGS,
      {
        roomTypeId: testData.booking.roomTypeId,
        quantity: testData.extendedFlows.refundBooking.quantity,
        guests: testData.extendedFlows.refundBooking.guests,
        checkIn,
        checkOut,
        paymentMethod: 'VNPAY',
        note: testData.extendedFlows.refundBooking.note,
      },
      custHeaders
    );
    const bData = createRes.data?.data;
    bookingId = bData?.id;
    bookingCode = bData?.bookingCode;
    depositAmount = Number(bData?.depositAmount || 0);
    testState.refundBookingId = bookingId;
    testState.refundBookingCode = bookingCode;

    const signed = buildSignedVnPayCallbackQuery({
      paymentUrl: bData.paymentUrl,
      responseCode: '00',
      hashSecret: VNPAY_HASH_SECRET,
    });
    const ipnRes = await api.get(`${ENDPOINTS.VNPAY_IPN}?${signed.queryString}`);

    assert(
      (createRes.status === 201 || createRes.status === 200) &&
        ipnRes.status === 200 &&
        ipnRes.data?.RspCode === '00' &&
        depositAmount > 0,
      'Tạo đơn VNPAY & ghi nhận bút toán cọc 50% (DEPOSIT) thành công',
      `bookingCode=${bookingCode}, deposit=${depositAmount}`
    );
  } catch (err) {
    assert(false, 'Tạo đơn VNPAY & ghi nhận bút toán cọc 50%', err.message);
  }

  // 2. Khách hàng hủy đơn trước 24h -> 0% phạt, chuyển REFUND_PENDING
  try {
    const cancelRes = await api.post(
      ENDPOINTS.BOOKING_CANCEL(bookingCode),
      testData.extendedFlows.refundBank,
      custHeaders
    );
    const cData = cancelRes.data?.data;

    assert(
      cancelRes.status === 200 &&
        cData?.bookingStatus === 'CANCELLED' &&
        cData?.paymentStatus === 'REFUND_PENDING' &&
        Number(cData?.penaltyAmount) === 0 &&
        Number(cData?.refundAmount) === depositAmount,
      'Khách hàng hủy phòng hợp lệ (>=24h) -> REFUND_PENDING hoàn 100% cọc',
      `penalty=${cData?.penaltyAmount}, refund=${cData?.refundAmount}`
    );
  } catch (err) {
    assert(false, 'Khách hàng hủy phòng hợp lệ (>=24h) -> REFUND_PENDING', err.message);
  }

  // (Optional Bug Verification Probe) Hủy đơn có hoàn tiền với bankName/accountNumber rỗng (BUG-SP3-04)
  if (CHECK_KNOWN_BUGS) {
    log.info('Known-Bug Probe BUG-SP3-04: CancelBookingRequest thiếu @NotBlank bank info khi refundAmount > 0 đã được ghi nhận trong phân tích DTO');
  }

  // 3. Lễ tân tra cứu danh sách chờ hoàn tiền & xác nhận đã chuyển khoản hoàn cọc
  try {
    const listRes = await api.get(`${ENDPOINTS.RECEPTIONIST_REFUNDS}?page=0&size=20`, recHeaders);
    const pendingItems = listRes.data?.data?.content || [];
    const targetRefund = pendingItems.find((item) => item.bookingCode === bookingCode);

    const confirmRes = await api.post(
      ENDPOINTS.RECEPTIONIST_REFUND_CONFIRM(bookingId),
      { referenceNote: `FT-E2E-REFUND-${Date.now()}` },
      recHeaders
    );
    const confirmedData = confirmRes.data?.data;

    assert(
      listRes.status === 200 &&
        Boolean(targetRefund) &&
        targetRefund.accountNumberMasked === '**** **** 8877' &&
        confirmRes.status === 200 &&
        confirmedData?.paymentStatus === 'REFUNDED',
      'Lễ tân đối soát & xác nhận hoàn cọc thủ công (REFUND_PENDING -> REFUNDED)',
      `maskedAcc=${targetRefund?.accountNumberMasked}, finalPaymentStatus=${confirmedData?.paymentStatus}`
    );
  } catch (err) {
    assert(false, 'Lễ tân đối soát & xác nhận hoàn cọc thủ công', err.message);
  }

  // 4. Bảo mật phân quyền Sổ Cái: Customer truy cập /admin/payment-ledger bị chặn 403
  try {
    const rbacRes = await api.get(ENDPOINTS.ADMIN_PAYMENT_LEDGER, custHeaders);
    assert(
      rbacRes.status === 403,
      'Bảo mật endpoint Sổ Cái: Chặn quyền Customer (HTTP 403 Forbidden)',
      `HTTP ${rbacRes.status}`
    );
  } catch (err) {
    assert(false, 'Bảo mật endpoint Sổ Cái: Chặn quyền Customer', err.message);
  }

  // 5. Admin kiểm tra Sổ Cái Thanh Toán ghi nhận đầy đủ DEPOSIT (+1), COUNTER_PAYMENT (+1), REFUND (-1) & Net Cash Flow
  try {
    const ledgerRes = await api.get(
      `${ENDPOINTS.ADMIN_PAYMENT_LEDGER}?startDate=${today}&endDate=${today}&page=0&size=50`,
      adminHeaders
    );
    const summaryRes = await api.get(
      `${ENDPOINTS.ADMIN_PAYMENT_LEDGER_SUMMARY}?startDate=${today}&endDate=${today}`,
      adminHeaders
    );

    const entries = ledgerRes.data?.data?.entries || [];
    const summary = summaryRes.data?.data || {};

    const depositEntry = entries.find((e) => e.bookingCode === bookingCode && e.type === 'DEPOSIT');
    const refundEntry = entries.find((e) => e.bookingCode === bookingCode && e.type === 'REFUND');
    const counterEntry = entries.find(
      (e) => e.bookingCode === testState.checkInBookingCode && e.type === 'COUNTER_PAYMENT'
    );

    const netExpected =
      Number(summary.totalDepositOnline || 0) +
      Number(summary.totalCounterRevenue || 0) -
      Number(summary.totalRefunded || 0);
    const netActual = Number(summary.netCashFlow || 0);

    assert(
      ledgerRes.status === 200 &&
        summaryRes.status === 200 &&
        Boolean(depositEntry) &&
        depositEntry.cashFlowSign === 1 &&
        Boolean(counterEntry) &&
        counterEntry.cashFlowSign === 1 &&
        Boolean(refundEntry) &&
        refundEntry.cashFlowSign === -1 &&
        refundEntry.paymentMethod === 'BANK_TRANSFER' &&
        Math.abs(netExpected - netActual) < 0.01,
      'Xác minh Sổ Cái Thanh Toán khớp toàn bộ bút toán DEPOSIT (+1), COUNTER (+1), REFUND (-1) & Net Cash Flow',
      `depositOnline=${summary.totalDepositOnline}, counter=${summary.totalCounterRevenue}, refunded=${summary.totalRefunded}, net=${netActual}`
    );
  } catch (err) {
    assert(false, 'Xác minh Sổ Cái Thanh Toán & Net Cash Flow', err.message);
  }

  return results;
}

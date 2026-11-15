/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP3-1112-TRUNG]
 * Suite 05: Luồng Đặt Phòng Toàn Trình (chat -> booking -> sandbox/mock -> mail/PDF)
 * =============================================================================
 */

import { ENDPOINTS, RUN_SANDBOX_MANUAL, USE_MOCK_PROVIDERS, VNPAY_HASH_SECRET } from '../config.js';
import { api, createSuiteTracker, dateOffsetISO, log, testState } from '../utils/api-client.js';
import {
  buildSignedVnPayCallbackQuery,
  isValidPdfBuffer,
  waitForMockEmailDispatch,
} from '../utils/mock-providers.js';
import testData from '../fixtures/test-data.json' with { type: 'json' };

export async function runBookingFullE2eSuite() {
  const modeLabel = USE_MOCK_PROVIDERS ? 'CI Mock Mode (USE_MOCK_PROVIDERS=true)' : 'Live Sandbox Mode';
  log.suite(`05 - Đặt Phòng Toàn Trình: Chat -> Booking -> Payment -> Mail/PDF [${modeLabel}]`);
  const { results, assert, skip } = createSuiteTracker();

  const authHeaders = testState.customerToken
    ? { Authorization: `Bearer ${testState.customerToken}` }
    : {};
  const chatSessionId = `e2e-full-${Date.now()}`;
  const checkIn = dateOffsetISO(10);
  const checkOut = dateOffsetISO(12);

  let quoteId = null;
  let draftId = null;
  let paymentUrl = null;
  let bookingCode = null;
  let bookingId = null;

  // 1. Chatbot báo giá (getBookingQuote tool)
  try {
    const quoteMsg = testData.chat.quoteRequestTemplate
      .replace('{checkIn}', checkIn)
      .replace('{checkOut}', checkOut);
    const quoteRes = await api.post(
      ENDPOINTS.CHAT_MESSAGE,
      { sessionId: chatSessionId, message: quoteMsg },
      authHeaders
    );
    quoteId = quoteRes.data?.data?.cardData?.quoteId || null;
    assert(
      quoteRes.status === 200 && quoteRes.data?.data?.cardType === 'BOOKING_QUOTE' && Boolean(quoteId),
      'Chat tư vấn & xuất thẻ báo giá phòng (POST /chat/message -> BOOKING_QUOTE)',
      `quoteId=${quoteId || 'N/A'}, provider=${quoteRes.data?.data?.provider || 'N/A'}`
    );
  } catch (err) {
    assert(false, 'Chat tư vấn & xuất thẻ báo giá phòng', err.message);
  }

  // 2. Chatbot chuẩn bị bản nháp đặt phòng (prepareBooking tool)
  try {
    const draftMsg = testData.chat.prepareBookingTemplate.replace('{quoteId}', quoteId || 'quote-missing');
    const draftRes = await api.post(
      ENDPOINTS.CHAT_MESSAGE,
      { sessionId: chatSessionId, message: draftMsg },
      authHeaders
    );
    draftId = draftRes.data?.data?.cardData?.draftId || null;
    assert(
      draftRes.status === 200 && draftRes.data?.data?.cardType === 'BOOKING_DRAFT' && Boolean(draftId),
      'Chat tạo bản nháp đặt phòng gắn User (POST /chat/message -> BOOKING_DRAFT)',
      `draftId=${draftId || 'N/A'}`
    );
  } catch (err) {
    assert(false, 'Chat tạo bản nháp đặt phòng gắn User', err.message);
  }

  // 3. Khách hàng xác nhận Draft -> Tạo Booking PENDING với phương thức VNPAY
  try {
    const confirmRes = await api.post(
      ENDPOINTS.CHAT_CONFIRM,
      {
        draftId,
        idempotencyKey: `idem-${Date.now()}`,
        paymentMethod: 'VNPAY',
        note: 'E2E Sprint 3 Full Flow Chat->Booking->Payment->PDF',
      },
      authHeaders
    );
    const bData = confirmRes.data?.data;
    bookingCode = bData?.bookingCode || null;
    bookingId = bData?.id || null;
    paymentUrl = bData?.paymentUrl || null;
    testState.fullFlowBookingCode = bookingCode;
    testState.fullFlowBookingId = bookingId;
    testState.fullFlowPaymentUrl = paymentUrl;

    assert(
      confirmRes.status === 200 &&
        Boolean(bookingCode) &&
        bData?.bookingStatus === 'PENDING' &&
        typeof paymentUrl === 'string' &&
        paymentUrl.includes('vnp_TxnRef=') &&
        paymentUrl.includes('vnp_SecureHash='),
      'Xác nhận bản nháp từ Chat & sinh URL thanh toán VNPay (POST /chat/booking/confirm)',
      `bookingCode=${bookingCode || 'N/A'}, status=${bData?.bookingStatus || 'N/A'}`
    );
  } catch (err) {
    assert(false, 'Xác nhận bản nháp từ Chat & sinh URL thanh toán VNPay', err.message);
  }

  // 4. Thanh toán qua Mock VNPay Provider (HMAC-SHA512 IPN + Return)
  if (USE_MOCK_PROVIDERS) {
    try {
      if (!paymentUrl) {
        throw new Error('Không có paymentUrl từ bước xác nhận draft');
      }
      const signed = buildSignedVnPayCallbackQuery({
        paymentUrl,
        responseCode: '00',
        hashSecret: VNPAY_HASH_SECRET,
      });

      const ipnRes = await api.get(`${ENDPOINTS.VNPAY_IPN}?${signed.queryString}`);
      const returnRes = await api.get(`${ENDPOINTS.VNPAY_RETURN}?${signed.queryString}`);
      const bookingCheckRes = await api.get(ENDPOINTS.BOOKING_BY_CODE(bookingCode), authHeaders);
      const updatedBooking = bookingCheckRes.data?.data;

      assert(
        ipnRes.status === 200 &&
          ipnRes.data?.RspCode === '00' &&
          returnRes.status === 200 &&
          returnRes.data?.data?.success === true &&
          updatedBooking?.bookingStatus === 'CONFIRMED' &&
          updatedBooking?.paymentStatus === 'PARTIALLY_PAID',
        '[MOCK-PROVIDER] Giả lập VNPay IPN & Return ký HMAC-SHA512 -> Booking CONFIRMED',
        `RspCode=${ipnRes.data?.RspCode}, bookingStatus=${updatedBooking?.bookingStatus}, paymentStatus=${updatedBooking?.paymentStatus}`
      );
    } catch (err) {
      assert(false, '[MOCK-PROVIDER] Giả lập VNPay IPN & Return ký HMAC-SHA512', err.message);
    }
  } else {
    skip(
      '[MOCK-PROVIDER] Giả lập VNPay IPN tự động',
      'Skipped vì USE_MOCK_PROVIDERS=false (đang bật chế độ Sandbox thật)'
    );
  }

  // 5. @sandbox-manual: Gọi trực tiếp cổng VNPay Sandbox thật (tự động SKIP trong CI/Mock mode)
  if (RUN_SANDBOX_MANUAL && !USE_MOCK_PROVIDERS) {
    try {
      if (!paymentUrl) {
        throw new Error('Không có paymentUrl để kiểm tra cổng sandbox.vnpayment.vn');
      }
      const sandboxRes = await fetch(paymentUrl, { method: 'GET', redirect: 'manual' });
      const okStatus = sandboxRes.status >= 200 && sandboxRes.status < 400;
      assert(
        okStatus,
        '@sandbox-manual Kiểm tra kết nối trực tiếp cổng VNPay Sandbox thật',
        `HTTP ${sandboxRes.status} -> ${paymentUrl.slice(0, 70)}...`,
        { tag: '@sandbox-manual' }
      );
    } catch (err) {
      assert(
        false,
        '@sandbox-manual Kiểm tra kết nối trực tiếp cổng VNPay Sandbox thật',
        err.message,
        { tag: '@sandbox-manual' }
      );
    }
  } else {
    skip(
      '@sandbox-manual Kiểm tra kết nối trực tiếp cổng VNPay Sandbox thật',
      'Skipped trong CI/Mock mode (USE_MOCK_PROVIDERS=true). Chạy với USE_MOCK_PROVIDERS=false RUN_SANDBOX_MANUAL=true để kiểm thử manual.',
      { tag: '@sandbox-manual' }
    );
  }

  // 6. Xuất Hóa đơn / Phiếu xác nhận PDF A4
  try {
    const pdfRes = await api.getBuffer(ENDPOINTS.BOOKING_INVOICE_PDF(bookingCode), authHeaders);
    const validPdf = pdfRes.status === 200 && pdfRes.contentType.includes('application/pdf') && isValidPdfBuffer(pdfRes.data);
    assert(
      validPdf,
      'Xuất hóa đơn đặt phòng định dạng PDF A4 (GET /bookings/{code}/invoice-pdf)',
      `HTTP ${pdfRes.status}, bytes=${Buffer.isBuffer(pdfRes.data) ? pdfRes.data.length : 0}`
    );
  } catch (err) {
    assert(false, 'Xuất hóa đơn đặt phòng định dạng PDF A4', err.message);
  }

  // 7. Kích hoạt & xác minh gửi Email xác nhận kèm PDF (Mock Outbox trên CI / @sandbox-manual khi gửi SMTP thật)
  try {
    const emailTriggerRes = await api.post(ENDPOINTS.BOOKING_SEND_EMAIL(bookingCode), {}, authHeaders);
    const outboxCheck = await waitForMockEmailDispatch(api, ENDPOINTS.EMAIL_TEST_MOCK_OUTBOX, bookingCode, 4000);

    if (outboxCheck.mockEnabled) {
      const m = outboxCheck.matched;
      assert(
        emailTriggerRes.status === 200 &&
          Boolean(m) &&
          m.hasAttachment === true &&
          m.attachmentSizeBytes > 500,
        '[MOCK-PROVIDER] Xác minh email xác nhận & đính kèm PDF trong Mock Outbox',
        m ? `to=${m.to}, file=${m.attachmentFilename}, size=${m.attachmentSizeBytes}B` : 'Không thấy email trong mock-outbox'
      );
    } else {
      assert(
        emailTriggerRes.status === 200,
        'Kích hoạt API gửi email xác nhận kèm hóa đơn PDF (POST /send-invoice-email)',
        `HTTP ${emailTriggerRes.status}, recipient=${emailTriggerRes.data?.data || 'N/A'}`
      );
    }
  } catch (err) {
    assert(false, 'Kích hoạt & xác minh gửi Email xác nhận kèm PDF', err.message);
  }

  if (RUN_SANDBOX_MANUAL && !USE_MOCK_PROVIDERS) {
    try {
      const realSmtpRes = await api.post(ENDPOINTS.EMAIL_TEST_CONFIRMATION, {
        to: testState.customerEmail || testData.users.customer.email,
        withAttachment: true,
      });
      assert(
        realSmtpRes.status === 200 && realSmtpRes.data?.status === 'ACCEPTED',
        '@sandbox-manual Kích hoạt gửi Email SMTP thật qua Brevo Sandbox',
        `HTTP ${realSmtpRes.status}, executionTimeMs=${realSmtpRes.data?.executionTimeMs}`,
        { tag: '@sandbox-manual' }
      );
    } catch (err) {
      assert(false, '@sandbox-manual Kích hoạt gửi Email SMTP thật qua Brevo Sandbox', err.message, {
        tag: '@sandbox-manual',
      });
    }
  } else {
    skip(
      '@sandbox-manual Xác minh gửi Email qua SMTP Gateway thật (Brevo)',
      'Skipped trong CI/Mock mode (USE_MOCK_PROVIDERS=true). Bật RUN_SANDBOX_MANUAL=true USE_MOCK_PROVIDERS=false khi kiểm thử manual.',
      { tag: '@sandbox-manual' }
    );
  }

  log.info(`Kết thúc Suite 05 — Booking: ${bookingCode || 'N/A'}`);
  return results;
}


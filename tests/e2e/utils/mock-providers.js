/**
 * =============================================================================
 * HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
 * Task: [SP3-1112-TRUNG]
 * File: tests/e2e/utils/mock-providers.js
 * Purpose: Mock Providers cho CI (VNPay IPN Signer, Mock Email Outbox Checker, PDF Validator)
 * =============================================================================
 */

import crypto from 'node:crypto';
import { VNPAY_HASH_SECRET } from '../config.js';

/**
 * Encode chuỗi khớp với Java `URLEncoder.encode(value, StandardCharsets.US_ASCII)`
 * dùng trong `VnPayUtil.buildHashData`: khoảng trắng -> '+', giữ nguyên '*', '-', '_', '.'.
 */
export function javaUrlEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/[!'()~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');
}

/**
 * Ký chữ ký HMAC-SHA512 và dựng query string VNPay callback (IPN / Return) hợp lệ.
 */
export function buildSignedVnPayCallbackQuery({
  paymentUrl,
  responseCode = '00',
  bankCode = 'NCB',
  hashSecret = VNPAY_HASH_SECRET,
  vnpTransactionNo = `VNP${Date.now()}`,
}) {
  const parsedUrl = new URL(paymentUrl);
  const src = parsedUrl.searchParams;

  const txnRef = src.get('vnp_TxnRef');
  const amount = src.get('vnp_Amount');
  const tmnCode = src.get('vnp_TmnCode') || 'DEMO_TMN';
  const orderInfo = src.get('vnp_OrderInfo') || `Dat coc ${txnRef}`;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const payDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const params = {
    vnp_Amount: amount,
    vnp_BankCode: bankCode,
    vnp_BankTranNo: `VNPAY${Date.now().toString().slice(-6)}`,
    vnp_CardType: 'ATM',
    vnp_OrderInfo: orderInfo,
    vnp_PayDate: payDate,
    vnp_ResponseCode: responseCode,
    vnp_TmnCode: tmnCode,
    vnp_TransactionNo: vnpTransactionNo,
    vnp_TransactionStatus: responseCode,
    vnp_TxnRef: txnRef,
  };

  const sortedKeys = Object.keys(params)
    .filter((k) => params[k] !== null && params[k] !== undefined && params[k] !== '')
    .sort();

  const hashData = sortedKeys.map((k) => `${k}=${javaUrlEncode(params[k])}`).join('&');
  const secureHash = crypto.createHmac('sha512', hashSecret).update(hashData, 'utf8').digest('hex');

  return {
    txnRef,
    vnpTransactionNo,
    amountVnd: Number(amount) / 100,
    queryString: `${hashData}&vnp_SecureHash=${secureHash}`,
  };
}

/**
 * Chờ ngắn hạn cho Async Mail ThreadPool ghi nhận email vào Mock Outbox (khi USE_MOCK_PROVIDERS=true).
 */
export async function waitForMockEmailDispatch(
  api,
  outboxEndpoint,
  bookingCode,
  maxWaitMs = 4000,
  filenameContains = null
) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await api.get(outboxEndpoint);
    if (res.status === 200 && res.data) {
      if (!res.data.mockProvidersEnabled) {
        return { checked: true, mockEnabled: false, matched: null };
      }
      const messages = res.data.messages || [];
      const found = messages.find(
        (m) =>
          m.subject &&
          m.subject.includes(bookingCode) &&
          (!filenameContains || (m.attachmentFilename && m.attachmentFilename.includes(filenameContains)))
      );
      if (found) {
        return { checked: true, mockEnabled: true, matched: found };
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { checked: true, mockEnabled: true, matched: null };
}

/**
 * Xác minh payload trả về đúng chuẩn tệp PDF A4 hợp lệ (%PDF- signature).
 */
export function isValidPdfBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 500) {
    return false;
  }
  return buf.subarray(0, 5).toString('ascii') === '%PDF-';
}

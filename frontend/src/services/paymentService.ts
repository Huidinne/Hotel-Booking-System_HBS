// =============================================================================
// HOTEL BOOKING SYSTEM - PAYMENT SERVICE
// File: src/services/paymentService.ts
// Direct integration with Spring Boot /api/v1/payments and /receptionist/refunds
// =============================================================================

import { apiClient } from './apiClient';
import { ConfirmRefundRequest, RefundResponse } from '../types/payment';

export const paymentService = {
  /**
   * Pending refunds list: GET /api/v1/receptionist/refunds
   */
  async getPendingRefunds(): Promise<RefundResponse[]> {
    const data = await apiClient.get<any>('/receptionist/refunds?page=0&size=50');
    const content = Array.isArray(data) ? data : data?.content || [];
    return content.map((item: any) => ({
      bookingId: Number(item.bookingId),
      bookingCode: item.bookingCode,
      refundAmount: Number(item.refundAmount || 0),
      paymentStatus: item.paymentStatus || 'REFUND_PENDING',
      bankName: item.bankName || 'Ngân hàng thụ hưởng',
      accountNumberMasked: item.accountNumberMasked || (item.accountNumber ? `******${String(item.accountNumber).slice(-4)}` : '******'),
      accountHolder: item.accountHolder || item.customerName || 'Khách hàng',
      cancellationReason: item.cancellationReason || '',
      cancelledAt: item.cancelledAt,
    }));
  },

  /**
   * Confirm manual refund transfer: POST /api/v1/receptionist/refunds/{bookingId}/confirm
   */
  async confirmRefund(bookingId: number, request: ConfirmRefundRequest): Promise<void> {
    await apiClient.post(`/receptionist/refunds/${bookingId}/confirm`, {
      referenceNote: request.referenceNote,
    });
  },

  /**
   * Process VNPay return callback: GET /api/v1/payments/vnpay-return
   */
  async processVNPayReturn(bookingCode: string, responseCode: string, allParams: Record<string, string> = {}): Promise<boolean> {
    const query = new URLSearchParams(allParams);
    if (!query.has('vnp_TxnRef')) query.set('vnp_TxnRef', bookingCode);
    if (!query.has('vnp_ResponseCode')) query.set('vnp_ResponseCode', responseCode);

    const res = await apiClient.get<any>(`/payments/vnpay-return?${query.toString()}`);
    return Boolean(res && (res.status === 'SUCCESS' || res.vnp_ResponseCode === '00' || responseCode === '00'));
  },
};

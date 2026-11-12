// =============================================================================
// HOTEL BOOKING SYSTEM - PAYMENT SERVICE
// File: src/services/paymentService.ts
// Direct integration with Spring Boot /api/v1/payments and /receptionist/refunds
// =============================================================================

import { apiClient } from './apiClient';
import {
  ConfirmRefundRequest,
  RefundResponse,
  PaymentLedgerFilter,
  PaymentLedgerResponse,
  PaymentLedgerSummary,
} from '../types/payment';

export const paymentService = {
  /**
   * Pending refunds list: GET /api/v1/receptionist/refunds
   * Pure integration - No dummy fallbacks or fake account numbers.
   */
  async getPendingRefunds(): Promise<RefundResponse[]> {
    const data = await apiClient.get<any>('/receptionist/refunds?page=0&size=50');
    const content = Array.isArray(data) ? data : data?.content || [];
    return content.map((item: any) => ({
      bookingId: Number(item.bookingId),
      bookingCode: item.bookingCode,
      customerName: item.customerName || null,
      customerPhone: item.customerPhone || null,
      refundAmount: Number(item.refundAmount || 0),
      paymentStatus: item.paymentStatus || 'REFUND_PENDING',
      bankName: item.bankName || null,
      accountNumberMasked: item.accountNumberMasked || null,
      accountHolder: item.accountHolder || null,
      cancellationReason: item.cancellationReason || '',
      cancelledAt: item.cancelledAt || null,
    }));
  },

  /**
   * Confirm manual refund transfer: POST /api/v1/receptionist/refunds/{bookingId}/confirm
   * Throws error with err.status (e.g. 409 Conflict) on failure.
   */
  async confirmRefund(bookingId: number, request: ConfirmRefundRequest): Promise<RefundResponse> {
    const res = await apiClient.post<any>(`/receptionist/refunds/${bookingId}/confirm`, {
      referenceNote: request.referenceNote,
    });
    return res as RefundResponse;
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

  /**
   * Get payment ledger (Sổ cái đối soát): GET /api/v1/admin/payment-ledger
   */
  async getPaymentLedger(filter: PaymentLedgerFilter = {}): Promise<PaymentLedgerResponse> {
    const query = new URLSearchParams();
    if (filter.startDate) query.set('startDate', filter.startDate);
    if (filter.endDate) query.set('endDate', filter.endDate);
    if (filter.type) query.set('type', filter.type);
    if (filter.paymentMethod) query.set('paymentMethod', filter.paymentMethod);
    if (filter.status) query.set('status', filter.status);
    if (filter.bookingCode) query.set('bookingCode', filter.bookingCode);
    if (filter.page !== undefined) query.set('page', String(filter.page));
    if (filter.size !== undefined) query.set('size', String(filter.size));

    const res = await apiClient.get<any>(`/admin/payment-ledger?${query.toString()}`);
    return res as PaymentLedgerResponse;
  },

  /**
   * Get ledger cash flow summary: GET /api/v1/admin/payment-ledger/summary
   */
  async getLedgerSummary(startDate?: string, endDate?: string): Promise<PaymentLedgerSummary> {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);

    const res = await apiClient.get<any>(`/admin/payment-ledger/summary?${query.toString()}`);
    return res as PaymentLedgerSummary;
  },
};

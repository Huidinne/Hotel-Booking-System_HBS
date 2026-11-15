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
  VietQrPayment,
  CreateVietQrPaymentRequest,
  PaymentStatusResponse,
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

  /**
   * Tạo hoặc lấy yêu cầu thanh toán VietQR: POST /api/v1/payments/vietqr
   */
  async createVietQrPayment(req: CreateVietQrPaymentRequest): Promise<VietQrPayment> {
    const res = await apiClient.post<any>('/payments/vietqr', req);
    return res as VietQrPayment;
  },

  /**
   * Lấy chi tiết giao dịch thanh toán: GET /api/v1/payments/{paymentId}
   */
  async getPaymentById(paymentId: number): Promise<VietQrPayment> {
    const res = await apiClient.get<any>(`/payments/${paymentId}`);
    return res as VietQrPayment;
  },

  /**
   * Lấy giao dịch thanh toán theo Booking: GET /api/v1/payments/booking/{bookingId}
   */
  async getPaymentByBooking(bookingIdentifier: number | string): Promise<VietQrPayment> {
    const res = await apiClient.get<any>(`/payments/booking/${bookingIdentifier}`);
    return res as VietQrPayment;
  },

  /**
   * Kiểm tra nhanh trạng thái thanh toán (polling): GET /api/v1/payments/{paymentId}/status
   */
  async getPaymentStatus(paymentId: number): Promise<PaymentStatusResponse> {
    const res = await apiClient.get<any>(`/payments/${paymentId}/status`);
    return res as PaymentStatusResponse;
  },

  /**
   * Danh sách giao dịch chờ xác nhận: GET /api/v1/admin/payments/pending
   */
  async getPendingPayments(page = 0, size = 20, search?: string): Promise<{ content: VietQrPayment[]; totalElements: number; totalPages: number }> {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('size', String(size));
    if (search && search.trim()) query.set('search', search.trim());

    const res = await apiClient.get<any>(`/admin/payments/pending?${query.toString()}`);
    return {
      content: res?.content || [],
      totalElements: res?.totalElements || 0,
      totalPages: res?.totalPages || 0,
    };
  },

  /**
   * Admin/Lễ tân xác nhận giao dịch thanh toán: PUT /api/v1/admin/payments/{paymentId}/confirm
   */
  async confirmPayment(paymentId: number): Promise<VietQrPayment> {
    const res = await apiClient.put<any>(`/admin/payments/${paymentId}/confirm`);
    return res as VietQrPayment;
  },

  /**
   * Admin/Lễ tân từ chối giao dịch thanh toán: PUT /api/v1/admin/payments/{paymentId}/reject
   */
  async rejectPayment(paymentId: number, reason: string): Promise<VietQrPayment> {
    const res = await apiClient.put<any>(`/admin/payments/${paymentId}/reject`, { reason });
    return res as VietQrPayment;
  },
};

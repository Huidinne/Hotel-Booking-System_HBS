// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - PAYMENT & TRANSACTION INTERFACES
// File: src/types/payment.ts
// =============================================================================

import { PaymentMethod, PaymentStatus } from './booking';

export type PaymentTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
export type PaymentTransactionType = 'DEPOSIT' | 'COUNTER_PAYMENT' | 'REFUND' | 'ADDITIONAL_SERVICE';

export interface PaymentReference {
  bookingId?: number;
  bookingCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  roomNumber?: string;
  roomTypeName?: string;
  checkIn?: string;
  checkOut?: string;
  bankReference?: string;
  actorEmail?: string;
  referenceNote?: string;
}

export interface PaymentLedgerEntry {
  id: number;
  transactionCode: string;
  bookingCode: string;
  type: PaymentTransactionType;
  paymentMethod: PaymentMethod;
  amount: number;
  cashFlowSign: number; // +1 (Inflow) hoặc -1 (Outflow)
  status: PaymentTransactionStatus;
  transactionTime: string;
  actorEmail?: string;
  reference?: PaymentReference;
}

export interface PaymentLedgerSummary {
  periodStart: string;
  periodEnd: string;
  totalDepositOnline: number;
  totalCounterCash: number;
  totalCounterTransfer: number;
  totalCounterRevenue: number;
  totalRefunded: number;
  netCashFlow: number;
  successfulTransactionCount: number;
  failedTransactionCount: number;
}

export interface PaymentLedgerResponse {
  entries: PaymentLedgerEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  summary: PaymentLedgerSummary;
}

export interface PaymentLedgerFilter {
  startDate?: string;
  endDate?: string;
  type?: PaymentTransactionType;
  paymentMethod?: PaymentMethod;
  status?: PaymentTransactionStatus;
  bookingCode?: string;
  page?: number;
  size?: number;
}

export interface PaymentTransaction {
  id: number;
  bookingId: number;
  bookingCode?: string;
  transactionCode: string; // vnp_TxnRef
  vnpTransactionNo?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentTransactionStatus;
  responseCode?: string;
  transactionTime?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ConfirmRefundRequest {
  referenceNote: string;
}

export interface RefundResponse {
  bookingId: number;
  bookingCode: string;
  refundAmount: number;
  paymentStatus: PaymentStatus;
  bankName: string;
  accountNumberMasked: string; // e.g. "******7890"
  accountHolder: string;
  cancellationReason?: string;
  cancelledAt?: string;
}

export interface VNPayReturnParams {
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_CardType: string;
  vnp_OrderInfo: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
}

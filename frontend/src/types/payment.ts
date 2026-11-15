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
  bankName: string | null;
  accountNumberMasked: string | null; // e.g. "******7890"
  accountHolder: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  cancellationReason?: string;
  cancelledAt?: string;
}

export interface VietQrPayment {
  paymentId: number;
  bookingId: number;
  bookingCode: string;
  roomTypeName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  transactionCode: string;
  transferContent: string;
  amount: number;
  paymentMethod: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  qrCodeUrl?: string;
  bankCode?: string;
  bankAccount?: string;
  bankAccountName?: string;
  vietQrTemplate?: string;
  expiresAt?: string;
  createdAt?: string;
  paidAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  bankConfigured: boolean;
}

export interface CreateVietQrPaymentRequest {
  bookingId?: number;
  bookingCode?: string;
}

export interface PaymentStatusResponse {
  paymentId: number;
  transactionCode: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  bookingStatus?: string;
  paymentStatus?: string;
  paidAt?: string;
  rejectionReason?: string;
}

export interface RejectPaymentRequest {
  reason: string;
}

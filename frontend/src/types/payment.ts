// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - PAYMENT & TRANSACTION INTERFACES
// File: src/types/payment.ts
// =============================================================================

import { PaymentMethod, PaymentStatus } from './booking';

export type PaymentTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

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

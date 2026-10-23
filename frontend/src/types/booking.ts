// =============================================================================
// HOTEL BOOKING SYSTEM (MVP) - BOOKING & OPERATIONAL INTERFACES
// File: src/types/booking.ts
// =============================================================================

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PaymentStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'FULLY_PAID'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentMethod = 'VNPAY' | 'CASH' | 'BANK_TRANSFER';

export interface BookingRoomAssignment {
  id: number;
  bookingId: number;
  roomId: number;
  roomNumber: string;
  assignedAt: string;
  assignedBy?: number;
}

export interface Booking {
  id: number;
  bookingCode: string;
  userId: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  roomTypeId: number;
  roomTypeName: string;
  quantity: number;
  guests: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  unitPriceSnapshot: number;
  totalAmount: number;
  depositAmount: number;
  amountPaid: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  holdExpiresAt?: string | null;
  paymentUrl?: string | null;
  note?: string;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  penaltyAmount?: number;
  refundAmount?: number;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  assignedRooms?: { id: number; roomNumber: string; floor: number }[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateBookingRequest {
  roomTypeId: number;
  quantity: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  paymentMethod: PaymentMethod;
  note?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface CancelBookingRequest {
  reason: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export interface CancelBookingResponse {
  bookingCode: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  penaltyAmount: number;
  refundAmount: number;
  message: string;
}

export interface CheckInRequest {
  assignedRoomIds: number[];
}

export interface CheckOutResponse {
  bookingCode: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  roomsToClean: number[];
}

export interface BookingFilterParams {
  page?: number;
  size?: number;
  status?: BookingStatus | 'ALL';
  paymentStatus?: PaymentStatus | 'ALL';
  checkInFrom?: string;
  checkInTo?: string;
  bookingCode?: string;
  customerEmail?: string;
  searchTerm?: string;
}

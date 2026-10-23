package org.example.backend.booking.entity;

/**
 * Trạng thái thanh toán tổng thể của Booking.
 * UNPAID          — Chưa thanh toán
 * PARTIALLY_PAID  — Đã cọc 50%
 * FULLY_PAID      — Đã tất toán đủ 100%
 * REFUND_PENDING  — Chờ Lễ tân chuyển khoản hoàn cọc
 * REFUNDED        — Đã hoàn tất chuyển khoản trả cọc cho khách
 */
public enum PaymentStatus {
    UNPAID,
    PARTIALLY_PAID,
    FULLY_PAID,
    REFUND_PENDING,
    REFUNDED
}

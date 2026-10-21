package org.example.backend.booking.entity;

/**
 * Trạng thái đặt phòng (Booking lifecycle).
 * PENDING     — Đơn mới tạo, chờ cọc VNPay hoặc chờ Lễ tân xác nhận
 * CONFIRMED   — Đã xác nhận (đã cọc online hoặc Lễ tân duyệt). Chỉ CONFIRMED mới Check-in được
 * CHECKED_IN  — Khách đã nhận phòng (đã gán đủ N phòng vật lý)
 * CHECKED_OUT — Khách đã trả phòng và đối soát tất toán
 * CANCELLED   — Đơn đã hủy (khách tự hủy / hết hạn giữ chỗ / chưa cọc)
 * NO_SHOW     — Khách có cọc nhưng không đến nhận phòng
 */
public enum BookingStatus {
    PENDING,
    CONFIRMED,
    CHECKED_IN,
    CHECKED_OUT,
    CANCELLED,
    NO_SHOW
}

package org.example.backend.booking.entity;

/**
 * Phương thức thanh toán.
 * VNPAY         — Cổng thanh toán VNPay Sandbox (cọc 50%)
 * CASH          — Thanh toán tiền mặt tại quầy
 * BANK_TRANSFER — Chuyển khoản ngân hàng (chỉ dùng trong payment_transactions khi đối soát)
 */
public enum PaymentMethod {
    VNPAY,
    CASH,
    BANK_TRANSFER
}

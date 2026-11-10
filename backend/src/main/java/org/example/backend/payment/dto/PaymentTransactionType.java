package org.example.backend.payment.dto;

/**
 * Phân loại giao dịch trong Sổ Cái Thanh Toán (SRS §FR-19).
 * Xác định rõ bản chất dòng tiền:
 * - DEPOSIT: Tiền cọc phòng (trực tuyến VNPay Sandbox hoặc trả trước).
 * - COUNTER_PAYMENT: Tiền thu tại quầy Lễ tân (tiền mặt hoặc chuyển khoản tại quầy lúc Check-in / Check-out).
 * - REFUND: Tiền xuất hoàn cọc khi hủy phòng hoặc quá hạn xử lý.
 * - ADDITIONAL_SERVICE: Phụ thu dịch vụ phát sinh trong quá trình lưu trú.
 */
public enum PaymentTransactionType {
    DEPOSIT,
    COUNTER_PAYMENT,
    REFUND,
    ADDITIONAL_SERVICE
}


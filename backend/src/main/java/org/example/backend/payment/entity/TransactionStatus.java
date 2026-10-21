package org.example.backend.payment.entity;

/**
 * Trạng thái của từng giao dịch thanh toán.
 * PENDING — Đang chờ khách thanh toán trên cổng VNPay
 * SUCCESS — Thanh toán thành công (chữ ký hợp lệ)
 * FAILED  — Giao dịch bị lỗi / hủy bỏ / ngân hàng từ chối
 * EXPIRED — Giao dịch quá thời hạn 15 phút
 */
public enum TransactionStatus {
    PENDING,
    SUCCESS,
    FAILED,
    EXPIRED
}

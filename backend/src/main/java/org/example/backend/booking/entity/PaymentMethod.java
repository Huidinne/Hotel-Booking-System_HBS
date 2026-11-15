package org.example.backend.booking.entity;

/**
 * Phương thức thanh toán.
 * VNPAY         — [Deprecated] Giữ lại để tương thích lịch sử giao dịch cũ
 * CASH          — Thanh toán tiền mặt tại quầy
 * BANK_TRANSFER — Chuyển khoản ngân hàng (dùng trong đối soát/hoàn cọc)
 * VIETQR        — Thanh toán chuyển khoản ngân hàng qua mã QR (VietQR QuickLink)
 */
public enum PaymentMethod {
    /**
     * @deprecated VNPay đã được thay thế hoàn toàn bởi VIETQR. Giữ enum để đọc dữ liệu lịch sử.
     */
    @Deprecated
    VNPAY,
    CASH,
    BANK_TRANSFER,
    VIETQR
}

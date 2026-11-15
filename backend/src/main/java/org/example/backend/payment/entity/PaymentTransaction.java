package org.example.backend.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.booking.entity.Booking;
import org.example.backend.booking.entity.PaymentMethod;
import org.example.backend.payment.dto.PaymentTransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity tương ứng bảng `payment_transactions`.
 * Lịch sử từng giao dịch thanh toán (VNPay, tiền mặt, chuyển khoản).
 */
@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    /** Mã giao dịch nội bộ sinh ra khi bắt đầu thanh toán (vnp_TxnRef) */
    @Column(name = "transaction_code", nullable = false, unique = true, length = 100)
    private String transactionCode;

    /** Mã giao dịch duy nhất từ cổng VNPay — chống xử lý trùng lặp IPN */
    @Column(name = "vnp_transaction_no", unique = true, length = 100)
    private String vnpTransactionNo;

    /** Phân loại giao dịch: DEPOSIT, COUNTER_PAYMENT, REFUND, ADDITIONAL_SERVICE */
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    @Builder.Default
    private PaymentTransactionType type = PaymentTransactionType.DEPOSIT;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.PENDING;

    @Column(name = "response_code", length = 50)
    private String responseCode;

    /** Ghi chú tham chiếu đối soát / mã ủy nhiệm chi / biên lai POS */
    @Column(name = "reference_note", length = 500)
    private String referenceNote;

    /** Email người thực hiện giao dịch (Lễ tân hoặc Khách hàng) */
    @Column(name = "actor_email", length = 100)
    private String actorEmail;

    @Column(name = "transaction_time")
    private LocalDateTime transactionTime;

    /** Email / Tên của người xác nhận hoặc từ chối giao dịch */
    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    /** Thời điểm người xác nhận hoặc từ chối thao tác */
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    /** Lý do từ chối giao dịch nếu Admin/Nhân viên không chấp nhận */
    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    /** Đường dẫn ảnh mã VietQR (VietQR Quick Link) */
    @Column(name = "qr_code_url", length = 1000)
    private String qrCodeUrl;

    /** Thời hạn thanh toán giao dịch online (created_at + 15 phút) */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}

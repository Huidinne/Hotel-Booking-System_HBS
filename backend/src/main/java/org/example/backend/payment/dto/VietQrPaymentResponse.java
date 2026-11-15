package org.example.backend.payment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO phản hồi chi tiết giao dịch thanh toán VietQR cho Khách hàng và Admin/Lễ tân.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VietQrPaymentResponse {
    private Long paymentId;
    private Long bookingId;
    private String bookingCode;
    private String roomTypeName;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String transactionCode;
    private String transferContent; // Nội dung chuyển khoản duy nhất
    private BigDecimal amount;
    private String paymentMethod;
    private String status; // PENDING, SUCCESS, FAILED, EXPIRED
    private String qrCodeUrl;
    private String bankCode;
    private String bankAccount;
    private String bankAccountName;
    private String vietQrTemplate;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String rejectionReason;
    private boolean bankConfigured;
}

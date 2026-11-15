package org.example.backend.payment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO phản hồi kiểm tra nhanh trạng thái giao dịch thanh toán.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PaymentStatusResponse {
    private Long paymentId;
    private String transactionCode;
    private String status;
    private String bookingStatus;
    private String paymentStatus;
    private LocalDateTime paidAt;
    private String rejectionReason;
}

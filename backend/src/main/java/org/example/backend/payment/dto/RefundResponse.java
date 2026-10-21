package org.example.backend.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundResponse {
    private Long bookingId;
    private String bookingCode;
    private String customerName;
    private String customerPhone;
    private BigDecimal refundAmount;
    private String bankName;
    private String accountNumberMasked;
    private String accountHolder;
    private String paymentStatus;
    private LocalDateTime cancelledAt;
}

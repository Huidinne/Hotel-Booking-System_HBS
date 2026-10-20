package org.example.backend.booking.dto;

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
public class CancelBookingResponse {
    private String bookingCode;
    private String bookingStatus;
    private String paymentStatus;
    private BigDecimal totalPrice;
    private BigDecimal amountPaid;
    private BigDecimal standardDeposit;
    private Double penaltyRate;
    private BigDecimal penaltyAmount;
    private BigDecimal refundAmount;
    private LocalDateTime cancelledAt;
}

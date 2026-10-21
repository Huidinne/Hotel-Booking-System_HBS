package org.example.backend.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelBookingResponse {
    private String bookingCode;
    private String bookingStatus;
    private String paymentStatus;
    private BigDecimal penaltyAmount;
    private BigDecimal refundAmount;
    private String message;
}

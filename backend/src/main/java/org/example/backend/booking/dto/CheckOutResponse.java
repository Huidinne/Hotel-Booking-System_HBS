package org.example.backend.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckOutResponse {
    private Long bookingId;
    private String bookingCode;
    private String bookingStatus;
    private String paymentStatus;
    private BigDecimal totalPrice;
    private BigDecimal amountPaid;
    private BigDecimal remainingAmount;
    private List<String> roomsToClean;
}

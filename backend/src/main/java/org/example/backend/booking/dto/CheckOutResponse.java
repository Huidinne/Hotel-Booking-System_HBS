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
    private BigDecimal totalAmount;     // Tổng tiền phòng
    private BigDecimal amountPaid;      // Tổng tiền đã thanh toán
    private BigDecimal remainingAmount; // Còn phải thu
    private List<Long> roomsToClean;    // Room IDs chuyển sang CLEANING
}

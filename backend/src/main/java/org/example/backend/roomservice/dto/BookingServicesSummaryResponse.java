package org.example.backend.roomservice.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Bảng kê chi tiết các dịch vụ phát sinh của một Booking (SRS Chapter 12).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingServicesSummaryResponse {

    private String bookingCode;
    private Long bookingId;
    private BigDecimal totalServicesAmount;
    private List<RoomServiceOrderResponse> orders;
}

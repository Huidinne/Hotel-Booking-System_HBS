package org.example.backend.roomservice.dto;

import lombok.*;
import org.example.backend.common.response.PageResponse;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response tổng hợp lịch sử đơn món và phiếu sự cố của một Booking (SRS FR-21.7).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingRoomServicesResponse {

    private Long bookingId;
    private String bookingCode;
    private BigDecimal totalDeliveredAmount;
    private PageResponse<RoomServiceOrderResponse> orders;
    private PageResponse<MaintenanceRequestResponse> maintenanceRequests;
}

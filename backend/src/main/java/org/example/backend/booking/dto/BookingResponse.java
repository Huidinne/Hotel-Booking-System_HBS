package org.example.backend.booking.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingResponse {
    private Long id;
    private String bookingCode;
    private Long roomTypeId;
    private String roomTypeName;
    private Integer quantity;
    private Integer guests;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Long numberOfNights;
    private BigDecimal pricePerNight;
    private BigDecimal totalPrice;
    private BigDecimal depositAmount;
    private String bookingStatus;
    private String paymentStatus;
    private String paymentMethod;
    private LocalDateTime holdExpiresAt;
    private String paymentUrl;
    private List<AssignedRoomDto> assignedRooms;
    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignedRoomDto {
        private Long roomId;
        private String roomNumber;
        private Integer floor;
    }
}

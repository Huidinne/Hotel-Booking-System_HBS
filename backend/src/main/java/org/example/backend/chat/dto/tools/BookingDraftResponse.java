package org.example.backend.chat.dto.tools;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO dữ liệu bản nháp đặt phòng có cấu trúc (BOOKING_DRAFT):
 * Dùng để render thẻ xác nhận đặt phòng và nút "Xác nhận đặt phòng" trên Chat UI.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingDraftResponse {
    private String draftId;
    private String quoteId;
    private Long roomTypeId;
    private String roomTypeName;
    private Integer capacity;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private long nights;
    private Integer quantity;
    private Integer guests;
    private BigDecimal pricePerNight;
    private BigDecimal totalPrice;
    private BigDecimal depositAmount;
    private String specialRequests;
    private String userEmail;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime expiresAt;
    private String status; // DRAFT, CONFIRMED, EXPIRED
}


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
 * DTO dữ liệu báo giá có cấu trúc (BOOKING_QUOTE):
 * Báo giá có hạn hiệu lực (ví dụ 15 phút) và KHÔNG giữ phòng trước.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingQuoteResponse {
    private String quoteId;
    private Long roomTypeId;
    private String roomTypeName;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private long nights;
    private Integer guests;
    private Integer quantity;
    private BigDecimal pricePerNight;
    private BigDecimal totalPrice;
    private BigDecimal depositAmount; // Cọc 50% VietQR
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime expiresAt;
    private String note;
}


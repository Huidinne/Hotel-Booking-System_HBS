package org.example.backend.chat.draft;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Đối tượng lưu trữ báo giá tạm thời (Quote):
 * - Có hạn hiệu lực (mặc định 15 phút)
 * - Báo giá không khóa hay giữ phòng vật lý
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingQuote {
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
    private BigDecimal depositAmount;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }
}


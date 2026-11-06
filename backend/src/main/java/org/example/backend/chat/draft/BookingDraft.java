package org.example.backend.chat.draft;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Đối tượng bản nháp đặt phòng (Draft):
 * - Được tạo khi người dùng đã đăng nhập gọi tool prepareBooking
 * - Gắn với email khách hàng, sessionId và quoteId
 * - Chưa tạo booking và chưa giữ phòng
 * - Hạn hiệu lực 15 phút
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingDraft {
    private String draftId;
    private String quoteId;
    private String sessionId;
    private String userEmail;
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
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    @Builder.Default
    private String status = "DRAFT"; // DRAFT, CONFIRMED, EXPIRED

    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }
}


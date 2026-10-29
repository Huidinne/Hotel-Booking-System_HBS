package org.example.backend.room.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Trạng thái của một phòng trong một ngày cụ thể trên Ma trận Timeline (SRS §FR-13.2 & §FR-13.3).
 * Chứa mã màu trạng thái và các thông tin tóm tắt để Lễ tân hover xem tooltip hoặc click xem chi tiết.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomDailyStatusDTO {

    /** Ngày đang xét */
    private LocalDate date;

    /** Trạng thái hiển thị (AVAILABLE, CONFIRMED, CHECKED_IN, CLEANING, MAINTENANCE) */
    private RoomTimelineStatus status;

    // ─── Thông tin tóm tắt Booking khi ô có trạng thái CONFIRMED hoặc CHECKED_IN (FR-13.3) ───
    private Long bookingId;
    private String bookingCode;
    private String customerName;
    private String customerPhone;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private BigDecimal depositAmount;

    /** Tiền khách thực tế đã thanh toán (đã cọc hoặc đã tất toán) (SRS §FR-13.3) */
    private BigDecimal paidAmount;

    private BigDecimal totalPrice;
}

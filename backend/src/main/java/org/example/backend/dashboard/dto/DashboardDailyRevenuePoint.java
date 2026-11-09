package org.example.backend.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO điểm dữ liệu thống kê doanh thu và chỉ số vận hành theo từng ngày:
 * Phục vụ trực tiếp cho việc vẽ biểu đồ đường/cột xu hướng (Revenue Trend, ADR, RevPAR) tại Frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Điểm dữ liệu thống kê doanh thu và chỉ số vận hành theo từng ngày trong kỳ")
public class DashboardDailyRevenuePoint {

    @Schema(description = "Ngày thống kê (YYYY-MM-DD)", example = "2026-11-01")
    private LocalDate date;

    @Schema(description = "Doanh thu lưu trú phát sinh trong ngày (Room Revenue / Accrual Basis)", example = "1900000.00")
    private BigDecimal roomRevenue;

    @Schema(description = "Dòng tiền thực thu trong ngày (Net Cash Flow = Tiền thu vào - Tiền hoàn cọc)", example = "950000.00")
    private BigDecimal netCashFlow;

    @Schema(description = "Số đêm phòng đã bán / lưu trú thực tế trong ngày (Sold Room Nights)", example = "2")
    private Long soldRoomNights;

    @Schema(description = "Tổng số phòng khả dụng trong ngày (trừ phòng bảo trì)", example = "5")
    private Long availableRooms;

    @Schema(description = "Tỷ lệ lấp đầy phòng trong ngày (0.0 đến 1.0)", example = "0.40")
    private Double occupancyRate;

    @Schema(description = "Giá bán bình quân mỗi đêm đã bán trong ngày (ADR = roomRevenue / soldRoomNights)", example = "950000.00")
    private BigDecimal adr;

    @Schema(description = "Doanh thu trên mỗi phòng khả dụng trong ngày (RevPAR = roomRevenue / availableRooms)", example = "380000.00")
    private BigDecimal revpar;
}


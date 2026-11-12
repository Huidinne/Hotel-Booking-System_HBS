package org.example.backend.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO phản hồi báo cáo phân tích doanh thu 12 tháng và hiệu suất kinh doanh (Monthly Analytics)
 * Phục vụ trực tiếp cho MonthlyRevenueChart và RoomTypeRevenueChart của Admin Dashboard:
 * {
 *   monthly: MonthlyRevenue[],
 *   roomTypes: RoomTypeRevenue[]
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Báo cáo doanh thu 12 tháng và phân tích cơ cấu buồng phòng chuyên sâu")
public class DashboardMonthlyAnalyticsResponse {

    @Schema(description = "Năm báo cáo đối soát", example = "2026")
    private Integer year;

    @Schema(description = "Ngày bắt đầu chu kỳ phân tích", example = "2026-01-01")
    private LocalDate startDate;

    @Schema(description = "Ngày kết thúc chu kỳ phân tích", example = "2026-12-31")
    private LocalDate endDate;

    // =========================================================================
    // 1. CHỈ SỐ TỔNG HỢP CẢ KỲ / CẢ NĂM
    // =========================================================================

    @Schema(description = "Tổng doanh thu tương thích giao diện Frontend", example = "904000000.00")
    private BigDecimal totalRevenue;

    @Schema(description = "Tổng doanh thu lưu trú dồn tích cả kỳ (Accrual Basis)", example = "904000000.00")
    private BigDecimal totalRoomRevenue;

    @Schema(description = "Tổng dòng tiền thực thu ròng cả kỳ (Cash Basis: totalPaid - refundTotal)", example = "880000000.00")
    private BigDecimal totalNetCashFlow;

    @Schema(description = "Giá bán phòng bình quân (ADR) bình quân toàn kỳ", example = "950000.00")
    private BigDecimal averageAdr;

    @Schema(description = "Doanh thu trên phòng khả dụng (RevPAR) bình quân toàn kỳ", example = "450000.00")
    private BigDecimal averageRevpar;

    @Schema(description = "Tỷ lệ lấp đầy phòng bình quân toàn kỳ (0.0 đến 1.0)", example = "0.47")
    private Double averageOccupancyRate;

    @Schema(description = "Tổng số đêm phòng đã bán trong toàn chu kỳ", example = "950")
    private Long totalSoldRoomNights;

    @Schema(description = "Tổng số đêm phòng khả dụng trong toàn chu kỳ", example = "2000")
    private Long totalAvailableRoomNights;

    // =========================================================================
    // 2. CHUỖI DOANH THU 12 THÁNG & CƠ CẤU LOẠI PHÒNG
    // =========================================================================

    @Schema(description = "Danh sách doanh thu và chỉ số chi tiết theo từng tháng (đủ 12 tháng)")
    private List<DashboardMonthlyRevenuePoint> monthly;

    @Schema(description = "Cơ cấu doanh thu và tỷ trọng theo từng loại phòng trong toàn bộ chu kỳ")
    private List<DashboardRoomTypeRevenue> roomTypes;
}


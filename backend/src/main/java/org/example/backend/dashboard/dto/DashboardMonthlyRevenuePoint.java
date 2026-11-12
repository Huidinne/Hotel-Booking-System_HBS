package org.example.backend.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO điểm dữ liệu doanh thu và chỉ số khách sạn theo từng tháng (Monthly Revenue Point)
 * Tương thích trực tiếp với interface MonthlyRevenue của Frontend:
 * { month: "Tháng 01/2026", revenue: 45000000 }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Điểm dữ liệu doanh thu và chỉ số vận hành theo từng tháng")
public class DashboardMonthlyRevenuePoint {

    @Schema(description = "Nhãn hiển thị tháng theo chuẩn tiếng Việt", example = "Tháng 01/2026")
    private String month;

    @Schema(description = "Khóa tháng định dạng chuẩn ISO YYYY-MM", example = "2026-01")
    private String monthKey;

    @Schema(description = "Thứ tự tháng trong năm (1 đến 12)", example = "1")
    private Integer monthIndex;

    @Schema(description = "Năm báo cáo", example = "2026")
    private Integer year;

    @Schema(description = "Doanh thu tương thích giao diện Frontend (mặc định lấy theo Doanh thu lưu trú hoặc Dòng tiền)", example = "45000000.00")
    private BigDecimal revenue;

    @Schema(description = "Doanh thu lưu trú dồn tích thực tế trong tháng (Accrual Room Revenue)", example = "45000000.00")
    private BigDecimal roomRevenue;

    @Schema(description = "Dòng tiền thực thu ròng trong tháng = Tiền vào - Hoàn cọc (Net Cash Flow)", example = "42000000.00")
    private BigDecimal netCashFlow;

    @Schema(description = "Tổng tiền thu vào qua VNPay/tiền mặt trong tháng", example = "45000000.00")
    private BigDecimal totalPaid;

    @Schema(description = "Tổng tiền cọc hoàn trả cho khách trong tháng", example = "3000000.00")
    private BigDecimal refundTotal;

    @Schema(description = "Số đêm phòng đã bán trong tháng (Sold Room Nights)", example = "45")
    private Long soldRoomNights;

    @Schema(description = "Tổng số đêm phòng khả dụng trong tháng (Available Room Nights)", example = "90")
    private Long availableRoomNights;

    @Schema(description = "Giá bán phòng bình quân mỗi đêm trong tháng: ADR = roomRevenue / soldRoomNights", example = "1000000.00")
    private BigDecimal adr;

    @Schema(description = "Doanh thu trên mỗi phòng khả dụng trong tháng: RevPAR = roomRevenue / availableRoomNights", example = "500000.00")
    private BigDecimal revpar;

    @Schema(description = "Tỷ lệ lấp đầy phòng trong tháng (0.0 đến 1.0)", example = "0.50")
    private Double occupancyRate;
}


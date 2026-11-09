package org.example.backend.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO cơ cấu doanh thu và số đêm phòng theo từng loại phòng trong kỳ báo cáo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thống kê doanh thu và số đêm phòng theo loại phòng")
public class DashboardRoomTypeRevenue {

    @Schema(description = "Mã ID loại phòng", example = "2")
    private Long roomTypeId;

    @Schema(description = "Tên loại phòng", example = "Deluxe Double Room")
    private String roomTypeName;

    @Schema(description = "Tổng doanh thu lưu trú của loại phòng trong kỳ", example = "9500000.00")
    private BigDecimal roomRevenue;

    @Schema(description = "Số đêm phòng đã bán của loại phòng trong kỳ", example = "10")
    private Long soldRoomNights;

    @Schema(description = "Tỷ trọng doanh thu so với tổng doanh thu lưu trú (0.0 đến 1.0)", example = "0.50")
    private Double revenueShare;
}


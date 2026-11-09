package org.example.backend.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * DTO tổng hợp chỉ số quản trị và báo cáo tài chính cho Admin Dashboard theo SRS FR-14:
 * - Phân biệt rõ ràng Doanh thu lưu trú (Room Revenue / Accrual Basis) và Dòng tiền (Net Cash Flow / Cash Basis).
 * - Các chỉ số kinh doanh cốt lõi chuẩn ngành khách sạn: ADR, RevPAR, Occupancy Rate, Room Nights.
 * - Chuỗi dữ liệu biểu đồ xu hướng theo ngày (revenueSeries) và phân bổ theo loại phòng (roomTypeRevenues).
 * - Cơ cấu trạng thái buồng phòng thời gian thực (roomCounts).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Báo cáo tổng hợp số liệu quản trị và tài chính Admin Dashboard")
public class DashboardSummaryResponse {

    @Schema(description = "Ngày bắt đầu kỳ báo cáo", example = "2026-11-01")
    private LocalDate dateFrom;

    @Schema(description = "Ngày kết thúc kỳ báo cáo", example = "2026-11-30")
    private LocalDate dateTo;

    // =========================================================================
    // 1. CHỈ SỐ DOANH THU & DÒNG TIỀN (PHÂN BIỆT RẠCH RÒI)
    // =========================================================================

    @Schema(description = "Doanh thu lưu trú thực tế phát sinh trong kỳ theo ngày ở (Accrual Basis / Incurred Room Revenue)", example = "19000000.00")
    private BigDecimal roomRevenue;

    @Schema(description = "Dòng tiền thực thu ròng trong kỳ = Tổng tiền vào - Hoàn cọc (Cash Flow Basis / Net Cash Flow)", example = "17200000.00")
    private BigDecimal netCashFlow;

    @Schema(description = "Doanh thu dự kiến từ tất cả booking CONFIRMED/CHECKED_IN giao cắt với kỳ", example = "25000000.00")
    private BigDecimal expectedRevenue;

    @Schema(description = "Doanh thu thực thu (Tương thích ngược với Frontend, giá trị tương đương netCashFlow)", example = "17200000.00")
    private BigDecimal actualRevenue;

    @Schema(description = "Tổng tiền các giao dịch thanh toán thành công (SUCCESS) trong kỳ", example = "19000000.00")
    private BigDecimal totalPaid;

    @Schema(description = "Tổng tiền cọc đã hoàn trả lại cho khách hàng trong kỳ (Refund Outflow)", example = "1800000.00")
    private BigDecimal refundTotal;

    // =========================================================================
    // 2. CHỈ SỐ KINH DOANH KHÁCH SẠN (HOTEL PERFORMANCE METRICS)
    // =========================================================================

    @Schema(description = "Giá bán phòng bình quân mỗi đêm đã bán: ADR = roomRevenue / soldRoomNights", example = "950000.00")
    private BigDecimal adr;

    @Schema(description = "Doanh thu trên mỗi phòng khả dụng: RevPAR = roomRevenue / totalAvailableRoomNights", example = "380000.00")
    private BigDecimal revpar;

    @Schema(description = "Tỷ lệ lấp đầy phòng trong kỳ (0.0 đến 1.0, ví dụ 0.40 tương đương 40%)", example = "0.40")
    private Double occupancyRate;

    @Schema(description = "Tổng số đêm phòng đã bán / lưu trú thực tế trong kỳ (Sold Room Nights)", example = "20")
    private Long soldRoomNights;

    @Schema(description = "Tổng số đêm phòng khả dụng trong kỳ (totalAvailableRoomNights = activeRooms * days)", example = "50")
    private Long totalAvailableRoomNights;

    // =========================================================================
    // 3. THỐNG KÊ LƯỢT ĐẶT VÀ BUỒNG PHÒNG
    // =========================================================================

    @Schema(description = "Tổng số phòng vật lý của khách sạn", example = "10")
    private Long totalRooms;

    @Schema(description = "Số phòng đang hoạt động (không trong trạng thái bảo trì MAINTENANCE)", example = "9")
    private Long activeRooms;

    @Schema(description = "Tổng số lượt booking giao cắt với kỳ", example = "15")
    private Long totalBookings;

    @Schema(description = "Số lượt booking đã được cọc và xác nhận thành công (CONFIRMED, CHECKED_IN, CHECKED_OUT)", example = "12")
    private Long confirmedBookings;

    @Schema(description = "Cơ cấu trạng thái phòng vật lý hiện tại (AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE)")
    private Map<String, Integer> roomCounts;

    // =========================================================================
    // 4. CHUỖI DỮ LIỆU BIỂU ĐỒ & BÁO CÁO CHI TIẾT
    // =========================================================================

    @Schema(description = "Chuỗi số liệu doanh thu và chỉ số theo từng ngày phục vụ vẽ biểu đồ xu hướng (FR-14.2)")
    private List<DashboardDailyRevenuePoint> revenueSeries;

    @Schema(description = "Cơ cấu doanh thu và số đêm bán phân bổ theo từng loại phòng")
    private List<DashboardRoomTypeRevenue> roomTypeRevenues;
}

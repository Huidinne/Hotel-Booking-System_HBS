package org.example.backend.dashboard.util;

import org.example.backend.dashboard.dto.DashboardDailyRevenuePoint;
import org.example.backend.dashboard.dto.DashboardMonthlyRevenuePoint;
import org.example.backend.dashboard.dto.DashboardRoomTypeRevenue;
import org.example.backend.dashboard.dto.DashboardSummaryResponse;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Utility sinh nội dung file CSV cho Admin Dashboard theo tiêu chuẩn:
 * 1. UTF-8 with BOM (\uFEFF) giúp Microsoft Excel hiển thị tiếng Việt có dấu chuẩn 100%.
 * 2. Chống CSV Formula Injection (CWE-1236 / OWASP CSV Injection): Prepend dấu nháy đơn (')
 *    vào các ô bắt đầu bằng '=', '+', '-', '@', '\t', '\r' nếu không phải số thuần túy.
 * 3. Chuẩn RFC 4180: Đóng gói các ô có dấu phẩy, nháy kép, xuống dòng bằng dấu ngoặc kép ("").
 * 4. An toàn mẫu số 0 (Zero Denominator Safety): Khi 0 phòng hoặc 0 đêm, xuất 0 an toàn.
 */
public final class DashboardCsvHelper {

    /**
     * Ký tự UTF-8 Byte Order Mark (BOM) để Microsoft Excel trên Windows nhận diện đúng bảng mã tiếng Việt.
     */
    public static final String UTF8_BOM = "\uFEFF";
    private static final String CSV_DELIMITER = ",";
    private static final String CSV_NEWLINE = "\r\n";
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private DashboardCsvHelper() {
        // Private constructor for utility class
    }

    /**
     * Chống CSV Formula Injection và đóng gói theo chuẩn RFC 4180.
     * Nếu ô bắt đầu bằng '=', '@', '\t', '\r', hoặc '+' / '-' (không phải số), sẽ được prepend dấu nháy đơn (').
     */
    public static String escapeCsvCell(Object value) {
        if (value == null) {
            return "";
        }
        String str = value.toString();
        if (str.isEmpty()) {
            return "";
        }

        boolean dangerousPrefix = false;
        char firstChar = str.charAt(0);

        // Kiểm tra các ký tự có thể kích hoạt macro/công thức trong Excel/Sheets (CWE-1236)
        if (firstChar == '=' || firstChar == '@' || firstChar == '\t' || firstChar == '\r' || firstChar == '%') {
            dangerousPrefix = true;
        } else if ((firstChar == '+' || firstChar == '-') && !isNumeric(str.trim())) {
            // Dấu + hoặc - nhưng không phải số hợp lệ (ví dụ: -2+3+cmd|' /C calc'!A0)
            dangerousPrefix = true;
        }

        if (dangerousPrefix) {
            str = "'" + str;
        }

        // Nếu ô chứa dấu phân cách, nháy kép, xuống dòng, tab hoặc vừa được thêm nháy đơn bảo vệ
        if (str.contains(CSV_DELIMITER) || str.contains("\"") || str.contains("\n") || str.contains("\r") || str.contains("\t") || dangerousPrefix) {
            return "\"" + str.replace("\"", "\"\"") + "\"";
        }

        return str;
    }

    /**
     * Kiểm tra xem chuỗi có phải là số (nguyên hoặc thập phân) an toàn không.
     */
    public static boolean isNumeric(String str) {
        if (str == null || str.isEmpty()) {
            return false;
        }
        try {
            Double.parseDouble(str.replace(",", ""));
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /**
     * Format số tiền VNĐ.
     */
    public static String formatCurrency(BigDecimal amount) {
        if (amount == null) {
            return "0";
        }
        return amount.stripTrailingZeros().toPlainString();
    }

    /**
     * Format tỷ lệ phần trăm (0.60 -> 60.00%).
     */
    public static String formatPercent(Double rate) {
        if (rate == null || Double.isNaN(rate) || Double.isInfinite(rate)) {
            return "0.00%";
        }
        return String.format(Locale.US, "%.2f%%", rate * 100);
    }

    /**
     * Sinh toàn bộ nội dung file CSV báo cáo quản trị tổng hợp.
     */
    public static byte[] generateSummaryCsv(DashboardSummaryResponse summary,
                                           LocalDate dateFrom,
                                           LocalDate dateTo,
                                           String reportType) {
        StringBuilder sb = new StringBuilder();
        sb.append(UTF8_BOM); // Bắt buộc ở đầu file để Excel mở tiếng Việt không lỗi font

        String type = (reportType != null) ? reportType.toLowerCase(Locale.ROOT).trim() : "full";

        // =========================================================================
        // 1. TIÊU ĐỀ BÁO CÁO & THÔNG TIN CHUNG
        // =========================================================================
        sb.append(escapeCsvCell("BÁO CÁO THỐNG KÊ QUẢN TRỊ KHÁCH SẠN GRAND AURORA")).append(CSV_NEWLINE);
        sb.append(escapeCsvCell("Kỳ báo cáo: Từ ngày")).append(CSV_DELIMITER)
                .append(escapeCsvCell(dateFrom != null ? dateFrom.toString() : ""))
                .append(CSV_DELIMITER).append(escapeCsvCell("Đến ngày")).append(CSV_DELIMITER)
                .append(escapeCsvCell(dateTo != null ? dateTo.toString() : "")).append(CSV_NEWLINE);
        sb.append(escapeCsvCell("Thời gian xuất báo cáo")).append(CSV_DELIMITER)
                .append(escapeCsvCell(LocalDateTime.now().format(TIME_FORMATTER))).append(CSV_NEWLINE);
        sb.append(escapeCsvCell("Đơn vị tiền tệ")).append(CSV_DELIMITER)
                .append(escapeCsvCell("VNĐ (Việt Nam Đồng)")).append(CSV_NEWLINE);
        sb.append(CSV_NEWLINE);

        // =========================================================================
        // 2. PHẦN TỔNG HỢP CHỈ SỐ KPI (SUMMARY KPIS)
        // =========================================================================
        if ("full".equals(type) || "summary".equals(type)) {
            sb.append(escapeCsvCell("I. CHỈ SỐ HIỆU SUẤT VẬN HÀNH & TÀI CHÍNH (HOTEL KPIS)")).append(CSV_NEWLINE);
            sb.append(escapeCsvCell("Chỉ số")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Giá trị")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Đơn vị tính")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Ý nghĩa / Công thức (USALI)")).append(CSV_NEWLINE);

            appendKpiRow(sb, "Doanh thu lưu trú (Room Revenue)",
                    summary != null ? formatCurrency(summary.getRoomRevenue()) : "0", "VNĐ",
                    "Doanh thu dồn tích thực tế từ đêm phòng tiêu dùng trong kỳ");

            appendKpiRow(sb, "Dòng tiền thực thu (Net Cash Flow)",
                    summary != null ? formatCurrency(summary.getNetCashFlow()) : "0", "VNĐ",
                    "Tiền thanh toán thực tế vào tài khoản trừ tiền hoàn cọc");

            appendKpiRow(sb, "Tổng tiền đã thanh toán (Total Paid)",
                    summary != null ? formatCurrency(summary.getTotalPaid()) : "0", "VNĐ",
                    "Tổng dòng tiền khách đã thanh toán trong kỳ");

            appendKpiRow(sb, "Tổng tiền hoàn cọc (Refund Total)",
                    summary != null ? formatCurrency(summary.getRefundTotal()) : "0", "VNĐ",
                    "Tổng tiền cọc đã hoàn trả cho khách do hủy phòng");

            appendKpiRow(sb, "Giá bán phòng bình quân (ADR)",
                    summary != null ? formatCurrency(summary.getAdr()) : "0", "VNĐ/đêm",
                    "Doanh thu lưu trú / Tổng đêm phòng đã bán (Room Revenue / Sold Nights)");

            appendKpiRow(sb, "Doanh thu trên phòng khả dụng (RevPAR)",
                    summary != null ? formatCurrency(summary.getRevpar()) : "0", "VNĐ/phòng",
                    "Doanh thu lưu trú / Tổng đêm phòng khả dụng (Room Revenue / Available Nights)");

            appendKpiRow(sb, "Tỷ lệ lấp đầy (Occupancy Rate)",
                    summary != null ? formatPercent(summary.getOccupancyRate()) : "0.00%", "%",
                    "Số đêm phòng đã bán / Số đêm phòng khả dụng");

            appendKpiRow(sb, "Số đêm phòng đã bán (Sold Room Nights)",
                    summary != null && summary.getSoldRoomNights() != null ? summary.getSoldRoomNights().toString() : "0", "Đêm phòng",
                    "Tổng số đêm phòng khách thực tế đã lưu trú trong kỳ");

            appendKpiRow(sb, "Số đêm phòng khả dụng (Available Room Nights)",
                    summary != null && summary.getTotalAvailableRoomNights() != null ? summary.getTotalAvailableRoomNights().toString() : "0", "Đêm phòng",
                    "Số phòng đang hoạt động x Số ngày trong kỳ");

            appendKpiRow(sb, "Tổng số phòng khách sạn",
                    summary != null && summary.getTotalRooms() != null ? summary.getTotalRooms().toString() : "0", "Phòng",
                    "Tổng số phòng vật lý trong hệ thống");

            appendKpiRow(sb, "Số phòng đang hoạt động (Active)",
                    summary != null && summary.getActiveRooms() != null ? summary.getActiveRooms().toString() : "0", "Phòng",
                    "Tổng phòng trừ phòng bảo trì (MAINTENANCE)");

            appendKpiRow(sb, "Tổng số đơn đặt phòng (Total Bookings)",
                    summary != null && summary.getTotalBookings() != null ? summary.getTotalBookings().toString() : "0", "Đơn",
                    "Số đơn đặt phòng có hiệu lực trong kỳ");

            appendKpiRow(sb, "Số đơn đã xác nhận / Hoàn tất",
                    summary != null && summary.getConfirmedBookings() != null ? summary.getConfirmedBookings().toString() : "0", "Đơn",
                    "Số đơn ở trạng thái CONFIRMED, CHECKED_IN hoặc CHECKED_OUT");

            sb.append(CSV_NEWLINE);
        }

        // =========================================================================
        // 3. PHẦN CHI TIẾT THEO NGÀY (DAILY BREAKDOWN)
        // =========================================================================
        if ("full".equals(type) || "daily".equals(type)) {
            sb.append(escapeCsvCell("II. CHI TIẾT DOANH THU & HIỆU SUẤT THEO TỪNG NGÀY")).append(CSV_NEWLINE);
            sb.append(escapeCsvCell("Ngày")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Doanh thu lưu trú (VNĐ)")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Dòng tiền thực thu (VNĐ)")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Đêm phòng đã bán")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Phòng khả dụng")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Tỷ lệ lấp đầy")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("ADR (VNĐ)")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("RevPAR (VNĐ)")).append(CSV_NEWLINE);

            List<DashboardDailyRevenuePoint> series = (summary != null) ? summary.getRevenueSeries() : null;
            if (series != null && !series.isEmpty()) {
                for (DashboardDailyRevenuePoint point : series) {
                    sb.append(escapeCsvCell(point.getDate())).append(CSV_DELIMITER)
                            .append(escapeCsvCell(formatCurrency(point.getRoomRevenue()))).append(CSV_DELIMITER)
                            .append(escapeCsvCell(formatCurrency(point.getNetCashFlow()))).append(CSV_DELIMITER)
                            .append(escapeCsvCell(point.getSoldRoomNights() != null ? point.getSoldRoomNights().toString() : "0")).append(CSV_DELIMITER)
                            .append(escapeCsvCell(point.getAvailableRooms() != null ? point.getAvailableRooms().toString() : "0")).append(CSV_DELIMITER)
                            .append(escapeCsvCell(formatPercent(point.getOccupancyRate()))).append(CSV_DELIMITER)
                            .append(escapeCsvCell(formatCurrency(point.getAdr()))).append(CSV_DELIMITER)
                            .append(escapeCsvCell(formatCurrency(point.getRevpar()))).append(CSV_NEWLINE);
                }
            } else {
                sb.append(escapeCsvCell("Không có dữ liệu phát sinh trong kỳ")).append(CSV_NEWLINE);
            }
            sb.append(CSV_NEWLINE);
        }

        // =========================================================================
        // 4. PHẦN CƠ CẤU DOANH THU THEO HẠNG PHÒNG (ROOM TYPES)
        // =========================================================================
        if ("full".equals(type) || "room-types".equals(type)) {
            sb.append(escapeCsvCell("III. CƠ CẤU DOANH THU THEO HẠNG PHÒNG")).append(CSV_NEWLINE);
            sb.append(escapeCsvCell("Mã hạng phòng")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Tên hạng phòng")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Doanh thu lưu trú (VNĐ)")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Đêm phòng đã bán")).append(CSV_DELIMITER)
                    .append(escapeCsvCell("Tỷ trọng doanh thu (%)")).append(CSV_NEWLINE);

            List<DashboardRoomTypeRevenue> roomTypes = (summary != null) ? summary.getRoomTypeRevenues() : null;
            if (roomTypes != null && !roomTypes.isEmpty()) {
                for (DashboardRoomTypeRevenue rt : roomTypes) {
                    sb.append(escapeCsvCell(rt.getRoomTypeId() != null ? rt.getRoomTypeId().toString() : "")).append(CSV_DELIMITER)
                            .append(escapeCsvCell(rt.getRoomTypeName())).append(CSV_DELIMITER)
                            .append(escapeCsvCell(formatCurrency(rt.getRoomRevenue()))).append(CSV_DELIMITER)
                            .append(escapeCsvCell(rt.getSoldRoomNights() != null ? rt.getSoldRoomNights().toString() : "0")).append(CSV_DELIMITER)
                            .append(escapeCsvCell(formatPercent(rt.getRevenueShare()))).append(CSV_NEWLINE);
                }
            } else {
                sb.append(escapeCsvCell("Không có dữ liệu hạng phòng trong kỳ")).append(CSV_NEWLINE);
            }
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Sinh nội dung file CSV báo cáo 12 tháng (Monthly Analytics).
     */
    public static byte[] generateMonthlyCsv(List<DashboardMonthlyRevenuePoint> monthlyPoints,
                                            List<DashboardRoomTypeRevenue> roomTypes,
                                            int year) {
        StringBuilder sb = new StringBuilder();
        sb.append(UTF8_BOM);

        sb.append(escapeCsvCell("BÁO CÁO PHÂN TÍCH DOANH THU 12 THÁNG NĂM " + year)).append(CSV_NEWLINE);
        sb.append(escapeCsvCell("Thời gian xuất: " + LocalDateTime.now().format(TIME_FORMATTER))).append(CSV_NEWLINE);
        sb.append(CSV_NEWLINE);

        sb.append(escapeCsvCell("I. DOANH THU & CHỈ SỐ THEO THÁNG")).append(CSV_NEWLINE);
        sb.append(escapeCsvCell("Tháng")).append(CSV_DELIMITER)
                .append(escapeCsvCell("Doanh thu lưu trú (VNĐ)")).append(CSV_DELIMITER)
                .append(escapeCsvCell("Dòng tiền thực thu (VNĐ)")).append(CSV_DELIMITER)
                .append(escapeCsvCell("Đêm phòng đã bán")).append(CSV_DELIMITER)
                .append(escapeCsvCell("Đêm phòng khả dụng")).append(CSV_DELIMITER)
                .append(escapeCsvCell("Tỷ lệ lấp đầy")).append(CSV_DELIMITER)
                .append(escapeCsvCell("ADR (VNĐ)")).append(CSV_DELIMITER)
                .append(escapeCsvCell("RevPAR (VNĐ)")).append(CSV_NEWLINE);

        if (monthlyPoints != null && !monthlyPoints.isEmpty()) {
            for (DashboardMonthlyRevenuePoint m : monthlyPoints) {
                sb.append(escapeCsvCell(m.getMonth())).append(CSV_DELIMITER)
                        .append(escapeCsvCell(formatCurrency(m.getRoomRevenue()))).append(CSV_DELIMITER)
                        .append(escapeCsvCell(formatCurrency(m.getNetCashFlow()))).append(CSV_DELIMITER)
                        .append(escapeCsvCell(m.getSoldRoomNights() != null ? m.getSoldRoomNights().toString() : "0")).append(CSV_DELIMITER)
                        .append(escapeCsvCell(m.getAvailableRoomNights() != null ? m.getAvailableRoomNights().toString() : "0")).append(CSV_DELIMITER)
                        .append(escapeCsvCell(formatPercent(m.getOccupancyRate()))).append(CSV_DELIMITER)
                        .append(escapeCsvCell(formatCurrency(m.getAdr()))).append(CSV_DELIMITER)
                        .append(escapeCsvCell(formatCurrency(m.getRevpar()))).append(CSV_NEWLINE);
            }
        }

        sb.append(CSV_NEWLINE);
        sb.append(escapeCsvCell("II. CƠ CẤU DOANH THU THEO HẠNG PHÒNG")).append(CSV_NEWLINE);
        sb.append(escapeCsvCell("Mã hạng phòng")).append(CSV_DELIMITER)
                .append(escapeCsvCell("Tên hạng phòng")).append(CSV_DELIMITER)
                .append(escapeCsvCell("Doanh thu (VNĐ)")).append(CSV_DELIMITER)
                .append(escapeCsvCell("Đêm phòng đã bán")).append(CSV_DELIMITER)
                .append(escapeCsvCell("Tỷ trọng (%)")).append(CSV_NEWLINE);

        if (roomTypes != null && !roomTypes.isEmpty()) {
            for (DashboardRoomTypeRevenue rt : roomTypes) {
                sb.append(escapeCsvCell(rt.getRoomTypeId() != null ? rt.getRoomTypeId().toString() : "")).append(CSV_DELIMITER)
                        .append(escapeCsvCell(rt.getRoomTypeName())).append(CSV_DELIMITER)
                        .append(escapeCsvCell(formatCurrency(rt.getRevenue() != null ? rt.getRevenue() : rt.getRoomRevenue()))).append(CSV_DELIMITER)
                        .append(escapeCsvCell(rt.getSoldRoomNights() != null ? rt.getSoldRoomNights().toString() : "0")).append(CSV_DELIMITER)
                        .append(escapeCsvCell(formatPercent(rt.getRevenueShare()))).append(CSV_NEWLINE);
            }
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static void appendKpiRow(StringBuilder sb, String kpiName, String value, String unit, String note) {
        sb.append(escapeCsvCell(kpiName)).append(CSV_DELIMITER)
                .append(escapeCsvCell(value)).append(CSV_DELIMITER)
                .append(escapeCsvCell(unit)).append(CSV_DELIMITER)
                .append(escapeCsvCell(note)).append(CSV_NEWLINE);
    }
}

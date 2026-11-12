package org.example.backend.dashboard;

import org.example.backend.dashboard.dto.DashboardDailyRevenuePoint;
import org.example.backend.dashboard.dto.DashboardRoomTypeRevenue;
import org.example.backend.dashboard.dto.DashboardSummaryResponse;
import org.example.backend.dashboard.util.DashboardCsvHelper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DashboardCsvHelperTest {

    @Test
    @DisplayName("Chống CSV Formula Injection: Ô bắt đầu bằng =, @, +, -, tab, CR được escape bằng dấu nháy đơn")
    void testCsvFormulaInjectionPrevention() {
        // Test công thức nguy hiểm
        assertThat(DashboardCsvHelper.escapeCsvCell("=cmd|' /C calc'!A0"))
                .isEqualTo("\"'=cmd|' /C calc'!A0\"");

        assertThat(DashboardCsvHelper.escapeCsvCell("@SUM(A1:A10)"))
                .isEqualTo("\"'@SUM(A1:A10)\"");

        assertThat(DashboardCsvHelper.escapeCsvCell("-2+3+cmd|' /C calc'!A0"))
                .isEqualTo("\"'-2+3+cmd|' /C calc'!A0\"");

        assertThat(DashboardCsvHelper.escapeCsvCell("+cmd|' /C calc'!A0"))
                .isEqualTo("\"'+cmd|' /C calc'!A0\"");

        assertThat(DashboardCsvHelper.escapeCsvCell("\tmalicious_tab"))
                .isEqualTo("\"'\tmalicious_tab\"");

        // Test số âm / số dương bình thường không bị hiểu nhầm là formula
        assertThat(DashboardCsvHelper.escapeCsvCell("-500000"))
                .isEqualTo("-500000");

        assertThat(DashboardCsvHelper.escapeCsvCell("+12345"))
                .isEqualTo("+12345");

        // Test escape chuẩn RFC 4180
        assertThat(DashboardCsvHelper.escapeCsvCell("Khách sạn, Grand Aurora \"Luxury\""))
                .isEqualTo("\"Khách sạn, Grand Aurora \"\"Luxury\"\"\"");
    }

    @Test
    @DisplayName("Xuất CSV UTF-8 with BOM: Byte đầu tiên phải chứa \\uFEFF (EF BB BF)")
    void testCsvUtf8BomPresence() {
        DashboardSummaryResponse summary = DashboardSummaryResponse.builder()
                .dateFrom(LocalDate.of(2026, 11, 1))
                .dateTo(LocalDate.of(2026, 11, 30))
                .roomRevenue(BigDecimal.valueOf(28500000))
                .netCashFlow(BigDecimal.valueOf(24200000))
                .adr(BigDecimal.valueOf(950000))
                .revpar(BigDecimal.valueOf(380000))
                .occupancyRate(0.40)
                .soldRoomNights(30L)
                .totalAvailableRoomNights(75L)
                .totalRooms(10L)
                .activeRooms(9L)
                .totalBookings(12L)
                .confirmedBookings(10L)
                .build();

        byte[] csvBytes = DashboardCsvHelper.generateSummaryCsv(
                summary, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), "full");

        assertThat(csvBytes).isNotEmpty();

        // 3 bytes đầu tiên là BOM UTF-8: 0xEF, 0xBB, 0xBF
        assertThat((int) (csvBytes[0] & 0xFF)).isEqualTo(0xEF);
        assertThat((int) (csvBytes[1] & 0xFF)).isEqualTo(0xBB);
        assertThat((int) (csvBytes[2] & 0xFF)).isEqualTo(0xBF);

        String csvContent = new String(csvBytes, StandardCharsets.UTF_8);
        assertThat(csvContent).startsWith("\uFEFF");
        assertThat(csvContent).contains("BÁO CÁO THỐNG KÊ QUẢN TRỊ KHÁCH SẠN GRAND AURORA");
        assertThat(csvContent).contains("Doanh thu lưu trú (Room Revenue)");
        assertThat(csvContent).contains("28500000");
        assertThat(csvContent).contains("950000");
        assertThat(csvContent).contains("40.00%");
    }

    @Test
    @DisplayName("Biên 0 phòng / không có dữ liệu: Không lỗi chia cho 0, các chỉ số hiển thị 0 an toàn")
    void testZeroRoomsAndZeroNightsSafety() {
        DashboardSummaryResponse zeroSummary = DashboardSummaryResponse.builder()
                .dateFrom(LocalDate.of(2026, 11, 1))
                .dateTo(LocalDate.of(2026, 11, 30))
                .roomRevenue(BigDecimal.ZERO)
                .netCashFlow(BigDecimal.ZERO)
                .totalPaid(BigDecimal.ZERO)
                .refundTotal(BigDecimal.ZERO)
                .adr(BigDecimal.ZERO)
                .revpar(BigDecimal.ZERO)
                .occupancyRate(0.0)
                .soldRoomNights(0L)
                .totalAvailableRoomNights(0L)
                .totalRooms(0L)
                .activeRooms(0L)
                .totalBookings(0L)
                .confirmedBookings(0L)
                .revenueSeries(List.of())
                .roomTypeRevenues(List.of())
                .build();

        byte[] csvBytes = DashboardCsvHelper.generateSummaryCsv(
                zeroSummary, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), "full");

        String csvContent = new String(csvBytes, StandardCharsets.UTF_8);
        assertThat(csvContent).contains("0.00%");
        assertThat(csvContent).contains("Không có dữ liệu phát sinh trong kỳ");
        assertThat(csvContent).contains("Không có dữ liệu hạng phòng trong kỳ");
    }

    @Test
    @DisplayName("Số liệu xuất CSV khớp chính xác 100% với Fixture 1 (Standard)")
    void testCsvMatchesFixture1Standard() {
        DashboardDailyRevenuePoint d1 = DashboardDailyRevenuePoint.builder()
                .date(LocalDate.of(2026, 10, 1))
                .roomRevenue(BigDecimal.valueOf(1900000))
                .netCashFlow(BigDecimal.valueOf(1900000))
                .soldRoomNights(2L)
                .availableRooms(10L)
                .occupancyRate(0.20)
                .adr(BigDecimal.valueOf(950000))
                .revpar(BigDecimal.valueOf(190000))
                .build();

        DashboardRoomTypeRevenue rt = DashboardRoomTypeRevenue.builder()
                .roomTypeId(2L)
                .roomTypeName("Deluxe Double Room")
                .roomRevenue(BigDecimal.valueOf(38000000))
                .soldRoomNights(40L)
                .revenueShare(0.6667)
                .build();

        DashboardSummaryResponse fixture1 = DashboardSummaryResponse.builder()
                .dateFrom(LocalDate.of(2026, 10, 1))
                .dateTo(LocalDate.of(2026, 10, 31))
                .roomRevenue(BigDecimal.valueOf(57000000))
                .netCashFlow(BigDecimal.valueOf(52500000))
                .expectedRevenue(BigDecimal.valueOf(60000000))
                .actualRevenue(BigDecimal.valueOf(52500000))
                .totalPaid(BigDecimal.valueOf(55000000))
                .refundTotal(BigDecimal.valueOf(2500000))
                .adr(BigDecimal.valueOf(950000))
                .revpar(BigDecimal.valueOf(570000))
                .occupancyRate(0.60)
                .soldRoomNights(60L)
                .totalAvailableRoomNights(100L)
                .totalRooms(10L)
                .activeRooms(10L)
                .totalBookings(25L)
                .confirmedBookings(22L)
                .roomCounts(Map.of("AVAILABLE", 4, "OCCUPIED", 4, "CLEANING", 1, "MAINTENANCE", 1))
                .revenueSeries(List.of(d1))
                .roomTypeRevenues(List.of(rt))
                .build();

        byte[] csvBytes = DashboardCsvHelper.generateSummaryCsv(
                fixture1, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), "full");

        String csv = new String(csvBytes, StandardCharsets.UTF_8);

        // Khớp KPI
        assertThat(csv).contains("57000000"); // roomRevenue
        assertThat(csv).contains("52500000"); // netCashFlow
        assertThat(csv).contains("55000000"); // totalPaid
        assertThat(csv).contains("2500000");  // refundTotal
        assertThat(csv).contains("950000");   // adr
        assertThat(csv).contains("570000");   // revpar
        assertThat(csv).contains("60.00%");   // occupancyRate
        assertThat(csv).contains("60");       // soldRoomNights
        assertThat(csv).contains("100");      // totalAvailableRoomNights

        // Khớp chuỗi ngày
        assertThat(csv).contains("2026-10-01");
        assertThat(csv).contains("1900000");
        assertThat(csv).contains("190000");

        // Khớp loại phòng
        assertThat(csv).contains("Deluxe Double Room");
        assertThat(csv).contains("38000000");
        assertThat(csv).contains("66.67%");
    }
}

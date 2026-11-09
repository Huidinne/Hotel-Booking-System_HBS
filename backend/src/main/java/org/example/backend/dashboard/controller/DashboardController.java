package org.example.backend.dashboard.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.dashboard.dto.DashboardSummaryResponse;
import org.example.backend.dashboard.service.DashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * REST Controller cho Dashboard quản trị (Admin Only) theo SRS §11.6 & FR-14:
 * Báo cáo thống kê tài chính, ADR, RevPAR, phân biệt doanh thu lưu trú và dòng tiền.
 */
@Tag(name = "Admin Dashboard API", description = "Các API thống kê, phân tích chỉ số kinh doanh và hiệu suất vận hành khách sạn")
@RestController
@RequestMapping("/api/v1/admin/dashboard")
@PreAuthorize("hasRole('ADMIN')")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Báo cáo thống kê tài chính, hiệu suất phòng (ADR, RevPAR, Room Nights) và chuỗi dữ liệu doanh thu.
     * GET /api/v1/admin/dashboard/summary?dateFrom=2026-10-01&dateTo=2026-10-31
     */
    @Operation(summary = "Lấy báo cáo tổng hợp tài chính, chỉ số ADR, RevPAR, tỷ lệ lấp đầy và chuỗi dữ liệu biểu đồ")
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getSummary(
            @Parameter(description = "Ngày bắt đầu kỳ báo cáo (YYYY-MM-DD)", example = "2026-11-01")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @Parameter(description = "Ngày kết thúc kỳ báo cáo (YYYY-MM-DD)", example = "2026-11-30")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}

package org.example.backend.dashboard.controller;

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
 * REST Controller cho Dashboard quản trị (Admin Only) theo SRS §11.6.
 */
@RestController
@RequestMapping("/api/v1/admin/dashboard")
@PreAuthorize("hasRole('ADMIN')")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Báo cáo thống kê tài chính và công suất phòng.
     * GET /api/v1/admin/dashboard/summary?dateFrom=2026-10-01&dateTo=2026-10-31
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {

        DashboardSummaryResponse response = dashboardService.getSummary(dateFrom, dateTo);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}

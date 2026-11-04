package org.example.backend.audit.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.example.backend.audit.dto.AuditLogFilterRequest;
import org.example.backend.audit.dto.AuditLogResponse;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.audit.service.AuditLogService;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.common.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * REST Controller cho Quản trị viên (Admin) tra cứu nhật ký thao tác `audit_logs` (SRS §FR-16.2).
 */
@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Audit Log", description = "API tra cứu và giám sát nhật ký thao tác hệ thống dành cho Admin (SRS §FR-16)")
public class AdminAuditLogController {

    private final AuditLogService auditLogService;

    public AdminAuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    /**
     * Tra cứu nhật ký thao tác với bộ lọc đa tiêu chí (phân trang).
     * GET /api/v1/admin/audit-logs?startDate=2026-11-01&endDate=2026-11-30&action=CHECK_IN_ASSIGN_ROOM&page=0&size=20
     */
    @GetMapping
    @Operation(summary = "Tra cứu nhật ký thao tác hệ thống", description = "Hỗ trợ lọc theo ngày, actor, loại hành động, đối tượng tác động và trạng thái")
    public ResponseEntity<ApiResponse<PageResponse<AuditLogResponse>>> getAuditLogs(
            @ModelAttribute AuditLogFilterRequest filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<AuditLogResponse> resultPage = auditLogService.getAuditLogs(filter, page, size);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(resultPage)));
    }

    /**
     * Lấy danh sách các loại hành động để hiển thị bộ lọc trên UI Admin.
     * GET /api/v1/admin/audit-logs/actions
     */
    @GetMapping("/actions")
    @Operation(summary = "Danh sách danh mục hành động AuditAction", description = "Phục vụ render dropdown filter trên giao diện Admin")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getAuditActions() {
        List<Map<String, String>> actions = Arrays.stream(AuditAction.values())
                .map(action -> Map.of(
                        "name", action.name(),
                        "description", action.getDescription()
                ))
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(actions));
    }

    /**
     * Tra cứu toàn bộ lịch sử thay đổi của một đối tượng cụ thể.
     * GET /api/v1/admin/audit-logs/target?targetType=BOOKING&targetId=BK-20261104-001
     */
    @GetMapping("/target")
    @Operation(summary = "Lịch sử thao tác theo đối tượng", description = "Lấy toàn bộ lịch sử tác động lên một Booking, Phòng hoặc Loại phòng")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getLogsByTarget(
            @RequestParam String targetType,
            @RequestParam String targetId) {

        List<AuditLogResponse> logs = auditLogService.getAuditLogsByTarget(targetType, targetId);
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }
}


package org.example.backend.roomservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.common.response.PageResponse;
import org.example.backend.roomservice.dto.MaintenanceRequestCreateDTO;
import org.example.backend.roomservice.dto.MaintenanceRequestResponse;
import org.example.backend.roomservice.dto.MaintenanceStatusUpdateRequest;
import org.example.backend.roomservice.entity.MaintenancePriority;
import org.example.backend.roomservice.entity.MaintenanceStatus;
import org.example.backend.roomservice.service.MaintenanceRequestService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Controller cho Lễ tân/Admin quản lý phiếu báo sự cố kỹ thuật buồng phòng (SRS Chapter 12).
 */
@RestController
@RequestMapping("/api/v1/receptionist")
@PreAuthorize("hasAnyRole('RECEPTIONIST', 'ADMIN')")
@RequiredArgsConstructor
public class ReceptionistMaintenanceController {

    private final MaintenanceRequestService maintenanceRequestService;

    /**
     * Tạo phiếu báo sự cố buồng phòng.
     * POST /api/v1/receptionist/bookings/{bookingId}/maintenance-requests
     */
    @PostMapping("/bookings/{bookingId}/maintenance-requests")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> createRequest(
            @PathVariable Long bookingId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody MaintenanceRequestCreateDTO request,
            Authentication authentication) {

        String currentActorEmail = authentication != null ? authentication.getName() : "system";
        MaintenanceRequestResponse response = maintenanceRequestService.createRequest(
                bookingId, request, idempotencyKey, currentActorEmail);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Tạo phiếu báo sự cố buồng phòng thành công", response));
    }

    /**
     * Cập nhật trạng thái phiếu sự cố (OPEN -> IN_PROGRESS -> RESOLVED hoặc CANCELLED).
     * PATCH /api/v1/receptionist/maintenance-requests/{id}
     */
    @PatchMapping("/maintenance-requests/{id}")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceStatusUpdateRequest request,
            Authentication authentication) {

        String currentActorEmail = authentication != null ? authentication.getName() : "system";
        MaintenanceRequestResponse response = maintenanceRequestService.updateStatus(id, request, currentActorEmail);

        return ResponseEntity.ok(ApiResponse.ok("Cập nhật trạng thái phiếu sự cố thành công", response));
    }

    /**
     * Xem chi tiết một phiếu sự cố.
     * GET /api/v1/receptionist/maintenance-requests/{id}
     */
    @GetMapping("/maintenance-requests/{id}")
    public ResponseEntity<ApiResponse<MaintenanceRequestResponse>> getById(@PathVariable Long id) {
        MaintenanceRequestResponse response = maintenanceRequestService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Bảng theo dõi toàn bộ phiếu sự cố (kể cả các phiếu còn mở sau khi khách Checkout).
     * GET /api/v1/receptionist/maintenance-requests
     */
    @GetMapping("/maintenance-requests")
    public ResponseEntity<ApiResponse<PageResponse<MaintenanceRequestResponse>>> getAllWithFilter(
            @RequestParam(required = false) Long roomId,
            @RequestParam(required = false) MaintenanceStatus status,
            @RequestParam(required = false) MaintenancePriority priority,
            @RequestParam(required = false) Boolean blocksResale,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id,desc") String[] sort) {

        Sort sortObj = Sort.by(Sort.Direction.DESC, "id");
        if (sort.length >= 2) {
            sortObj = Sort.by(Sort.Direction.fromString(sort[1]), sort[0]);
        }
        Pageable pageable = PageRequest.of(page, size, sortObj);

        Page<MaintenanceRequestResponse> result = maintenanceRequestService.getAllWithFilter(
                roomId, status, priority, blocksResale, pageable);

        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(result)));
    }
}

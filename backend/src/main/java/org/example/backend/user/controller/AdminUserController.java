package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.common.response.ApiResponse;
import org.example.backend.common.response.PageResponse;
import org.example.backend.user.dto.AdminUserCreateRequest;
import org.example.backend.user.dto.AdminUserResetPasswordRequest;
import org.example.backend.user.dto.AdminUserResponse;
import org.example.backend.user.dto.AdminUserStatsResponse;
import org.example.backend.user.dto.AdminUserStatusUpdateRequest;
import org.example.backend.user.dto.AdminUserUpdateRequest;
import org.example.backend.user.entity.Role;
import org.example.backend.user.service.AdminUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

/**
 * REST Controller cho Admin quản lý tài khoản người dùng & cấp tài khoản Lễ tân.
 * Base path: /api/v1/admin/users (Admin Only).
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "email", "fullName", "role", "isActive", "createdAt", "updatedAt"
    );

    private final AdminUserService adminUserService;

    /**
     * Lấy danh sách toàn bộ tài khoản người dùng với bộ lọc đa tiêu chí và phân trang.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminUserResponse>>> getUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        Sort sortObj = parseSort(sort);
        Pageable pageable = PageRequest.of(safePage, safeSize, sortObj);

        Page<AdminUserResponse> result = adminUserService.getUsers(keyword, role, isActive, pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(result)));
    }

    /**
     * Thống kê nhanh số lượng tài khoản theo vai trò và trạng thái hoạt động.
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminUserStatsResponse>> getUserStats() {
        return ResponseEntity.ok(ApiResponse.ok(adminUserService.getUserStats()));
    }

    /**
     * Xem chi tiết 1 tài khoản theo ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(adminUserService.getUserById(id)));
    }

    /**
     * Admin cấp tài khoản mới (Lễ tân / Quản trị viên / Khách hàng).
     */
    @PostMapping
    public ResponseEntity<ApiResponse<AdminUserResponse>> createUser(
            @Valid @RequestBody AdminUserCreateRequest request) {
        AdminUserResponse created = adminUserService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Cấp tài khoản mới thành công", created));
    }

    /**
     * Admin cập nhật thông tin cá nhân và vai trò (Role) của người dùng.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody AdminUserUpdateRequest request,
            Authentication authentication) {
        String currentAdminEmail = authentication != null ? authentication.getName() : null;
        AdminUserResponse updated = adminUserService.updateUser(id, request, currentAdminEmail);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật tài khoản thành công", updated));
    }

    /**
     * Admin khóa hoặc mở khóa tài khoản người dùng.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody AdminUserStatusUpdateRequest request,
            Authentication authentication) {
        String currentAdminEmail = authentication != null ? authentication.getName() : null;
        AdminUserResponse updated = adminUserService.updateUserStatus(id, request, currentAdminEmail);
        String msg = Boolean.TRUE.equals(updated.getIsActive())
                ? "Đã mở khóa tài khoản thành công"
                : "Đã khóa tài khoản thành công";
        return ResponseEntity.ok(ApiResponse.ok(msg, updated));
    }

    /**
     * Admin đặt lại mật khẩu mới cho người dùng / nhân viên lễ tân.
     */
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<AdminUserResponse>> resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody AdminUserResetPasswordRequest request) {
        AdminUserResponse updated = adminUserService.resetPassword(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Đặt lại mật khẩu thành công", updated));
    }

    private Sort parseSort(String[] sort) {
        String field = "createdAt";
        Sort.Direction direction = Sort.Direction.DESC;
        if (sort != null && sort.length > 0) {
            String raw = sort[0];
            if (raw.contains(",")) {
                String[] parts = raw.split(",");
                if (ALLOWED_SORT_FIELDS.contains(parts[0])) {
                    field = parts[0];
                }
                if (parts.length > 1) {
                    direction = Sort.Direction.fromOptionalString(parts[1]).orElse(Sort.Direction.DESC);
                }
            } else {
                if (ALLOWED_SORT_FIELDS.contains(raw)) {
                    field = raw;
                }
                if (sort.length > 1) {
                    direction = Sort.Direction.fromOptionalString(sort[1]).orElse(Sort.Direction.DESC);
                }
            }
        }
        return Sort.by(direction, field);
    }
}

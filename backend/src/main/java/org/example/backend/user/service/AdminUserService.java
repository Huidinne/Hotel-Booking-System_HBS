package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.audit.annotation.Auditable;
import org.example.backend.audit.entity.AuditAction;
import org.example.backend.common.exception.AppException;
import org.example.backend.user.dto.AdminUserCreateRequest;
import org.example.backend.user.dto.AdminUserResetPasswordRequest;
import org.example.backend.user.dto.AdminUserResponse;
import org.example.backend.user.dto.AdminUserStatsResponse;
import org.example.backend.user.dto.AdminUserStatusUpdateRequest;
import org.example.backend.user.dto.AdminUserUpdateRequest;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service quản lý tài khoản người dùng & cấp tài khoản nhân viên/lễ tân dành cho Admin.
 */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Lấy danh sách người dùng có lọc theo từ khóa (tên/email/SĐT), vai trò, trạng thái và phân trang.
     */
    @Transactional(readOnly = true)
    public Page<AdminUserResponse> getUsers(String keyword, Role role, Boolean isActive, Pageable pageable) {
        String normalizedKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        return userRepository.searchAdminUsers(normalizedKeyword, role, isActive, pageable)
                .map(AdminUserResponse::from);
    }

    /**
     * Thống kê tổng quan số lượng tài khoản thật (đã loại bỏ tài khoản load test / E2E) theo vai trò và trạng thái.
     */
    @Transactional(readOnly = true)
    public AdminUserStatsResponse getUserStats() {
        return AdminUserStatsResponse.builder()
                .totalUsers(userRepository.countRealUsers())
                .activeUsers(userRepository.countActiveRealUsers())
                .lockedUsers(userRepository.countLockedRealUsers())
                .adminCount(userRepository.countRealUsersByRole(Role.ROLE_ADMIN))
                .receptionistCount(userRepository.countRealUsersByRole(Role.ROLE_RECEPTIONIST))
                .customerCount(userRepository.countRealUsersByRole(Role.ROLE_CUSTOMER))
                .build();
    }

    /**
     * Xem chi tiết 1 tài khoản theo ID.
     */
    @Transactional(readOnly = true)
    public AdminUserResponse getUserById(Long id) {
        User user = findUserOrThrow(id);
        return AdminUserResponse.from(user);
    }

    /**
     * Admin cấp tài khoản mới (thường dùng cấp tài khoản cho Lễ tân ca sáng/tối hoặc Admin phụ).
     */
    @Transactional
    @Auditable(
            action = AuditAction.CREATE_USER,
            targetType = "USER",
            description = "Admin cấp tài khoản người dùng/lễ tân mới"
    )
    public AdminUserResponse createUser(AdminUserCreateRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new AppException(HttpStatus.CONFLICT, "Email đã tồn tại trong hệ thống");
        }

        User user = User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone().trim())
                .role(request.getRole())
                .isActive(true)
                .build();

        User saved = userRepository.save(user);
        return AdminUserResponse.from(saved);
    }

    /**
     * Admin cập nhật thông tin cơ bản và vai trò (Role) của người dùng.
     * Chống tự hạ quyền của chính mình và bảo vệ tài khoản Admin hoạt động cuối cùng.
     */
    @Transactional
    @Auditable(
            action = AuditAction.UPDATE_USER,
            targetType = "USER",
            description = "Admin cập nhật thông tin và vai trò tài khoản"
    )
    public AdminUserResponse updateUser(Long id, AdminUserUpdateRequest request, String currentAdminEmail) {
        User user = findUserOrThrow(id);

        boolean isSelf = currentAdminEmail != null && user.getEmail().equalsIgnoreCase(currentAdminEmail);
        if (isSelf && request.getRole() != Role.ROLE_ADMIN) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể tự thay đổi quyền Quản trị của chính mình");
        }

        if (user.getRole() == Role.ROLE_ADMIN
                && Boolean.TRUE.equals(user.getIsActive())
                && request.getRole() != Role.ROLE_ADMIN
                && userRepository.countByRoleAndIsActiveTrue(Role.ROLE_ADMIN) <= 1) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể hạ quyền tài khoản Quản trị viên hoạt động cuối cùng");
        }

        user.setFullName(request.getFullName().trim());
        user.setPhone(request.getPhone().trim());
        user.setRole(request.getRole());

        User saved = userRepository.save(user);
        return AdminUserResponse.from(saved);
    }

    /**
     * Admin khóa hoặc mở khóa tài khoản người dùng.
     * Chống tự khóa chính mình và chống khóa tài khoản Admin hoạt động cuối cùng.
     */
    @Transactional
    @Auditable(
            action = AuditAction.CHANGE_USER_STATUS,
            targetType = "USER",
            description = "Admin khóa hoặc mở khóa tài khoản người dùng"
    )
    public AdminUserResponse updateUserStatus(Long id, AdminUserStatusUpdateRequest request, String currentAdminEmail) {
        User user = findUserOrThrow(id);
        boolean targetActive = Boolean.TRUE.equals(request.getIsActive());

        boolean isSelf = currentAdminEmail != null && user.getEmail().equalsIgnoreCase(currentAdminEmail);
        if (isSelf && !targetActive) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể tự khóa tài khoản của chính mình");
        }

        if (!targetActive
                && user.getRole() == Role.ROLE_ADMIN
                && Boolean.TRUE.equals(user.getIsActive())
                && userRepository.countByRoleAndIsActiveTrue(Role.ROLE_ADMIN) <= 1) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể khóa tài khoản Quản trị viên hoạt động cuối cùng");
        }

        user.setIsActive(targetActive);
        User saved = userRepository.save(user);
        return AdminUserResponse.from(saved);
    }

    /**
     * Admin đặt lại mật khẩu mới cho người dùng / nhân viên lễ tân.
     */
    @Transactional
    @Auditable(
            action = AuditAction.RESET_USER_PASSWORD,
            targetType = "USER",
            description = "Admin đặt lại mật khẩu tài khoản"
    )
    public AdminUserResponse resetPassword(Long id, AdminUserResetPasswordRequest request) {
        User user = findUserOrThrow(id);
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        User saved = userRepository.save(user);
        return AdminUserResponse.from(saved);
    }

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản với ID: " + id));
    }
}

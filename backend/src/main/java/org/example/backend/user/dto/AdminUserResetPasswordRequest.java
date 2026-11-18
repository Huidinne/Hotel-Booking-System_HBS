package org.example.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO yêu cầu Admin đặt lại mật khẩu cho người dùng/nhân viên lễ tân.
 * Trường newPassword sẽ tự động được AuditLogSecuritySanitizer che thành [REDACTED].
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserResetPasswordRequest {

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 6, max = 100, message = "Mật khẩu mới phải từ 6 đến 100 ký tự")
    private String newPassword;
}

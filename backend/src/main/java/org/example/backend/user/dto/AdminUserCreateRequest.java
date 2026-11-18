package org.example.backend.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.backend.user.entity.Role;

/**
 * DTO yêu cầu Admin cấp tài khoản mới (ví dụ: Lễ tân ca sáng/tối, Admin phụ).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserCreateRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    @Size(max = 100, message = "Email tối đa 100 ký tự")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, max = 100, message = "Mật khẩu phải từ 6 đến 100 ký tự")
    private String password;

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^[0-9+\\-\\s]{8,20}$", message = "Số điện thoại không hợp lệ (8-20 ký tự)")
    private String phone;

    @NotNull(message = "Vai trò (role) không được để trống")
    private Role role;
}

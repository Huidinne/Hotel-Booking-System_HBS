package org.example.backend.user.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO yêu cầu Admin khóa hoặc mở khóa tài khoản người dùng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserStatusUpdateRequest {

    @NotNull(message = "Trạng thái isActive không được để trống")
    private Boolean isActive;
}

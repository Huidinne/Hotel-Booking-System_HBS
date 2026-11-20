package org.example.backend.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.auth.dto.*;
import org.example.backend.auth.service.PasswordResetService;
import org.example.backend.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/forgot-password")
@RequiredArgsConstructor
@Tag(name = "Forgot Password API", description = "Các API khôi phục mật khẩu tự phục vụ qua mã OTP gửi về Email")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/request-otp")
    @Operation(summary = "Bước 1: Gửi yêu cầu cấp mã OTP qua Email")
    public ResponseEntity<ApiResponse<ForgotPasswordResponse>> requestOtp(
            @Valid @RequestBody ForgotPasswordRequest request) {
        ForgotPasswordResponse response = passwordResetService.requestOtp(request);
        return ResponseEntity.ok(ApiResponse.ok(
                "Nếu địa chỉ email tồn tại trong hệ thống, mã xác minh OTP đã được gửi vào hộp thư của bạn.",
                response
        ));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Bước 2: Xác minh mã OTP 6 số người dùng đã nhận")
    public ResponseEntity<ApiResponse<VerifyOtpResponse>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {
        VerifyOtpResponse response = passwordResetService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.ok("Xác minh mã OTP thành công", response));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Bước 3: Đặt lại mật khẩu mới bằng Reset Token")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(
                "Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
                null
        ));
    }
}

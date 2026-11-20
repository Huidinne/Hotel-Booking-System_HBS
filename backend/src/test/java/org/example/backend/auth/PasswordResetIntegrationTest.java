package org.example.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.backend.auth.dto.*;
import org.example.backend.auth.entity.PasswordResetToken;
import org.example.backend.auth.repository.PasswordResetTokenRepository;
import org.example.backend.user.entity.Role;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class PasswordResetIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String testEmail = "reset_test_user@example.com";

    @BeforeEach
    void setUp() {
        tokenRepository.deleteAll();
        if (!userRepository.existsByEmail(testEmail)) {
            User user = User.builder()
                    .email(testEmail)
                    .password(passwordEncoder.encode("OldPassword@123"))
                    .fullName("Người dùng Đổi Mật Khẩu")
                    .phone("0987654321")
                    .role(Role.ROLE_CUSTOMER)
                    .isActive(true)
                    .build();
            userRepository.save(user);
        }
    }

    @Test
    @DisplayName("Bước 1: Yêu cầu OTP thành công cho email đã đăng ký")
    void testRequestOtpSuccess() throws Exception {
        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email(testEmail)
                .build();

        mockMvc.perform(post("/api/v1/auth/forgot-password/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cooldownSeconds").value(60))
                .andExpect(jsonPath("$.data.email").value(testEmail));

        // Kiểm tra bản ghi đã được lưu trong DB
        var tokenOpt = tokenRepository.findFirstByEmailAndIsUsedFalseOrderByCreatedAtDesc(testEmail);
        assertTrue(tokenOpt.isPresent());
        assertNotNull(tokenOpt.get().getOtpHash());
        assertFalse(tokenOpt.get().getIsVerified());
    }

    @Test
    @DisplayName("Bước 1: Chống User Enumeration - Email không tồn tại vẫn trả về 200 OK")
    void testRequestOtpNonExistentEmail() throws Exception {
        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email("non_existent_account_123456@example.com")
                .build();

        mockMvc.perform(post("/api/v1/auth/forgot-password/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(containsString("Nếu địa chỉ email tồn tại")));
    }

    @Test
    @DisplayName("Bước 1: Rate Limiting - Yêu cầu liên tiếp trong vòng 60 giây bị trả về 429")
    void testRequestOtpRateLimit() throws Exception {
        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email(testEmail)
                .build();

        // Lần 1: Thành công
        mockMvc.perform(post("/api/v1/auth/forgot-password/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Lần 2 (ngay lập tức): Bị chặn 429 Too Many Requests
        mockMvc.perform(post("/api/v1/auth/forgot-password/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value(containsString("Vui lòng đợi")));
    }

    @Test
    @DisplayName("Bước 2: Xác minh OTP sai → 400 Bad Request kèm số lần thử còn lại")
    void testVerifyOtpWrongCode() throws Exception {
        // Tạo token thủ công với OTP '123456'
        String otpHash = hashSha256("123456");
        PasswordResetToken token = PasswordResetToken.builder()
                .email(testEmail)
                .otpHash(otpHash)
                .otpExpiresAt(LocalDateTime.now().plusMinutes(5))
                .attempts(0)
                .isVerified(false)
                .isUsed(false)
                .build();
        tokenRepository.save(token);

        VerifyOtpRequest request = VerifyOtpRequest.builder()
                .email(testEmail)
                .otp("999999") // Sai mã
                .build();

        mockMvc.perform(post("/api/v1/auth/forgot-password/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Mã OTP không chính xác")));
    }

    @Test
    @DisplayName("Luồng hoàn chỉnh: Yêu cầu OTP → Xác minh đúng → Đổi mật khẩu mới → Đăng nhập bằng mật khẩu mới thành công")
    void testFullPasswordResetFlow() throws Exception {
        // 1. Tạo token trong DB với OTP '654321'
        String correctOtp = "654321";
        String otpHash = hashSha256(correctOtp);
        PasswordResetToken token = PasswordResetToken.builder()
                .email(testEmail)
                .otpHash(otpHash)
                .otpExpiresAt(LocalDateTime.now().plusMinutes(5))
                .attempts(0)
                .isVerified(false)
                .isUsed(false)
                .build();
        tokenRepository.save(token);

        // 2. Xác minh OTP đúng
        VerifyOtpRequest verifyReq = VerifyOtpRequest.builder()
                .email(testEmail)
                .otp(correctOtp)
                .build();

        MvcResult verifyResult = mockMvc.perform(post("/api/v1/auth/forgot-password/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resetToken").isNotEmpty())
                .andReturn();

        String responseBody = verifyResult.getResponse().getContentAsString(StandardCharsets.UTF_8);
        VerifyOtpResponse verifyResp = objectMapper.readValue(
                objectMapper.readTree(responseBody).get("data").toString(),
                VerifyOtpResponse.class
        );
        String resetToken = verifyResp.getResetToken();
        assertNotNull(resetToken);

        // 3. Đặt lại mật khẩu mới
        String newPassword = "BrandNewPassword@2026";
        ResetPasswordRequest resetReq = ResetPasswordRequest.builder()
                .email(testEmail)
                .resetToken(resetToken)
                .newPassword(newPassword)
                .build();

        mockMvc.perform(post("/api/v1/auth/forgot-password/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 4. Kiểm tra token đã bị vô hiệu hóa (Single-use token)
        var usedToken = tokenRepository.findByResetTokenAndIsUsedFalse(resetToken);
        assertTrue(usedToken.isEmpty());

        // 5. Thử đăng nhập bằng mật khẩu cũ → Phải thất bại (401)
        LoginRequest oldLoginReq = LoginRequest.builder()
                .email(testEmail)
                .password("OldPassword@123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(oldLoginReq)))
                .andExpect(status().isUnauthorized());

        // 6. Đăng nhập bằng mật khẩu mới → Phải thành công (200)
        LoginRequest newLoginReq = LoginRequest.builder()
                .email(testEmail)
                .password(newPassword)
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLoginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    private String hashSha256(String text) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}

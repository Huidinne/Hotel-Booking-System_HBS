package org.example.backend.auth;

import org.example.backend.auth.dto.ForgotPasswordRequest;
import org.example.backend.auth.dto.ForgotPasswordResponse;
import org.example.backend.auth.entity.PasswordResetToken;
import org.example.backend.auth.repository.PasswordResetTokenRepository;
import org.example.backend.auth.service.PasswordResetService;
import org.example.backend.common.exception.AppException;
import org.example.backend.mail.service.EmailService;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PasswordResetService passwordResetService;

    @Test
    @DisplayName("Khi emailService gửi email thất bại (do lỗi SMTP 535) -> Token phải bị xóa và ném lỗi 503 SERVICE_UNAVAILABLE")
    void testRequestOtpFailsWhenEmailSendFails() {
        String testEmail = "test@example.com";
        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email(testEmail)
                .build();

        User user = User.builder()
                .email(testEmail)
                .fullName("Test User")
                .isActive(true)
                .build();

        when(tokenRepository.findFirstByEmailAndIsUsedFalseOrderByCreatedAtDesc(testEmail))
                .thenReturn(Optional.empty());
        when(tokenRepository.countRecentRequests(eq(testEmail), any(LocalDateTime.class)))
                .thenReturn(0L);
        when(userRepository.findByEmail(testEmail))
                .thenReturn(Optional.of(user));

        // Giả lập gửi mail bất đồng bộ trả về false (thất bại do lỗi xác thực SMTP 535)
        when(emailService.sendHtmlEmailAsync(eq(testEmail), anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(false));

        AppException ex = assertThrows(AppException.class, () -> passwordResetService.requestOtp(request));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertTrue(ex.getMessage().contains("SMTP Authentication Failed"));

        // Xác nhận rằng token vừa lưu ĐÃ BỊ XÓA khỏi repository để không gây nghẽn rate-limit
        verify(tokenRepository, times(1)).save(any(PasswordResetToken.class));
        verify(tokenRepository, times(1)).delete(any(PasswordResetToken.class));
    }

    @Test
    @DisplayName("Khi emailService gửi email thành công -> Trả về ForgotPasswordResponse bình thường")
    void testRequestOtpSuccessWhenEmailSendSucceeds() {
        String testEmail = "success@example.com";
        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email(testEmail)
                .build();

        User user = User.builder()
                .email(testEmail)
                .fullName("Success User")
                .isActive(true)
                .build();

        when(tokenRepository.findFirstByEmailAndIsUsedFalseOrderByCreatedAtDesc(testEmail))
                .thenReturn(Optional.empty());
        when(tokenRepository.countRecentRequests(eq(testEmail), any(LocalDateTime.class)))
                .thenReturn(0L);
        when(userRepository.findByEmail(testEmail))
                .thenReturn(Optional.of(user));

        when(emailService.sendHtmlEmailAsync(eq(testEmail), anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(true));

        ForgotPasswordResponse response = passwordResetService.requestOtp(request);

        assertNotNull(response);
        assertEquals(testEmail, response.getEmail());
        assertEquals(PasswordResetService.RESEND_COOLDOWN_SECONDS, response.getCooldownSeconds());

        verify(tokenRepository, times(1)).save(any(PasswordResetToken.class));
        verify(tokenRepository, never()).delete(any(PasswordResetToken.class));
    }
}

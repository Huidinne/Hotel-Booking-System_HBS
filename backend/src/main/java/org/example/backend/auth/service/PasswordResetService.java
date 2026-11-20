package org.example.backend.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.auth.dto.*;
import org.example.backend.auth.entity.PasswordResetToken;
import org.example.backend.auth.repository.PasswordResetTokenRepository;
import org.example.backend.common.exception.AppException;
import org.example.backend.mail.service.EmailService;
import org.example.backend.mail.util.EmailTemplateHelper;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    public static final int OTP_EXPIRE_MINUTES = 5;
    public static final int RESET_TOKEN_EXPIRE_MINUTES = 10;
    public static final int MAX_OTP_ATTEMPTS = 5;
    public static final int RESEND_COOLDOWN_SECONDS = 60;
    public static final int MAX_HOURLY_REQUESTS = 5;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:}")
    private String mailUsername;

    /**
     * Yêu cầu gửi mã OTP đặt lại mật khẩu qua email.
     * Chống User Enumeration: Luôn trả về thành công dù email có tồn tại hay không.
     */
    @Transactional
    public ForgotPasswordResponse requestOtp(ForgotPasswordRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        // 1. Kiểm tra giới hạn tần suất gửi (Rate Limiting)
        LocalDateTime oneMinuteAgo = LocalDateTime.now().minusSeconds(RESEND_COOLDOWN_SECONDS);
        Optional<PasswordResetToken> latestTokenOpt = tokenRepository.findFirstByEmailAndIsUsedFalseOrderByCreatedAtDesc(normalizedEmail);
        if (latestTokenOpt.isPresent() && latestTokenOpt.get().getCreatedAt().isAfter(oneMinuteAgo)) {
            long secondsPassed = java.time.Duration.between(latestTokenOpt.get().getCreatedAt(), LocalDateTime.now()).getSeconds();
            long waitSeconds = Math.max(1, RESEND_COOLDOWN_SECONDS - secondsPassed);
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                    "Vui lòng đợi " + waitSeconds + " giây trước khi yêu cầu mã xác thực mới.");
        }

        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long recentCount = tokenRepository.countRecentRequests(normalizedEmail, oneHourAgo);
        if (recentCount >= MAX_HOURLY_REQUESTS) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                    "Bạn đã yêu cầu gửi mã quá nhiều lần trong 1 giờ. Vui lòng thử lại sau.");
        }

        // 2. Tìm người dùng trong cơ sở dữ liệu
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isPresent() && Boolean.TRUE.equals(userOpt.get().getIsActive())) {
            User user = userOpt.get();

            // Sinh mã OTP 6 số ngẫu nhiên khó đoán
            int otpNumber = secureRandom.nextInt(1_000_000);
            String otpCode = String.format("%06d", otpNumber);
            String otpHash = hashSha256(otpCode);

            // Lưu thông tin OTP vào cơ sở dữ liệu
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .email(normalizedEmail)
                    .otpHash(otpHash)
                    .otpExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRE_MINUTES))
                    .attempts(0)
                    .isVerified(false)
                    .isUsed(false)
                    .build();

            tokenRepository.save(resetToken);

            // Gửi email HTML chứa mã OTP qua ThreadPoolTaskExecutor bất đồng bộ
            String emailHtml = EmailTemplateHelper.buildPasswordResetOtpHtml(user.getFullName(), otpCode, OTP_EXPIRE_MINUTES);
            var sendFuture = emailService.sendHtmlEmailAsync(
                    normalizedEmail,
                    "Mã xác thực đặt lại mật khẩu - Grand Aurora Luxury Hotel",
                    emailHtml
            );

            // Kiểm tra kết quả gửi email trong tối đa 5 giây (phát hiện lỗi xác thực SMTP ngay, không thông báo thành công giả)
            boolean emailSent;
            try {
                emailSent = sendFuture.get(5, java.util.concurrent.TimeUnit.SECONDS);
            } catch (java.util.concurrent.TimeoutException te) {
                // Nếu mạng SMTP phản hồi chậm hơn 5s, coi như đang xử lý nền và cho phép tiếp tục
                emailSent = true;
                log.warn("[PasswordReset] Gửi email qua SMTP phản hồi chậm (>5s), đang tiếp tục xử lý nền cho email [{}]", normalizedEmail);
            } catch (Exception ex) {
                log.error("[PasswordReset] Lỗi khi chờ kết quả gửi email: {}", ex.getMessage());
                emailSent = false;
            }

            if (!emailSent) {
                // Thu hồi / xóa bản ghi OTP vừa lưu để tránh để lại OTP rác mà người dùng không nhận được
                tokenRepository.delete(resetToken);
                log.error("[PasswordReset] Gửi email OTP thất bại cho [{}] (do lỗi SMTP hoặc xác thực). Đã thu hồi mã OTP.", normalizedEmail);
                throw new AppException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Hệ thống không thể gửi email xác thực vào lúc này do lỗi kết nối dịch vụ thư tín (SMTP Authentication Failed). Quý khách vui lòng thử lại sau ít phút hoặc liên hệ quản trị viên.");
            }

            log.info("[PasswordReset] Đã phát sinh và gửi thành công mã OTP cho email [{}] (hiệu lực {} phút)", normalizedEmail, OTP_EXPIRE_MINUTES);
        } else {
            // Log nội bộ nhưng không tiết lộ cho client
            log.info("[PasswordReset] Yêu cầu OTP cho email không tồn tại hoặc tài khoản bị khóa: [{}]", normalizedEmail);
        }

        return ForgotPasswordResponse.builder()
                .cooldownSeconds(RESEND_COOLDOWN_SECONDS)
                .email(normalizedEmail)
                .build();
    }

    /**
     * Xác thực mã OTP người dùng nhập vào.
     * Nếu hợp lệ -> sinh Reset Token dùng để đổi mật khẩu ở bước tiếp theo.
     */
    @Transactional
    public VerifyOtpResponse verifyOtp(VerifyOtpRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String inputOtp = request.getOtp().trim();

        PasswordResetToken token = tokenRepository.findFirstByEmailAndIsUsedFalseOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Yêu cầu đặt lại mật khẩu không tồn tại hoặc đã hết hạn."));

        // Kiểm tra thời hạn hiệu lực của OTP
        if (LocalDateTime.now().isAfter(token.getOtpExpiresAt())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã OTP đã hết hạn. Vui lòng yêu cầu mã xác minh mới.");
        }

        // Kiểm tra số lần nhập sai
        if (token.getAttempts() >= MAX_OTP_ATTEMPTS) {
            token.setIsUsed(true); // Vô hiệu hóa bản ghi
            tokenRepository.save(token);
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã OTP đã bị khóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.");
        }

        // So khớp hash SHA-256
        String inputHash = hashSha256(inputOtp);
        if (!inputHash.equalsIgnoreCase(token.getOtpHash())) {
            token.setAttempts(token.getAttempts() + 1);
            tokenRepository.save(token);
            int remaining = MAX_OTP_ATTEMPTS - token.getAttempts();
            if (remaining <= 0) {
                token.setIsUsed(true);
                tokenRepository.save(token);
                throw new AppException(HttpStatus.BAD_REQUEST, "Mã OTP đã bị khóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.");
            }
            throw new AppException(HttpStatus.BAD_REQUEST,
                    String.format("Mã OTP không chính xác. Quý khách còn lại %d lần thử.", remaining));
        }

        // OTP đúng -> Sinh Reset Token ngẫu nhiên (UUID) có thời hạn 10 phút
        String resetTokenStr = UUID.randomUUID().toString();
        token.setIsVerified(true);
        token.setResetToken(resetTokenStr);
        token.setTokenExpiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRE_MINUTES));
        tokenRepository.save(token);

        log.info("[PasswordReset] Xác thực OTP thành công cho email [{}]", normalizedEmail);

        return VerifyOtpResponse.builder()
                .resetToken(resetTokenStr)
                .expiresInSeconds(RESET_TOKEN_EXPIRE_MINUTES * 60L)
                .build();
    }

    /**
     * Đặt lại mật khẩu mới bằng Reset Token đã được cấp.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String resetTokenStr = request.getResetToken().trim();
        String newPassword = request.getNewPassword();

        PasswordResetToken token = tokenRepository.findByResetTokenAndIsUsedFalse(resetTokenStr)
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Token đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng."));

        if (!token.getEmail().equalsIgnoreCase(normalizedEmail) || !Boolean.TRUE.equals(token.getIsVerified())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Token đặt lại mật khẩu không khớp với thông tin yêu cầu.");
        }

        if (token.getTokenExpiresAt() == null || LocalDateTime.now().isAfter(token.getTokenExpiresAt())) {
            token.setIsUsed(true);
            tokenRepository.save(token);
            throw new AppException(HttpStatus.BAD_REQUEST, "Token đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu.");
        }

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại trong hệ thống."));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Tài khoản đang bị khóa. Vui lòng liên hệ ban quản trị.");
        }

        // Cập nhật mật khẩu băm BCrypt
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Vô hiệu hóa token (Single-use token)
        token.setIsUsed(true);
        tokenRepository.save(token);

        // Gửi email thông báo đổi mật khẩu thành công
        String successHtml = EmailTemplateHelper.buildPasswordResetSuccessHtml(user.getFullName());
        emailService.sendHtmlEmail(
                normalizedEmail,
                "Mật khẩu tài khoản đã được thay đổi thành công - Grand Aurora Luxury Hotel",
                successHtml
        );

        log.info("[PasswordReset] Đặt lại mật khẩu thành công cho tài khoản [{}]", normalizedEmail);
    }

    /**
     * Băm chuỗi văn bản bằng thuật toán SHA-256.
     */
    private String hashSha256(String plainText) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(plainText.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Hệ thống không hỗ trợ thuật toán băm SHA-256", e);
        }
    }
}

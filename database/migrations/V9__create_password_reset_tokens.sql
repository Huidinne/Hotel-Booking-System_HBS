-- =============================================================================
-- HOTEL BOOKING SYSTEM (MVP) - DATABASE MIGRATION SCRIPT
-- File: V9__create_password_reset_tokens.sql
-- Description: Khởi tạo bảng password_reset_tokens cho chức năng Quên mật khẩu OTP
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(100) NOT NULL,
    `otp_hash` VARCHAR(64) DEFAULT NULL COMMENT 'Mã OTP 6 số băm SHA-256 để bảo mật cơ sở dữ liệu',
    `reset_token` VARCHAR(100) DEFAULT NULL UNIQUE COMMENT 'Token bảo mật cấp sau khi xác minh OTP thành công',
    `attempts` INT NOT NULL DEFAULT 0 COMMENT 'Số lần đã nhập sai OTP (khóa nếu >= 5)',
    `otp_expires_at` DATETIME NOT NULL COMMENT 'Thời hạn hiệu lực của OTP (5 phút sau khi tạo)',
    `token_expires_at` DATETIME DEFAULT NULL COMMENT 'Thời hạn hiệu lực của Reset Token (10 phút sau khi xác minh)',
    `is_verified` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Đã xác minh OTP thành công hay chưa',
    `is_used` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Đã được sử dụng để đổi mật khẩu hay chưa',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_prt_email_status` (`email`, `is_used`, `otp_expires_at`),
    INDEX `idx_prt_reset_token` (`reset_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng lưu trữ mã OTP và token đặt lại mật khẩu người dùng';

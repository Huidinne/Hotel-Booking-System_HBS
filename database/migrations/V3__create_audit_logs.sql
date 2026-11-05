-- =============================================================================
-- HOTEL BOOKING SYSTEM (MVP) - DATABASE MIGRATION SCRIPT
-- File: V3__create_audit_logs.sql
-- Description: Khởi tạo bảng audit_logs lưu vết thao tác hệ thống (SRS §FR-16)
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `actor_id` BIGINT DEFAULT NULL COMMENT 'ID tài khoản thực hiện (NULL nếu là SYSTEM hoặc ANONYMOUS)',
    `actor_email` VARCHAR(100) NOT NULL COMMENT 'Email người thực hiện',
    `actor_role` VARCHAR(30) DEFAULT NULL COMMENT 'Vai trò người thực hiện (ROLE_ADMIN, ROLE_RECEPTIONIST, ROLE_CUSTOMER, SYSTEM)',
    `action` VARCHAR(50) NOT NULL COMMENT 'Hành động nhạy cảm (AuditAction)',
    `target_type` VARCHAR(50) NOT NULL COMMENT 'Đối tượng tác động (BOOKING, ROOM, ROOM_TYPE, PAYMENT, USER)',
    `target_id` VARCHAR(100) DEFAULT NULL COMMENT 'Mã hoặc ID của đối tượng (ví dụ: BK-20261104-001, 101, v.v.)',
    `description` VARCHAR(500) DEFAULT NULL COMMENT 'Mô tả tóm tắt thao tác bằng tiếng Việt',
    `old_values` JSON DEFAULT NULL COMMENT 'Dữ liệu trước thay đổi (JSON, đã mask/loại bỏ dữ liệu nhạy cảm)',
    `new_values` JSON DEFAULT NULL COMMENT 'Dữ liệu sau thay đổi (JSON, đã mask/loại bỏ dữ liệu nhạy cảm)',
    `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'Địa chỉ IP của client (IPv4/IPv6)',
    `user_agent` VARCHAR(255) DEFAULT NULL COMMENT 'User Agent trình duyệt/thiết bị',
    `status` VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' COMMENT 'Trạng thái thực thi: SUCCESS hoặc FAILED',
    `error_message` TEXT DEFAULT NULL COMMENT 'Thông báo lỗi nếu thực thi thất bại',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm ghi nhận log',
    
    INDEX `idx_audit_logs_actor_email` (`actor_email`),
    INDEX `idx_audit_logs_action` (`action`),
    INDEX `idx_audit_logs_target` (`target_type`, `target_id`),
    INDEX `idx_audit_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nhật ký ghi vết thao tác nghiệp vụ và bảo mật (SRS §FR-16)';


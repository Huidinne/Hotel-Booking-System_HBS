-- =============================================================================
-- HOTEL BOOKING SYSTEM (MVP) - DATABASE MIGRATION SCRIPT
-- File: V1__init_schema.sql
-- Description: Khởi tạo cấu trúc bảng chuẩn doanh nghiệp, ràng buộc toàn vẹn
-- Lưu ý: Tuyệt đối KHÔNG sử dụng DROP TABLE trong migration chính thức
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- -----------------------------------------------------------------------------
-- 1. BẢNG USERS (Tài khoản người dùng và phân quyền)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `role` ENUM('ROLE_CUSTOMER', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN') NOT NULL DEFAULT 'ROLE_CUSTOMER',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. BẢNG ROOM_TYPES (Danh mục Loại phòng bán cho khách)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `room_types` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `capacity` INT NOT NULL DEFAULT 2,
    `base_price` DECIMAL(12, 2) NOT NULL,
    `description` TEXT,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_room_types_capacity` CHECK (`capacity` > 0),
    CONSTRAINT `chk_room_types_price` CHECK (`base_price` >= 0),
    INDEX `idx_room_types_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. BẢNG ROOM_TYPE_IMAGES (Hình ảnh loại phòng lưu trên Cloudinary)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `room_type_images` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `room_type_id` BIGINT NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_images_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. BẢNG ROOMS (Phòng vật lý cụ thể trong khách sạn)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rooms` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `room_number` VARCHAR(20) NOT NULL UNIQUE,
    `room_type_id` BIGINT NOT NULL,
    `floor` INT NOT NULL DEFAULT 1,
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_rooms_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_rooms_floor` CHECK (`floor` >= 0),
    INDEX `idx_rooms_type_status` (`room_type_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. BẢNG BOOKINGS (Hợp đồng đặt phòng của khách)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bookings` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `booking_code` VARCHAR(30) NOT NULL UNIQUE,
    `user_id` BIGINT NOT NULL,
    `room_type_id` BIGINT NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `check_in_date` DATE NOT NULL,
    `check_out_date` DATE NOT NULL,
    `price_per_night` DECIMAL(12, 2) NOT NULL COMMENT 'Snapshot đơn giá theo đêm tại thời điểm đặt',
    `total_price` DECIMAL(12, 2) NOT NULL COMMENT 'price_per_night * số đêm * quantity',
    `deposit_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Tiền cọc bắt buộc (50% total_price)',
    `booking_status` ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING',
    `payment_status` ENUM('UNPAID', 'PARTIALLY_PAID', 'FULLY_PAID', 'REFUND_PENDING', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    `hold_expires_at` DATETIME DEFAULT NULL COMMENT 'Mốc hết hạn giữ quota (15 phút với VNPay, 18:00 ngày Check-in với Pay at Hotel)',
    `note` TEXT,
    `cancellation_reason` VARCHAR(255) DEFAULT NULL,
    `cancelled_at` DATETIME DEFAULT NULL,
    `refund_amount` DECIMAL(12, 2) DEFAULT 0.00,
    `bank_name` VARCHAR(100) DEFAULT NULL,
    `bank_account_number` VARCHAR(50) DEFAULT NULL COMMENT 'Che bớt khi hiển thị trên giao diện',
    `bank_account_holder` VARCHAR(100) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bookings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_bookings_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_bookings_dates` CHECK (`check_out_date` > `check_in_date`),
    CONSTRAINT `chk_bookings_quantity` CHECK (`quantity` > 0),
    CONSTRAINT `chk_bookings_price_per_night` CHECK (`price_per_night` >= 0),
    CONSTRAINT `chk_bookings_total_price` CHECK (`total_price` >= 0),
    CONSTRAINT `chk_bookings_deposit_amount` CHECK (`deposit_amount` >= 0),
    CONSTRAINT `chk_bookings_refund_amount` CHECK (`refund_amount` >= 0),
    -- Composite Index tối ưu hóa truy vấn kiểm tra Overbooking & Concurrency
    INDEX `idx_bookings_concurrency` (`room_type_id`, `booking_status`, `check_in_date`, `check_out_date`, `hold_expires_at`),
    INDEX `idx_bookings_user_status` (`user_id`, `booking_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. BẢNG BOOKING_ROOMS (Gán phòng vật lý khi Lễ tân làm thủ tục Check-in)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `booking_rooms` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` BIGINT NOT NULL,
    `room_id` BIGINT NOT NULL COMMENT 'Phòng vật lý được phân bổ lúc Check-in',
    `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `assigned_by` BIGINT DEFAULT NULL COMMENT 'ID của Lễ tân thực hiện gán phòng',
    CONSTRAINT `fk_booking_rooms_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_booking_rooms_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_booking_rooms_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    -- Mỗi phòng vật lý chỉ được gán tối đa 1 lần cho cùng 1 booking
    UNIQUE KEY `uk_booking_room` (`booking_id`, `room_id`),
    INDEX `idx_br_room_id` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. BẢNG PAYMENT_TRANSACTIONS (Lịch sử từng giao dịch thanh toán)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_transactions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` BIGINT NOT NULL,
    `transaction_code` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Mã giao dịch nội bộ sinh ra khi bắt đầu thanh toán (vnp_TxnRef)',
    `vnp_transaction_no` VARCHAR(100) DEFAULT NULL UNIQUE COMMENT 'Mã giao dịch duy nhất từ cổng VNPay để chống xử lý trùng lặp IPN',
    `amount` DECIMAL(12, 2) NOT NULL,
    `payment_method` ENUM('VNPAY', 'CASH', 'BANK_TRANSFER') NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `response_code` VARCHAR(20) DEFAULT NULL,
    `transaction_time` DATETIME DEFAULT NULL,
    `expires_at` DATETIME DEFAULT NULL COMMENT 'Thời hạn thanh toán giao dịch online (created_at + 15 phút)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_transactions_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_trans_amount` CHECK (`amount` > 0),
    INDEX `idx_trans_booking_status` (`booking_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

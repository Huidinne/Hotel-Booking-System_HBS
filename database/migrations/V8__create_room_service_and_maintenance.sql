-- =============================================================================
-- HOTEL BOOKING SYSTEM (MVP) - DATABASE MIGRATION SCRIPT
-- File: V8__create_room_service_and_maintenance.sql
-- Description: [SP4-1116-ANH] Dịch vụ phòng (Room Service) & Phiếu sự cố buồng phòng (FR-21)
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- -----------------------------------------------------------------------------
-- 1. BẢNG service_items: Danh mục món ăn, đồ uống, minibar
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `service_items` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL COMMENT 'Tên món ăn / đồ uống / dịch vụ',
    `category` VARCHAR(50) NOT NULL COMMENT 'Phân loại: FOOD, BEVERAGE, SNACK, MINIBAR, OTHER',
    `unit` VARCHAR(30) NOT NULL COMMENT 'Đơn vị tính: Đĩa, Bát, Ly, Chai, Lon, Phần, Gói...',
    `price` DECIMAL(12, 2) NOT NULL COMMENT 'Đơn giá nguyên VND không âm',
    `image_url` VARCHAR(1000) DEFAULT NULL COMMENT 'Đường dẫn ảnh minh họa món ăn',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Trạng thái đang bán (true) hoặc ngừng bán (false)',
    `version` BIGINT NOT NULL DEFAULT 0 COMMENT 'Khóa lạc quan Optimistic Locking',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_service_items_active_cat` (`is_active`, `category`),
    INDEX `idx_service_items_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục món ăn đồ uống dịch vụ phòng';

-- -----------------------------------------------------------------------------
-- 2. BẢNG room_service_orders: Đơn gọi dịch vụ buồng phòng theo BookingRoom
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `room_service_orders` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` BIGINT NOT NULL COMMENT 'ID của booking đặt phòng',
    `booking_room_id` BIGINT NOT NULL COMMENT 'ID phòng vật lý được gán trong booking (booking_rooms)',
    `order_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã đơn dạng RSO-YYYYMMDD-XXXX',
    `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, PREPARING, DELIVERED, CANCELLED',
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Tổng tiền đơn dịch vụ phòng',
    `note` VARCHAR(500) DEFAULT NULL COMMENT 'Ghi chú phục vụ của khách hoặc lễ tân',
    `cancel_reason` VARCHAR(500) DEFAULT NULL COMMENT 'Lý do hủy bắt buộc khi đơn bị CANCELLED',
    `cancelled_by` VARCHAR(100) DEFAULT NULL COMMENT 'Email người thực hiện hủy đơn',
    `delivered_at` DATETIME DEFAULT NULL COMMENT 'Thời điểm phục vụ giao món thành công',
    `idempotency_key` VARCHAR(128) DEFAULT NULL COMMENT 'Khóa chống lặp đơn do retry / double-click',
    `created_by` VARCHAR(100) DEFAULT NULL COMMENT 'Email nhân viên lập đơn',
    `version` BIGINT NOT NULL DEFAULT 0 COMMENT 'Khóa lạc quan Optimistic Locking',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_rso_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rso_booking_room` FOREIGN KEY (`booking_room_id`) REFERENCES `booking_rooms` (`id`) ON DELETE CASCADE,
    INDEX `idx_rso_booking_status` (`booking_id`, `status`),
    INDEX `idx_rso_room_status` (`booking_room_id`, `status`),
    INDEX `idx_rso_idempotency` (`idempotency_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Đơn đặt dịch vụ buồng phòng';

-- -----------------------------------------------------------------------------
-- 3. BẢNG room_service_order_items: Chi tiết món trong đơn kèm Snapshot bất biến
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `room_service_order_items` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `order_id` BIGINT NOT NULL COMMENT 'ID đơn dịch vụ phòng',
    `service_item_id` BIGINT NOT NULL COMMENT 'ID danh mục món ăn đồ uống',
    `name_snapshot` VARCHAR(150) NOT NULL COMMENT 'Snapshot tên món tại thời điểm gọi',
    `unit_snapshot` VARCHAR(30) NOT NULL COMMENT 'Snapshot đơn vị tính tại thời điểm gọi',
    `unit_price_snapshot` DECIMAL(12, 2) NOT NULL COMMENT 'Snapshot đơn giá bất biến tại thời điểm đặt',
    `quantity` INT NOT NULL COMMENT 'Số lượng đặt (> 0)',
    `line_total` DECIMAL(12, 2) NOT NULL COMMENT 'Thành tiền = đơn giá snapshot * số lượng',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_rsoi_order` FOREIGN KEY (`order_id`) REFERENCES `room_service_orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rsoi_service_item` FOREIGN KEY (`service_item_id`) REFERENCES `service_items` (`id`),
    CONSTRAINT `uk_rso_item` UNIQUE (`order_id`, `service_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiết từng món trong đơn dịch vụ phòng';

-- -----------------------------------------------------------------------------
-- 4. BẢNG maintenance_requests: Phiếu sự cố kỹ thuật buồng phòng
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `maintenance_requests` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` BIGINT NOT NULL COMMENT 'ID booking đang lưu trú tại thời điểm phát sinh',
    `booking_room_id` BIGINT NOT NULL COMMENT 'ID gán phòng cụ thể',
    `room_id` BIGINT NOT NULL COMMENT 'ID phòng vật lý phát sinh sự cố',
    `request_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã phiếu dạng MR-YYYYMMDD-XXXX',
    `description` VARCHAR(1000) NOT NULL COMMENT 'Mô tả chi tiết sự cố cần sửa chữa',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'NORMAL' COMMENT 'Mức ưu tiên: LOW, NORMAL, HIGH, URGENT',
    `status` VARCHAR(30) NOT NULL DEFAULT 'OPEN' COMMENT 'OPEN, IN_PROGRESS, RESOLVED, CANCELLED',
    `blocks_resale` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Cờ chặn phòng trở lại AVAILABLE sau checkout nếu chưa xử lý xong',
    `resolution_note` VARCHAR(1000) DEFAULT NULL COMMENT 'Ghi chú kết quả xử lý kỹ thuật (bắt buộc khi RESOLVED)',
    `cancel_reason` VARCHAR(500) DEFAULT NULL COMMENT 'Lý do hủy phiếu bảo trì',
    `resolved_at` DATETIME DEFAULT NULL COMMENT 'Thời điểm kỹ thuật viên xử lý hoàn tất',
    `created_by` VARCHAR(100) DEFAULT NULL COMMENT 'Email nhân viên lập phiếu',
    `resolved_by` VARCHAR(100) DEFAULT NULL COMMENT 'Email nhân viên xác nhận hoàn tất',
    `idempotency_key` VARCHAR(128) DEFAULT NULL COMMENT 'Khóa chống lặp phiếu sự cố',
    `version` BIGINT NOT NULL DEFAULT 0 COMMENT 'Khóa lạc quan Optimistic Locking',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_mr_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_mr_booking_room` FOREIGN KEY (`booking_room_id`) REFERENCES `booking_rooms` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_mr_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
    INDEX `idx_mr_room_status` (`room_id`, `status`),
    INDEX `idx_mr_booking_status` (`booking_id`, `status`),
    INDEX `idx_mr_blocks_resale` (`blocks_resale`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phiếu yêu cầu bảo trì sự cố buồng phòng';

-- -----------------------------------------------------------------------------
-- 5. SEED DỮ LIỆU DANH MỤC MÓN ĂN & ĐỒ UỐNG (Grand Aurora Luxury Hotel)
-- -----------------------------------------------------------------------------
INSERT INTO `service_items` (`id`, `name`, `category`, `unit`, `price`, `image_url`, `is_active`, `version`) VALUES
(1, 'Phở Bò Wagyu Thượng Hạng', 'FOOD', 'Bát', 180000.00, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600', 1, 0),
(2, 'Bò Bít Tết Úc Sốt Tiêu Đen', 'FOOD', 'Đĩa', 350000.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600', 1, 0),
(3, 'Cơm Chiên Hải Sản Hoàng Kim', 'FOOD', 'Đĩa', 160000.00, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600', 1, 0),
(4, 'Bánh Mì Kẹp Thịt Xông Khói & Phô Mai', 'FOOD', 'Phần', 95000.00, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600', 1, 0),
(5, 'Mì Ý Carbonara Kem Nấm Tươi', 'FOOD', 'Đĩa', 145000.00, 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600', 1, 0),
(6, 'Nước Ép Cam Tươi Nguyên Chất', 'BEVERAGE', 'Ly', 55000.00, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600', 1, 0),
(7, 'Cà Phê Muối Hoàng Gia', 'BEVERAGE', 'Ly', 45000.00, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600', 1, 0),
(8, 'Trà Đào Cam Sả Thượng Hạng', 'BEVERAGE', 'Ly', 50000.00, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600', 1, 0),
(9, 'Bia Thủ Công Grand Aurora IPA', 'BEVERAGE', 'Chai', 65000.00, 'https://images.unsplash.com/photo-1608270199049-74d3d2cb098f?w=600', 1, 0),
(10, 'Rượu Vang Đỏ Cabernet Sauvignon', 'BEVERAGE', 'Chai', 650000.00, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600', 1, 0),
(11, 'Hạt Điều Rang Muối Minibar', 'MINIBAR', 'Gói', 45000.00, 'https://images.unsplash.com/photo-1536591375315-0b81e4b85c54?w=600', 1, 0),
(12, 'Khoai Tây Chiên Giòn Rụm', 'SNACK', 'Đĩa', 60000.00, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600', 1, 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price` = VALUES(`price`);

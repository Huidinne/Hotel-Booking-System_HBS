-- =============================================================================
-- HOTEL BOOKING SYSTEM (MVP) - SEED DATA SCRIPT
-- File: V2__seed_data.sql
-- Description: Dữ liệu mẫu phục vụ kiểm thử và trình diễn demo (Testing/Demo Only)
-- CẢNH BÁO: Mật khẩu mặc định 'Password@123' chỉ dùng cho môi trường Demo/Test!
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- -----------------------------------------------------------------------------
-- 1. SEED USERS (Mật khẩu hash BCrypt: 'Password@123')
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `phone`, `role`, `is_active`) VALUES
                                                                                               (1, 'admin@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Quản Trị Viên', '0901234567', 'ROLE_ADMIN', TRUE),
                                                                                               (2, 'receptionist@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Lễ Tân Khách Sạn', '0912345678', 'ROLE_RECEPTIONIST', TRUE),
                                                                                               (3, 'customer@gmail.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Nguyễn Văn Khách', '0987654321', 'ROLE_CUSTOMER', TRUE),
                                                                                               (4, 'tranvanb@gmail.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Trần Văn Bình', '0933445566', 'ROLE_CUSTOMER', TRUE)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- -----------------------------------------------------------------------------
-- 2. SEED ROOM_TYPES
-- -----------------------------------------------------------------------------
INSERT INTO `room_types` (`id`, `name`, `capacity`, `base_price`, `description`, `amenities`, `is_active`) VALUES
                                                                                                               (1, 'Standard Single Room', 1, 500000.00, 'Phòng tiêu chuẩn 1 giường đơn, máy lạnh, wifi tốc độ cao, nước nóng lạnh.', 'WiFi, Máy lạnh, Nước nóng lạnh', TRUE),
                                                                                                               (2, 'Deluxe Double Room', 2, 950000.00, 'Phòng Deluxe 1 giường đôi lớn, ban công hướng phố thoáng mát, bàn làm việc cao cấp.', 'WiFi, Ban công hướng phố, Bàn làm việc, Smart TV', TRUE),
                                                                                                               (3, 'Executive Suite Luxury', 4, 1800000.00, 'Căn hộ Suite sang trọng 2 phòng ngủ, bồn tắm nằm cao cấp, tầm nhìn toàn cảnh thành phố.', 'WiFi, Bồn tắm nằm, Tầm nhìn toàn cảnh, Phòng khách riêng, Minibar', TRUE)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- -----------------------------------------------------------------------------
-- 3. SEED ROOM_TYPE_IMAGES
-- -----------------------------------------------------------------------------
INSERT INTO `room_type_images` (`id`, `room_type_id`, `image_url`, `is_primary`) VALUES
                                                                                     (1, 1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80', TRUE),
                                                                                     (2, 2, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80', TRUE),
                                                                                     (3, 3, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80', TRUE)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- -----------------------------------------------------------------------------
-- 4. SEED ROOMS (10 phòng vật lý phân bổ theo các tầng)
-- -----------------------------------------------------------------------------
INSERT INTO `rooms` (`id`, `room_number`, `room_type_id`, `floor`, `status`) VALUES
                                                                                 (1, '101', 1, 1, 'OCCUPIED'),
                                                                                 (2, '102', 1, 1, 'OCCUPIED'),
                                                                                 (3, '103', 1, 1, 'AVAILABLE'),
                                                                                 (4, '201', 2, 2, 'AVAILABLE'),
                                                                                 (5, '202', 2, 2, 'AVAILABLE'),
                                                                                 (6, '203', 2, 2, 'AVAILABLE'),
                                                                                 (7, '204', 2, 2, 'AVAILABLE'),
                                                                                 (8, '301', 3, 3, 'AVAILABLE'),
                                                                                 (9, '302', 3, 3, 'AVAILABLE'),
                                                                                 (10, '303', 3, 3, 'MAINTENANCE')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- -----------------------------------------------------------------------------
-- 5. SEED BOOKINGS MẪU (Đầy đủ các kịch bản trạng thái nhất quán)
-- -----------------------------------------------------------------------------
-- Đơn 1: CHECKED_IN (Khách đặt 2 phòng Standard Single từ 2026-10-18 đến 2026-10-21, đã nhận phòng 101 và 102)
INSERT INTO `bookings` (`id`, `booking_code`, `user_id`, `room_type_id`, `quantity`, `guests`, `payment_method`, `check_in_date`, `check_out_date`, `price_per_night`, `total_price`, `deposit_amount`, `booking_status`, `payment_status`, `hold_expires_at`, `note`) VALUES
    (1, 'BK-20261018-001', 3, 1, 2, 2, 'VNPAY', '2026-10-18', '2026-10-21', 500000.00, 3000000.00, 1500000.00, 'CHECKED_IN', 'PARTIALLY_PAID', NULL, 'Khách đến nhận phòng lúc 14:30')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Gán phòng 101 và 102 cho đơn CHECKED_IN số 1
INSERT INTO `booking_rooms` (`id`, `booking_id`, `room_id`, `assigned_at`, `assigned_by`) VALUES
                                                                                              (1, 1, 1, '2026-10-18 14:30:00', 2),
                                                                                              (2, 1, 2, '2026-10-18 14:30:00', 2)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Giao dịch cọc VNPay 1,500,000 VND cho đơn 1
INSERT INTO `payment_transactions` (`id`, `booking_id`, `transaction_code`, `vnp_transaction_no`, `amount`, `payment_method`, `status`, `response_code`, `transaction_time`) VALUES
    (1, 1, 'TXN-20261018-001', 'VNP-14567890', 1500000.00, 'VNPAY', 'SUCCESS', '00', '2026-10-18 10:15:00')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Đơn 2: CONFIRMED (Khách đặt 1 phòng Deluxe Double cho tuần tới, đã cọc 50% qua VNPay)
INSERT INTO `bookings` (`id`, `booking_code`, `user_id`, `room_type_id`, `quantity`, `guests`, `payment_method`, `check_in_date`, `check_out_date`, `price_per_night`, `total_price`, `deposit_amount`, `booking_status`, `payment_status`, `hold_expires_at`, `note`) VALUES
    (2, 'BK-20261025-002', 4, 2, 1, 2, 'VNPAY', '2026-10-25', '2026-10-27', 950000.00, 1900000.00, 950000.00, 'CONFIRMED', 'PARTIALLY_PAID', NULL, 'Cần chuẩn bị phòng tầng cao, yên tĩnh')
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `payment_transactions` (`id`, `booking_id`, `transaction_code`, `vnp_transaction_no`, `amount`, `payment_method`, `status`, `response_code`, `transaction_time`) VALUES
    (2, 2, 'TXN-20261020-002', 'VNP-14567999', 950000.00, 'VNPAY', 'SUCCESS', '00', '2026-10-19 09:00:00')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Đơn 3: PENDING (Khách đặt 1 phòng Deluxe Double chọn trả sau tại khách sạn, giữ phòng đến 18:00 ngày nhận phòng)
INSERT INTO `bookings` (`id`, `booking_code`, `user_id`, `room_type_id`, `quantity`, `guests`, `payment_method`, `check_in_date`, `check_out_date`, `price_per_night`, `total_price`, `deposit_amount`, `booking_status`, `payment_status`, `hold_expires_at`, `note`) VALUES
    (3, 'BK-20261028-003', 3, 2, 1, 2, 'CASH', '2026-10-28', '2026-10-29', 950000.00, 950000.00, 0.00, 'PENDING', 'UNPAID', '2026-10-28 18:00:00', 'Thanh toán tiền mặt khi nhận phòng')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Đơn 4: CHECKED_OUT (Khách đã hoàn tất lưu trú và tất toán 100% hóa đơn)
INSERT INTO `bookings` (`id`, `booking_code`, `user_id`, `room_type_id`, `quantity`, `guests`, `payment_method`, `check_in_date`, `check_out_date`, `price_per_night`, `total_price`, `deposit_amount`, `booking_status`, `payment_status`, `hold_expires_at`, `note`) VALUES
    (4, 'BK-20261010-004', 4, 3, 1, 2, 'VNPAY', '2026-10-10', '2026-10-12', 1800000.00, 3600000.00, 1800000.00, 'CHECKED_OUT', 'FULLY_PAID', NULL, 'Đã thanh toán đủ tiền phòng và phụ phí')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Giao dịch cọc 1,800,000 VND và giao dịch tất toán 1,800,000 VND tiền mặt tại quầy
INSERT INTO `payment_transactions` (`id`, `booking_id`, `transaction_code`, `vnp_transaction_no`, `amount`, `payment_method`, `status`, `response_code`, `transaction_time`) VALUES
                                                                                                                                                                                 (3, 4, 'TXN-20261008-003', 'VNP-14566001', 1800000.00, 'VNPAY', 'SUCCESS', '00', '2026-10-08 14:00:00'),
                                                                                                                                                                                 (4, 4, 'TXN-20261012-004', NULL, 1800000.00, 'CASH', 'SUCCESS', '00', '2026-10-12 11:30:00')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Đơn 5: CANCELLED (Khách đặt phòng Suite hủy trước 24h, được hoàn lại 100% tiền cọc, đã hoàn tất chuyển khoản)
INSERT INTO `bookings` (`id`, `booking_code`, `user_id`, `room_type_id`, `quantity`, `guests`, `payment_method`, `check_in_date`, `check_out_date`, `price_per_night`, `total_price`, `deposit_amount`, `booking_status`, `payment_status`, `refund_amount`, `bank_name`, `bank_account_number`, `bank_account_holder`, `cancelled_at`, `cancellation_reason`) VALUES
    (5, 'BK-20261015-005', 3, 3, 1, 2, 'VNPAY', '2026-10-22', '2026-10-24', 1800000.00, 3600000.00, 1800000.00, 'CANCELLED', 'REFUNDED', 1800000.00, 'Vietcombank', '0071001234567', 'NGUYEN VAN KHACH', '2026-10-19 10:00:00', 'Bận công tác đột xuất')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Đơn 6: NO_SHOW (Khách cọc nhưng không đến nhận phòng, khách sạn giữ lại 100% tiền cọc)
INSERT INTO `bookings` (`id`, `booking_code`, `user_id`, `room_type_id`, `quantity`, `guests`, `payment_method`, `check_in_date`, `check_out_date`, `price_per_night`, `total_price`, `deposit_amount`, `booking_status`, `payment_status`, `hold_expires_at`, `note`) VALUES
    (6, 'BK-20261014-006', 4, 1, 1, 1, 'VNPAY', '2026-10-14', '2026-10-15', 500000.00, 500000.00, 250000.00, 'NO_SHOW', 'PARTIALLY_PAID', NULL, 'Khách không đến nhận phòng và không liên lạc')
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `payment_transactions` (`id`, `booking_id`, `transaction_code`, `vnp_transaction_no`, `amount`, `payment_method`, `status`, `response_code`, `transaction_time`) VALUES
    (5, 6, 'TXN-20261012-005', 'VNP-14567111', 250000.00, 'VNPAY', 'SUCCESS', '00', '2026-10-12 16:00:00')
ON DUPLICATE KEY UPDATE `id` = `id`;
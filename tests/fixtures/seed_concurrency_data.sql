-- =============================================================================
-- HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
-- File: tests/fixtures/seed_concurrency_data.sql
-- Purpose: Seed dữ liệu kiểm thử tải và tranh chấp phòng đồng thời (Concurrency Test)
-- Mô tả: Khởi tạo đúng 1 phòng vật lý duy nhất cho loại phòng test (id = 99)
--        và 10 tài khoản khách hàng độc lập để giả lập tranh chấp đặt phòng.
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- -----------------------------------------------------------------------------
-- 1. SEED ROOM TYPE DÀNH RIÊNG CHO CONCURRENCY TEST (ID = 99)
-- -----------------------------------------------------------------------------
INSERT INTO `room_types` (`id`, `name`, `capacity`, `base_price`, `description`, `amenities`, `is_active`)
VALUES (99, 'Single Concurrency Test Suite', 2, 1200000.00, 'Phòng thử nghiệm tranh chấp đồng thời - Chỉ có đúng 1 phòng duy nhất', 'WiFi, Điều hòa, Smart TV, Minibar', TRUE)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `capacity` = VALUES(`capacity`),
    `base_price` = VALUES(`base_price`),
    `is_active` = TRUE;

-- -----------------------------------------------------------------------------
-- 2. SEED ĐÚNG 1 SUẤT PHÒNG VẬT LÝ DUY NHẤT (ID = 991, Room 991)
-- -----------------------------------------------------------------------------
INSERT INTO `rooms` (`id`, `room_number`, `room_type_id`, `floor`, `status`)
VALUES (991, '991', 99, 9, 'AVAILABLE')
ON DUPLICATE KEY UPDATE
    `room_type_id` = 99,
    `floor` = 9,
    `status` = 'AVAILABLE';

-- -----------------------------------------------------------------------------
-- 3. SEED 10 TÀI KHOẢN KHÁCH HÀNG TEST ĐỘC LẬP
-- Mật khẩu mặc định: 'Password@123' (Hash BCrypt $2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm)
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `phone`, `role`, `is_active`) VALUES
(901, 'concurrency_user1@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 01', '0909000901', 'ROLE_CUSTOMER', TRUE),
(902, 'concurrency_user2@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 02', '0909000902', 'ROLE_CUSTOMER', TRUE),
(903, 'concurrency_user3@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 03', '0909000903', 'ROLE_CUSTOMER', TRUE),
(904, 'concurrency_user4@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 04', '0909000904', 'ROLE_CUSTOMER', TRUE),
(905, 'concurrency_user5@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 05', '0909000905', 'ROLE_CUSTOMER', TRUE),
(906, 'concurrency_user6@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 06', '0909000906', 'ROLE_CUSTOMER', TRUE),
(907, 'concurrency_user7@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 07', '0909000907', 'ROLE_CUSTOMER', TRUE),
(908, 'concurrency_user8@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 08', '0909000908', 'ROLE_CUSTOMER', TRUE),
(909, 'concurrency_user9@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 09', '0909000909', 'ROLE_CUSTOMER', TRUE),
(910, 'concurrency_user10@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 10', '0909000910', 'ROLE_CUSTOMER', TRUE)
ON DUPLICATE KEY UPDATE
    `password` = VALUES(`password`),
    `full_name` = VALUES(`full_name`),
    `role` = 'ROLE_CUSTOMER',
    `is_active` = TRUE;


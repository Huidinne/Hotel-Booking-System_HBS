-- =============================================================================
-- HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
-- Task: [SP2-QA-01]
-- File: tests/fixtures/seed_concurrency_data.sql
-- Purpose: Seed dữ liệu kiểm thử tải và tranh chấp phòng đồng thời (Concurrency Test)
-- Mô tả: Khởi tạo đúng 1 phòng vật lý duy nhất cho loại phòng test (id = 99)
--        và 100 tài khoản khách hàng độc lập để giả lập tranh chấp đặt phòng.
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
-- 3. SEED 100 TÀI KHOẢN KHÁCH HÀNG TEST ĐỘC LẬP
-- Mật khẩu mặc định: 'Password@123' (Hash BCrypt $2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm)
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `phone`, `role`, `is_active`) VALUES(901, 'concurrency_user1@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 01', '0909901', 'ROLE_CUSTOMER', TRUE),
(902, 'concurrency_user2@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 02', '0909902', 'ROLE_CUSTOMER', TRUE),
(903, 'concurrency_user3@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 03', '0909903', 'ROLE_CUSTOMER', TRUE),
(904, 'concurrency_user4@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 04', '0909904', 'ROLE_CUSTOMER', TRUE),
(905, 'concurrency_user5@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 05', '0909905', 'ROLE_CUSTOMER', TRUE),
(906, 'concurrency_user6@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 06', '0909906', 'ROLE_CUSTOMER', TRUE),
(907, 'concurrency_user7@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 07', '0909907', 'ROLE_CUSTOMER', TRUE),
(908, 'concurrency_user8@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 08', '0909908', 'ROLE_CUSTOMER', TRUE),
(909, 'concurrency_user9@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 09', '0909909', 'ROLE_CUSTOMER', TRUE),
(910, 'concurrency_user10@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 10', '0909910', 'ROLE_CUSTOMER', TRUE),
(911, 'concurrency_user11@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 11', '0909911', 'ROLE_CUSTOMER', TRUE),
(912, 'concurrency_user12@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 12', '0909912', 'ROLE_CUSTOMER', TRUE),
(913, 'concurrency_user13@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 13', '0909913', 'ROLE_CUSTOMER', TRUE),
(914, 'concurrency_user14@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 14', '0909914', 'ROLE_CUSTOMER', TRUE),
(915, 'concurrency_user15@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 15', '0909915', 'ROLE_CUSTOMER', TRUE),
(916, 'concurrency_user16@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 16', '0909916', 'ROLE_CUSTOMER', TRUE),
(917, 'concurrency_user17@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 17', '0909917', 'ROLE_CUSTOMER', TRUE),
(918, 'concurrency_user18@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 18', '0909918', 'ROLE_CUSTOMER', TRUE),
(919, 'concurrency_user19@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 19', '0909919', 'ROLE_CUSTOMER', TRUE),
(920, 'concurrency_user20@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 20', '0909920', 'ROLE_CUSTOMER', TRUE),
(921, 'concurrency_user21@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 21', '0909921', 'ROLE_CUSTOMER', TRUE),
(922, 'concurrency_user22@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 22', '0909922', 'ROLE_CUSTOMER', TRUE),
(923, 'concurrency_user23@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 23', '0909923', 'ROLE_CUSTOMER', TRUE),
(924, 'concurrency_user24@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 24', '0909924', 'ROLE_CUSTOMER', TRUE),
(925, 'concurrency_user25@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 25', '0909925', 'ROLE_CUSTOMER', TRUE),
(926, 'concurrency_user26@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 26', '0909926', 'ROLE_CUSTOMER', TRUE),
(927, 'concurrency_user27@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 27', '0909927', 'ROLE_CUSTOMER', TRUE),
(928, 'concurrency_user28@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 28', '0909928', 'ROLE_CUSTOMER', TRUE),
(929, 'concurrency_user29@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 29', '0909929', 'ROLE_CUSTOMER', TRUE),
(930, 'concurrency_user30@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 30', '0909930', 'ROLE_CUSTOMER', TRUE),
(931, 'concurrency_user31@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 31', '0909931', 'ROLE_CUSTOMER', TRUE),
(932, 'concurrency_user32@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 32', '0909932', 'ROLE_CUSTOMER', TRUE),
(933, 'concurrency_user33@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 33', '0909933', 'ROLE_CUSTOMER', TRUE),
(934, 'concurrency_user34@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 34', '0909934', 'ROLE_CUSTOMER', TRUE),
(935, 'concurrency_user35@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 35', '0909935', 'ROLE_CUSTOMER', TRUE),
(936, 'concurrency_user36@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 36', '0909936', 'ROLE_CUSTOMER', TRUE),
(937, 'concurrency_user37@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 37', '0909937', 'ROLE_CUSTOMER', TRUE),
(938, 'concurrency_user38@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 38', '0909938', 'ROLE_CUSTOMER', TRUE),
(939, 'concurrency_user39@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 39', '0909939', 'ROLE_CUSTOMER', TRUE),
(940, 'concurrency_user40@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 40', '0909940', 'ROLE_CUSTOMER', TRUE),
(941, 'concurrency_user41@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 41', '0909941', 'ROLE_CUSTOMER', TRUE),
(942, 'concurrency_user42@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 42', '0909942', 'ROLE_CUSTOMER', TRUE),
(943, 'concurrency_user43@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 43', '0909943', 'ROLE_CUSTOMER', TRUE),
(944, 'concurrency_user44@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 44', '0909944', 'ROLE_CUSTOMER', TRUE),
(945, 'concurrency_user45@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 45', '0909945', 'ROLE_CUSTOMER', TRUE),
(946, 'concurrency_user46@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 46', '0909946', 'ROLE_CUSTOMER', TRUE),
(947, 'concurrency_user47@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 47', '0909947', 'ROLE_CUSTOMER', TRUE),
(948, 'concurrency_user48@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 48', '0909948', 'ROLE_CUSTOMER', TRUE),
(949, 'concurrency_user49@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 49', '0909949', 'ROLE_CUSTOMER', TRUE),
(950, 'concurrency_user50@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 50', '0909950', 'ROLE_CUSTOMER', TRUE),
(951, 'concurrency_user51@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 51', '0909951', 'ROLE_CUSTOMER', TRUE),
(952, 'concurrency_user52@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 52', '0909952', 'ROLE_CUSTOMER', TRUE),
(953, 'concurrency_user53@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 53', '0909953', 'ROLE_CUSTOMER', TRUE),
(954, 'concurrency_user54@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 54', '0909954', 'ROLE_CUSTOMER', TRUE),
(955, 'concurrency_user55@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 55', '0909955', 'ROLE_CUSTOMER', TRUE),
(956, 'concurrency_user56@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 56', '0909956', 'ROLE_CUSTOMER', TRUE),
(957, 'concurrency_user57@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 57', '0909957', 'ROLE_CUSTOMER', TRUE),
(958, 'concurrency_user58@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 58', '0909958', 'ROLE_CUSTOMER', TRUE),
(959, 'concurrency_user59@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 59', '0909959', 'ROLE_CUSTOMER', TRUE),
(960, 'concurrency_user60@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 60', '0909960', 'ROLE_CUSTOMER', TRUE),
(961, 'concurrency_user61@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 61', '0909961', 'ROLE_CUSTOMER', TRUE),
(962, 'concurrency_user62@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 62', '0909962', 'ROLE_CUSTOMER', TRUE),
(963, 'concurrency_user63@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 63', '0909963', 'ROLE_CUSTOMER', TRUE),
(964, 'concurrency_user64@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 64', '0909964', 'ROLE_CUSTOMER', TRUE),
(965, 'concurrency_user65@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 65', '0909965', 'ROLE_CUSTOMER', TRUE),
(966, 'concurrency_user66@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 66', '0909966', 'ROLE_CUSTOMER', TRUE),
(967, 'concurrency_user67@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 67', '0909967', 'ROLE_CUSTOMER', TRUE),
(968, 'concurrency_user68@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 68', '0909968', 'ROLE_CUSTOMER', TRUE),
(969, 'concurrency_user69@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 69', '0909969', 'ROLE_CUSTOMER', TRUE),
(970, 'concurrency_user70@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 70', '0909970', 'ROLE_CUSTOMER', TRUE),
(971, 'concurrency_user71@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 71', '0909971', 'ROLE_CUSTOMER', TRUE),
(972, 'concurrency_user72@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 72', '0909972', 'ROLE_CUSTOMER', TRUE),
(973, 'concurrency_user73@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 73', '0909973', 'ROLE_CUSTOMER', TRUE),
(974, 'concurrency_user74@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 74', '0909974', 'ROLE_CUSTOMER', TRUE),
(975, 'concurrency_user75@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 75', '0909975', 'ROLE_CUSTOMER', TRUE),
(976, 'concurrency_user76@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 76', '0909976', 'ROLE_CUSTOMER', TRUE),
(977, 'concurrency_user77@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 77', '0909977', 'ROLE_CUSTOMER', TRUE),
(978, 'concurrency_user78@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 78', '0909978', 'ROLE_CUSTOMER', TRUE),
(979, 'concurrency_user79@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 79', '0909979', 'ROLE_CUSTOMER', TRUE),
(980, 'concurrency_user80@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 80', '0909980', 'ROLE_CUSTOMER', TRUE),
(981, 'concurrency_user81@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 81', '0909981', 'ROLE_CUSTOMER', TRUE),
(982, 'concurrency_user82@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 82', '0909982', 'ROLE_CUSTOMER', TRUE),
(983, 'concurrency_user83@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 83', '0909983', 'ROLE_CUSTOMER', TRUE),
(984, 'concurrency_user84@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 84', '0909984', 'ROLE_CUSTOMER', TRUE),
(985, 'concurrency_user85@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 85', '0909985', 'ROLE_CUSTOMER', TRUE),
(986, 'concurrency_user86@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 86', '0909986', 'ROLE_CUSTOMER', TRUE),
(987, 'concurrency_user87@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 87', '0909987', 'ROLE_CUSTOMER', TRUE),
(988, 'concurrency_user88@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 88', '0909988', 'ROLE_CUSTOMER', TRUE),
(989, 'concurrency_user89@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 89', '0909989', 'ROLE_CUSTOMER', TRUE),
(990, 'concurrency_user90@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 90', '0909990', 'ROLE_CUSTOMER', TRUE),
(991, 'concurrency_user91@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 91', '0909991', 'ROLE_CUSTOMER', TRUE),
(992, 'concurrency_user92@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 92', '0909992', 'ROLE_CUSTOMER', TRUE),
(993, 'concurrency_user93@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 93', '0909993', 'ROLE_CUSTOMER', TRUE),
(994, 'concurrency_user94@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 94', '0909994', 'ROLE_CUSTOMER', TRUE),
(995, 'concurrency_user95@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 95', '0909995', 'ROLE_CUSTOMER', TRUE),
(996, 'concurrency_user96@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 96', '0909996', 'ROLE_CUSTOMER', TRUE),
(997, 'concurrency_user97@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 97', '0909997', 'ROLE_CUSTOMER', TRUE),
(998, 'concurrency_user98@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 98', '0909998', 'ROLE_CUSTOMER', TRUE),
(999, 'concurrency_user99@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 99', '0909999', 'ROLE_CUSTOMER', TRUE),
(1000, 'concurrency_user100@hotel.com', '$2a$10$UmFALFoLAiBtNvtFaV3y7umSIYYCboBkBx1XPftq9c1Hyw1qIsjdm', 'Tester Concurrency 100', '09091000', 'ROLE_CUSTOMER', TRUE)
ON DUPLICATE KEY UPDATE
    password = VALUES(password),
    ull_name = VALUES(ull_name),
    ole = 'ROLE_CUSTOMER',
    is_active = TRUE;
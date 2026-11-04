-- =============================================================================
-- HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
-- File: tests/fixtures/reset_concurrency_data.sql
-- Purpose: Reset dữ liệu kiểm thử Concurrency về trạng thái ban đầu
-- Mô tả: Xóa sạch toàn bộ booking của loại phòng test (id = 99), đưa phòng 991
--        về trạng thái AVAILABLE để có thể chạy lại test plan nhiều lần.
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- 1. Xóa các phân bổ phòng vật lý liên quan đến booking của room_type 99
DELETE br FROM `booking_rooms` br
INNER JOIN `bookings` b ON br.`booking_id` = b.`id`
WHERE b.`room_type_id` = 99;

-- 2. Xóa các giao dịch thanh toán liên quan đến booking của room_type 99
DELETE pt FROM `payment_transactions` pt
INNER JOIN `bookings` b ON pt.`booking_id` = b.`id`
WHERE b.`room_type_id` = 99;

-- 3. Xóa các booking thuộc loại phòng test 99
DELETE FROM `bookings` WHERE `room_type_id` = 99;

-- 4. Đặt lại trạng thái phòng vật lý 991 về AVAILABLE
UPDATE `rooms` SET `status` = 'AVAILABLE' WHERE `id` = 991 AND `room_type_id` = 99;

-- 5. Đảm bảo loại phòng 99 luôn active
UPDATE `room_types` SET `is_active` = TRUE WHERE `id` = 99;


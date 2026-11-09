-- =============================================================================
-- HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
-- Task: [SP2-1105-TRUNG] Concurrency & Overbooking Prevention Verification
-- File: tests/fixtures/verify_concurrency_db.sql
-- Purpose: Truy vấn kiểm chứng trực tiếp trong Cơ sở dữ liệu sau khi chạy kịch bản JMeter
-- Kỳ vọng:
--   1. Duy nhất ĐÚNG 1 bản ghi Booking được tạo thành công cho loại phòng 99.
--   2. Số phòng trống khả dụng giảm về 0 trong khoảng ngày kiểm thử.
--   3. Không có tình trạng overbooking hay bản ghi trùng lặp.
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

SELECT '========================================================================' AS '';
SELECT ' KIỂM CHỨNG CƠ SỞ DỮ LIỆU: KỊCH BẢN TRANH CHẤP ĐẶT PHÒNG ĐỒNG THỜI (CONCURRENCY)' AS '';
SELECT '========================================================================' AS '';

-- -----------------------------------------------------------------------------
-- 1. TRUY VẤN TỔNG SỐ BOOKING ĐƯỢC TẠO CHO LOẠI PHÒNG TEST (ID = 99)
-- Tiêu chí Pass: total_bookings_created PHẢI CHÍNH XÁC LÀ 1
-- -----------------------------------------------------------------------------
SELECT 
    COUNT(*) AS total_bookings_created,
    CASE 
        WHEN COUNT(*) = 1 THEN 'PASSED (Chính xác 1 booking - Không Overbooking)'
        WHEN COUNT(*) = 0 THEN 'FAILED (Chưa có booking nào được tạo)'
        ELSE 'CRITICAL FAILED (Phát hiện OVERBOOKING: Nhiều hơn 1 booking!)'
    END AS concurrency_verdict
FROM `bookings`
WHERE `room_type_id` = 99;

-- -----------------------------------------------------------------------------
-- 2. CHI TIẾT ĐƠN ĐẶT PHÒNG CHIẾN THẮNG TRANH CHẤP (WINNING BOOKING)
-- -----------------------------------------------------------------------------
SELECT 
    b.`id` AS booking_id,
    b.`booking_code`,
    u.`email` AS booked_by_user,
    u.`full_name` AS customer_name,
    rt.`name` AS room_type_name,
    b.`quantity`,
    b.`check_in_date`,
    b.`check_out_date`,
    b.`total_price`,
    b.`booking_status`,
    b.`payment_status`,
    b.`created_at`
FROM `bookings` b
INNER JOIN `users` u ON b.`user_id` = u.`id`
INNER JOIN `room_types` rt ON b.`room_type_id` = rt.`id`
WHERE b.`room_type_id` = 99
ORDER BY b.`created_at` ASC;

-- -----------------------------------------------------------------------------
-- 3. KIỂM TRA TRẠNG THÁI BUỒNG PHÒNG VẬT LÝ LIÊN QUAN (ROOM 991)
-- -----------------------------------------------------------------------------
SELECT 
    r.`id` AS physical_room_id,
    r.`room_number`,
    r.`floor`,
    rt.`name` AS room_type_name,
    r.`status` AS current_room_status
FROM `rooms` r
INNER JOIN `room_types` rt ON r.`room_type_id` = rt.`id`
WHERE r.`room_type_id` = 99;

-- -----------------------------------------------------------------------------
-- 4. KIỂM TRA SỐ LƯỢNG SUẤT PHÒNG KHẢ DỤNG CÒN LẠI TRONG KHOẢNG NGÀY TEST
-- Khoảng ngày test: 2026-12-01 đến 2026-12-03
-- Tổng số phòng active: 1
-- Số phòng đã giữ chỗ/đã đặt: BookedCount
-- Phòng khả dụng = TotalActive - BookedCount
-- Tiêu chí Pass: available_rooms = 0 (đã bán hết, 9 requests còn lại bị chặn 409)
-- -----------------------------------------------------------------------------
SELECT 
    rt.`id` AS room_type_id,
    rt.`name` AS room_type_name,
    (SELECT COUNT(*) FROM `rooms` r WHERE r.`room_type_id` = rt.`id` AND r.`status` != 'OUT_OF_SERVICE') AS total_active_rooms,
    (SELECT COALESCE(SUM(b.`quantity`), 0)
     FROM `bookings` b
     WHERE b.`room_type_id` = rt.`id`
       AND b.`booking_status` IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
       AND b.`check_in_date` < '2026-12-03'
       AND b.`check_out_date` > '2026-12-01') AS booked_rooms,
    ((SELECT COUNT(*) FROM `rooms` r WHERE r.`room_type_id` = rt.`id` AND r.`status` != 'OUT_OF_SERVICE') -
     (SELECT COALESCE(SUM(b.`quantity`), 0)
      FROM `bookings` b
      WHERE b.`room_type_id` = rt.`id`
        AND b.`booking_status` IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
        AND b.`check_in_date` < '2026-12-03'
        AND b.`check_out_date` > '2026-12-01')) AS available_rooms,
    CASE 
        WHEN ((SELECT COUNT(*) FROM `rooms` r WHERE r.`room_type_id` = rt.`id` AND r.`status` != 'OUT_OF_SERVICE') -
              (SELECT COALESCE(SUM(b.`quantity`), 0)
               FROM `bookings` b
               WHERE b.`room_type_id` = rt.`id`
                 AND b.`booking_status` IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
                 AND b.`check_in_date` < '2026-12-03'
                 AND b.`check_out_date` > '2026-12-01')) = 0 
        THEN 'PASSED (0 phòng khả dụng - Đã bán hết an toàn)'
        ELSE 'WARNING (Số phòng khả dụng khác 0)'
    END AS availability_status
FROM `room_types` rt
WHERE rt.`id` = 99;

-- -----------------------------------------------------------------------------
-- 5. BẢNG TỔNG HỢP NGHIỆM THU ĐỒNG THỜI (CONCURRENCY SUMMARY)
-- -----------------------------------------------------------------------------
SELECT 
    '100 Users Concurrency Test [SP2-QA-01]' AS test_scenario,
    1 AS total_rooms_available_initially,
    100 AS total_concurrent_requests,
    (SELECT COUNT(*) FROM `bookings` WHERE `room_type_id` = 99) AS actual_successful_bookings,
    (100 - (SELECT COUNT(*) FROM `bookings` WHERE `room_type_id` = 99)) AS rejected_requests_409,
    CASE 
        WHEN (SELECT COUNT(*) FROM `bookings` WHERE `room_type_id` = 99) = 1 THEN '100% PASS - OVERBOOKING PREVENTED'
        ELSE 'FAIL - OVERBOOKING OCCURRED'
    END AS final_result;

-- -----------------------------------------------------------------------------
-- 6. KIỂM CHỨNG TÍNH TOÀN VẸN NHẬT KÝ AUDIT LOG (AUDIT TRANSACTION VERIFICATION)
-- Task: [SP2-1109-ANH] - Đức Anh Backend
-- Tiêu chí Pass:
--   - 1 bản ghi CREATE_BOOKING có status = 'SUCCESS'
--   - Các bản ghi còn lại có status = 'FAILED'
--   - Toàn bộ audit log không bị mất do transaction rollback nghiệp vụ
-- -----------------------------------------------------------------------------
SELECT 
    `status`,
    COUNT(*) AS total_audit_logs,
    `action`,
    CASE 
        WHEN `status` = 'SUCCESS' AND COUNT(*) = 1 THEN 'PASSED (Chính xác 1 log SUCCESS khớp với đơn đặt phòng)'
        WHEN `status` = 'FAILED' AND COUNT(*) > 0 THEN 'PASSED (Ghi nhận đầy đủ log FAILED khi bị chặn 409)'
        ELSE 'CHECK REQUIRED'
    END AS audit_verdict
FROM `audit_logs`
WHERE `action` = 'CREATE_BOOKING'
GROUP BY `status`, `action`;



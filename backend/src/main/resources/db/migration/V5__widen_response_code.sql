-- =============================================================================
-- HOTEL BOOKING SYSTEM (MVP) - DATABASE MIGRATION SCRIPT
-- File: V5__widen_response_code.sql
-- Description: Mở rộng độ dài cột response_code lên VARCHAR(50)
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

ALTER TABLE `payment_transactions`
    MODIFY COLUMN `response_code` VARCHAR(50) DEFAULT NULL COMMENT 'Mã phản hồi từ cổng thanh toán hoặc nghiệp vụ quầy';


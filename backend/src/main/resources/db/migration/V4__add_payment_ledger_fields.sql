-- =============================================================================
-- HOTEL BOOKING SYSTEM (MVP) - DATABASE MIGRATION SCRIPT
-- File: V4__add_payment_ledger_fields.sql
-- Description: Mở rộng bảng payment_transactions hỗ trợ Sổ Cái Dòng Tiền (SRS §FR-19)
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

ALTER TABLE `payment_transactions`
    ADD COLUMN `type` VARCHAR(30) NOT NULL DEFAULT 'DEPOSIT' COMMENT 'DEPOSIT, COUNTER_PAYMENT, REFUND, ADDITIONAL_SERVICE',
    ADD COLUMN `reference_note` VARCHAR(500) DEFAULT NULL COMMENT 'Ghi chú tham chiếu đối soát / ủy nhiệm chi / biên lai POS',
    ADD COLUMN `actor_email` VARCHAR(100) DEFAULT NULL COMMENT 'Email người thực hiện giao dịch (Lễ tân hoặc Khách hàng)';

CREATE INDEX `idx_trans_type_time` ON `payment_transactions` (`type`, `transaction_time`);
CREATE INDEX `idx_trans_status_time` ON `payment_transactions` (`status`, `transaction_time`);


-- =============================================================================
-- HOTEL BOOKING SYSTEM (MVP) - DATABASE MIGRATION SCRIPT
-- File: V5__integrate_vietqr_payment.sql
-- Description: Mở rộng hỗ trợ phương thức thanh toán VietQR chuyển khoản ngân hàng
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- 1. Bổ sung 'VIETQR' vào enum payment_method của bảng bookings
ALTER TABLE `bookings`
    MODIFY COLUMN `payment_method` ENUM('VNPAY', 'CASH', 'BANK_TRANSFER', 'VIETQR') NOT NULL DEFAULT 'VIETQR' COMMENT 'Phương thức thanh toán đã chọn';

-- 2. Bổ sung 'VIETQR' vào enum payment_method và các trường xác minh đối soát của bảng payment_transactions
ALTER TABLE `payment_transactions`
    MODIFY COLUMN `payment_method` ENUM('VNPAY', 'CASH', 'BANK_TRANSFER', 'VIETQR') NOT NULL,
    ADD COLUMN `verified_by` VARCHAR(100) DEFAULT NULL COMMENT 'Email hoặc tên người xác nhận/từ chối giao dịch',
    ADD COLUMN `verified_at` DATETIME DEFAULT NULL COMMENT 'Thời điểm xác nhận/từ chối giao dịch thực tế',
    ADD COLUMN `rejection_reason` VARCHAR(500) DEFAULT NULL COMMENT 'Lý do từ chối giao dịch nếu không hợp lệ',
    ADD COLUMN `qr_code_url` VARCHAR(1000) DEFAULT NULL COMMENT 'Đường dẫn ảnh QR VietQR sinh theo chuẩn VietQR QuickLink';

-- 3. Tạo chỉ mục tối ưu truy vấn danh sách giao dịch chờ xác nhận theo thời gian
CREATE INDEX `idx_trans_status_created` ON `payment_transactions` (`status`, `created_at`);
CREATE INDEX `idx_trans_method_status` ON `payment_transactions` (`payment_method`, `status`);

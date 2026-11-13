-- Migration V5: Tích hợp phương thức thanh toán VietQR

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- Bổ sung VietQR vào danh sách phương thức thanh toán
ALTER TABLE bookings
    MODIFY COLUMN payment_method
    ENUM('VNPAY', 'CASH', 'BANK_TRANSFER', 'VIETQR')
    NOT NULL DEFAULT 'VIETQR'
    COMMENT 'Phương thức thanh toán';

-- Cập nhật bảng giao dịch thanh toán
ALTER TABLE payment_transactions
    MODIFY COLUMN payment_method
    ENUM('VNPAY', 'CASH', 'BANK_TRANSFER', 'VIETQR')
    NOT NULL,
    ADD COLUMN verified_by VARCHAR(100) DEFAULT NULL,
    ADD COLUMN verified_at DATETIME DEFAULT NULL,
    ADD COLUMN rejection_reason VARCHAR(500) DEFAULT NULL,
    ADD COLUMN qr_code_url VARCHAR(1000) DEFAULT NULL;

-- Tạo index phục vụ truy vấn giao dịch
CREATE INDEX idx_trans_status_created
    ON payment_transactions(status, created_at);

CREATE INDEX idx_trans_method_status
    ON payment_transactions(payment_method, status);
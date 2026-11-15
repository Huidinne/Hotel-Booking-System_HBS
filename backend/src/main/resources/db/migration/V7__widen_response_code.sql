-- Migration V7: Mở rộng độ dài response_code

ALTER TABLE payment_transactions
    MODIFY COLUMN response_code VARCHAR(50) DEFAULT NULL
    COMMENT 'Mã phản hồi từ cổng thanh toán';

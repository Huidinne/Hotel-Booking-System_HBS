-- Migration V6: Thay thế mặc định thanh toán VNPAY bằng VIETQR
-- Đảm bảo toàn bộ booking mới mặc định sử dụng phương thức chuyển khoản VietQR

ALTER TABLE bookings
    MODIFY COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'VIETQR';

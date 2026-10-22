import React from 'react';

export function Footer() {
  return (
    <footer className="hotel-footer">
      <div className="footer-content">
        <div className="footer-col">
          <div className="footer-logo">
            <span className="hotel-icon">🏨</span>
            <strong>Grand Aurora Hotel</strong>
          </div>
          <p>Hệ thống đặt phòng trực tuyến & quản lý lưu trú chuẩn doanh nghiệp.</p>
        </div>
        <div className="footer-col">
          <h4>Quy chuẩn giờ giấc</h4>
          <p>🕒 Giờ nhận phòng tiêu chuẩn: <strong>14:00</strong></p>
          <p>🕛 Giờ trả phòng tiêu chuẩn: <strong>12:00</strong></p>
          <p>💳 Cọc chuẩn trực tuyến: <strong>50%</strong> (Giữ chỗ 15 phút VNPay)</p>
        </div>
        <div className="footer-col">
          <h4>Chính sách hủy & hoàn cọc</h4>
          <p>• Trước ≥ 24h: Hoàn 100% cọc</p>
          <p>• 12h - 24h: Phạt 30% cọc, hoàn 70%</p>
          <p>• &lt; 12h: Phạt 50% cọc, hoàn 50%</p>
          <p>• Sau 14:00: Phạt 100% cọc</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Hotel Booking System (MVP) - Spring Boot 3 + ReactJS/Vite + MySQL 8</p>
      </div>
    </footer>
  );
}

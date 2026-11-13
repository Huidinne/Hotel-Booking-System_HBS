import React from 'react';
import { Link } from 'react-router-dom';
import {
  Hotel,
  MapPin,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  CreditCard,
  FileCheck2,
  Sparkles,
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="traveloka-style-footer">
      {/* Top Banner Feature Bar */}
      <div className="footer-feature-strip">
        <div className="footer-feature-container">
          <div className="feature-item">
            <Sparkles size={22} className="feature-icon" />
            <div>
              <strong>Chuẩn mực 5 sao quốc tế</strong>
              <p>Trải nghiệm dịch vụ nghỉ dưỡng hoàng gia</p>
            </div>
          </div>
          <div className="feature-item">
            <ShieldCheck size={22} className="feature-icon" />
            <div>
              <strong>Thanh toán bảo mật 100%</strong>
              <p>Mã hóa giao dịch tiêu chuẩn ngân hàng</p>
            </div>
          </div>
          <div className="feature-item">
            <FileCheck2 size={22} className="feature-icon" />
            <div>
              <strong>Hóa đơn điện tử tức thì</strong>
              <p>Gửi tự động qua email khách hàng</p>
            </div>
          </div>
          <div className="feature-item">
            <Phone size={22} className="feature-icon" />
            <div>
              <strong>Hỗ trợ tận tâm 24/7</strong>
              <p>Hotline: 1900 888 888 sẵn sàng phục vụ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main 4-Column Footer Content */}
      <div className="footer-main-grid-container">
        {/* Column 1: Brand & Intro */}
        <div className="footer-grid-col brand-col">
          <div className="footer-brand-title">
            <Hotel size={24} className="brand-icon-gold" />
            <span>Grand Aurora Luxury</span>
          </div>
          <p className="brand-description">
            Khách sạn nghỉ dưỡng cao cấp ven biển hàng đầu Đà Nẵng, kết hợp hoàn hảo giữa kiến trúc tân cổ điển tinh tế và dịch vụ hiếu khách chuẩn mực.
          </p>
          <div className="hotel-badges-list">
            <span className="badge-luxury">★ ★ ★ ★ ★ 5-Star Hotel</span>
          </div>
        </div>

        {/* Column 2: Khám phá & Dịch vụ */}
        <div className="footer-grid-col">
          <h4 className="footer-col-heading">Khám phá & Đặt phòng</h4>
          <ul className="footer-links-list">
            <li>
              <Link to="/rooms">Danh mục buồng phòng</Link>
            </li>
            <li>
              <Link to="/my-bookings">Quản lý chuyến đi của tôi</Link>
            </li>
            <li>
              <Link to="/rooms?guests=2">Phòng Suite trăng mật</Link>
            </li>
            <li>
              <Link to="/rooms?guests=4">Villa gia đình hướng biển</Link>
            </li>
            <li>
              <Link to="/login">Đăng nhập tài khoản thành viên</Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Chính sách & Hỗ trợ */}
        <div className="footer-grid-col">
          <h4 className="footer-col-heading">Chính sách & Quy định</h4>
          <ul className="footer-links-list">
            <li>
              <span>Giờ nhận phòng: <strong>14:00</strong></span>
            </li>
            <li>
              <span>Giờ trả phòng: <strong>12:00</strong></span>
            </li>
            <li>
              <span>Đặt cọc trực tuyến: <strong>50%</strong> giữ phòng</span>
            </li>
            <li>
              <span>Hoàn cọc 100% khi hủy trước ≥ 24h</span>
            </li>
            <li>
              <span>Hóa đơn điện tử gửi tự động qua email</span>
            </li>
          </ul>
        </div>

        {/* Column 4: Liên hệ & Hỗ trợ */}
        <div className="footer-grid-col contact-col">
          <h4 className="footer-col-heading">Thông tin liên hệ</h4>
          <div className="contact-info-list">
            <div className="contact-entry">
              <MapPin size={16} className="contact-icon" />
              <span>Số 01 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng</span>
            </div>
            <div className="contact-entry">
              <Phone size={16} className="contact-icon" />
              <span>Hotline 24/7: <strong>1900 888 888</strong></span>
            </div>
            <div className="contact-entry">
              <Mail size={16} className="contact-icon" />
              <span>Email: <strong>contact@grandaurora.com</strong></span>
            </div>
            <div className="contact-entry">
              <Clock size={16} className="contact-icon" />
              <span>Bộ phận Lễ tân & Đặt phòng: Phục vụ 24/7</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Partners & Security Strip */}
      <div className="footer-partners-strip">
        <div className="partners-container">
          <div className="partner-group">
            <span className="partner-label">Đối tác thanh toán:</span>
            <div className="payment-tags-row">
              <span className="pay-tag vnpay">VietQR / Napas 247</span>
              <span className="pay-tag visa">Visa</span>
              <span className="pay-tag mastercard">MasterCard</span>
              <span className="pay-tag atm">ATM Nội Địa</span>
            </div>
          </div>
          <div className="partner-group">
            <span className="partner-label">Bảo mật giao dịch:</span>
            <div className="payment-tags-row">
              <span className="pay-tag secure">
                <CreditCard size={13} /> SSL 256-Bit Encrypted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Strip */}
      <div className="footer-bottom-bar">
        <div className="bottom-bar-container">
          <p>© 2026 Grand Aurora Luxury Hotel & Resort. Bản quyền thuộc về hệ thống đặt phòng trực tuyến Grand Aurora.</p>
          <div className="bottom-links">
            <span>Chính sách quyền riêng tư</span>
            <span>•</span>
            <span>Điều khoản sử dụng</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { HOTEL_CONFIG } from '../../utils/mapUtils';
import { DirectionsModal } from '../map/DirectionsModal';

export function Footer() {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  return (
    <footer className="hotel-footer">
      <div className="footer-content">
        <div className="footer-col">
          <div className="footer-logo">
            <strong>{HOTEL_CONFIG.name}</strong>
          </div>
          <p>Hệ thống đặt phòng trực tuyến & quản lý lưu trú chuẩn doanh nghiệp.</p>
          <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <p style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.85rem' }}>
              <MapPin size={16} style={{ color: '#F59E0B', flexShrink: 0, marginTop: '0.15rem' }} />
              <span>{HOTEL_CONFIG.address}</span>
            </p>
            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#F59E0B',
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Navigation size={14} />
              <span>Chỉ đường trên Google Maps →</span>
            </button>
          </div>
        </div>
        <div className="footer-col">
          <h4>Quy chuẩn giờ giấc</h4>
          <p>Giờ nhận phòng tiêu chuẩn: <strong>14:00</strong></p>
          <p>Giờ trả phòng tiêu chuẩn: <strong>12:00</strong></p>
          <p>Cọc chuẩn trực tuyến: <strong>50%</strong> (Giữ chỗ 15 phút VNPay)</p>
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

      <DirectionsModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
      />
    </footer>
  );
}

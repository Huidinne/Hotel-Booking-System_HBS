import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CircleDollarSign,
  Percent,
  Hotel,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Clock,
  Layers,
  Sparkles,
  BedDouble,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RoomStatusBadge } from '../../components/common/Badge';

export function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Accordion active state for operational rules
  const [activeAccordion, setActiveAccordion] = useState(0);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const summary = await dashboardService.getDashboardSummary();
      setData(summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Đang tải dữ liệu báo cáo thống kê & KPI..." />;
  }

  if (!data) return null;

  const totalRooms = Object.values(data.roomCounts).reduce((a, b) => a + b, 0) || 1;
  const availPct = Math.round((data.roomCounts.AVAILABLE / totalRooms) * 100);
  const occPct = Math.round((data.roomCounts.OCCUPIED / totalRooms) * 100);
  const cleanPct = Math.round((data.roomCounts.CLEANING / totalRooms) * 100);
  const maintPct = Math.round((data.roomCounts.MAINTENANCE / totalRooms) * 100);

  const operationalRules = [
    {
      title: 'Khóa Chống Overbooking (Pessimistic Lock)',
      icon: <Layers size={18} className="text-gold" />,
      content:
        'Hệ thống áp dụng khóa ghi mức dòng (Pessimistic Write Lock) trên bảng Loại phòng (RoomType) trong thời gian giao dịch đặt phòng. Cơ chế này bảo vệ tuyệt đối hạn mức phòng khả dụng khi có nhiều khách hàng cùng thực hiện đặt phòng đồng thời trong cùng khoảng ngày lưu trú.',
    },
    {
      title: 'Giữ Quota 15 Phút Qua Cổng VNPay Sandbox',
      icon: <Clock size={18} className="text-gold" />,
      content:
        'Đơn đặt cọc qua VNPay được tạm giữ chỗ trong 15 phút (trường hold_expires_at). Nếu khách không hoàn tất giao dịch trong thời gian quy định, Scheduler của hệ thống sẽ tự động kích hoạt hủy đơn và giải phóng quota ngay lập tức cho các khách hàng khác tra cứu.',
    },
    {
      title: 'Chính Sách Phạt Hủy Cọc 4 Bậc (Mốc 14:00)',
      icon: <ShieldAlert size={18} className="text-gold" />,
      content:
        'Căn cứ duy nhất vào thời điểm 14:00 ngày Check-in theo SRS §2.6: Trước ≥ 24h: hoàn 100% tiền cọc; Từ 12h đến dưới 24h: phạt 30% cọc; Dưới 12h: phạt 50% cọc; Tại hoặc sau 14:00: phạt 100% cọc. Toàn bộ khoản tiền thanh toán vượt mức cọc 50% luôn được bảo lưu hoàn 100% cho khách.',
    },
    {
      title: 'Bảo Mật Tài Khoản Đối Soát Hoàn Tiền (NFR-06)',
      icon: <CheckCircle2 size={18} className="text-gold" />,
      content:
        'Số tài khoản ngân hàng thụ hưởng của khách hàng được che bảo mật dạng ******7890 trên tất cả các màn hình vận hành. Nhân viên Lễ tân/Admin thực hiện chuyển khoản thủ công bằng ứng dụng ngân hàng rồi mới nhập mã tham chiếu ủy nhiệm chi để tất toán.',
    },
  ];

  return (
    <div className="admin-dashboard-wrapper">
      {/* Page Title & Controls */}
      <div className="dashboard-header-banner">
        <div>
          <div className="dashboard-pretitle">
            <Sparkles size={16} className="text-gold" />
            <span>TRUNG TÂM ĐIỀU HÀNH & PHÂN TÍCH HIỆU SUẤT</span>
          </div>
          <h1 className="dashboard-main-title">Báo Cáo Hoạt Động & Doanh Thu Khách Sạn</h1>
          <p className="dashboard-subtitle">
            Kỳ báo cáo đối soát: <strong>{data.dateFrom}</strong> đến <strong>{data.dateTo}</strong> (Dữ liệu thời gian thực)
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" className="btn-secondary" onClick={loadDashboard}>
            <RefreshCw size={15} />
            <span>Cập nhật số liệu</span>
          </button>
        </div>
      </div>

      {/* 4-COLUMN KPI CARDS GRID */}
      <div className="kpi-grid-container">
        {/* KPI 1: Doanh thu dự kiến */}
        <div className="kpi-glass-card">
          <div className="kpi-top">
            <span className="kpi-label">Doanh thu dự kiến</span>
            <div className="kpi-icon-wrap icon-royal-navy">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="kpi-number">
            {data.expectedRevenue.toLocaleString('vi-VN')} <span className="kpi-unit">VNĐ</span>
          </div>
          <div className="kpi-note">
            Tổng giá trị các booking <code>CONFIRMED</code> và <code>CHECKED_IN</code>
          </div>
        </div>

        {/* KPI 2: Doanh thu thực thu (Highlighted) */}
        <div className="kpi-glass-card highlight-gold">
          <div className="kpi-top">
            <span className="kpi-label gold-label">Doanh thu thực thu (Net)</span>
            <div className="kpi-icon-wrap icon-champagne-gold">
              <CircleDollarSign size={20} />
            </div>
          </div>
          <div className="kpi-number gold-number">
            {data.actualRevenue.toLocaleString('vi-VN')} <span className="kpi-unit gold-unit">VNĐ</span>
          </div>
          <div className="kpi-note">
            Đã trừ hoàn cọc ({data.refundTotal.toLocaleString('vi-VN')} đ)
          </div>
        </div>

        {/* KPI 3: Tỷ lệ lấp đầy */}
        <div className="kpi-glass-card">
          <div className="kpi-top">
            <span className="kpi-label">Tỷ lệ lấp đầy phòng</span>
            <div className="kpi-icon-wrap icon-royal-navy">
              <Percent size={20} />
            </div>
          </div>
          <div className="kpi-number navy-number">
            {Math.round(data.occupancyRate * 100)}%
          </div>
          <div className="kpi-progress-track">
            <div
              className="kpi-progress-fill"
              style={{ width: `${Math.min(100, Math.round(data.occupancyRate * 100))}%` }}
            />
          </div>
          <div className="kpi-note">
            Tính trên số phòng đang khai thác (trừ phòng bảo trì)
          </div>
        </div>

        {/* KPI 4: Tổng số đơn lưu trú */}
        <div className="kpi-glass-card">
          <div className="kpi-top">
            <span className="kpi-label">Tổng số lượt lưu trú</span>
            <div className="kpi-icon-wrap icon-champagne-gold">
              <Hotel size={20} />
            </div>
          </div>
          <div className="kpi-number">
            {data.totalBookings} <span className="kpi-unit">đơn</span>
          </div>
          <div className="kpi-note">
            Gồm <strong>{data.confirmedBookings}</strong> đơn đã hoàn tất cọc thành công
          </div>
        </div>
      </div>

      {/* BALANCED 2-COLUMN SECTION: ROOM STRUCTURE (60%) vs OPERATIONAL PRINCIPLES (40%) */}
      <div className="dashboard-content-split">
        {/* Left Column: Visual Room Distribution & Breakdown (60%) */}
        <div className="dashboard-card-panel room-breakdown-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Cơ cấu & Trạng thái Buồng phòng</h2>
              <p className="panel-desc">
                Tổng số <strong>{totalRooms} phòng vật lý</strong> đang được quản lý trên hệ thống
              </p>
            </div>
            <div className="room-count-pill">
              <BedDouble size={16} />
              <span>{totalRooms} Phòng</span>
            </div>
          </div>

          {/* Combined Visual Stacked Progress Bar */}
          <div className="stacked-progress-container">
            <div
              className="stacked-bar-segment segment-available"
              style={{ width: `${availPct}%` }}
              title={`Sẵn sàng: ${data.roomCounts.AVAILABLE} phòng (${availPct}%)`}
            />
            <div
              className="stacked-bar-segment segment-occupied"
              style={{ width: `${occPct}%` }}
              title={`Đang có khách: ${data.roomCounts.OCCUPIED} phòng (${occPct}%)`}
            />
            <div
              className="stacked-bar-segment segment-cleaning"
              style={{ width: `${cleanPct}%` }}
              title={`Đang dọn dẹp: ${data.roomCounts.CLEANING} phòng (${cleanPct}%)`}
            />
            <div
              className="stacked-bar-segment segment-maintenance"
              style={{ width: `${maintPct}%` }}
              title={`Đang bảo trì: ${data.roomCounts.MAINTENANCE} phòng (${maintPct}%)`}
            />
          </div>

          {/* Detailed Status Cards Grid */}
          <div className="status-cards-grid">
            {/* AVAILABLE */}
            <div className="status-mini-card status-avail-border">
              <div className="mini-card-top">
                <RoomStatusBadge status="AVAILABLE" />
                <span className="mini-pct">{availPct}%</span>
              </div>
              <div className="mini-count-row">
                <span className="mini-count-num text-emerald">{data.roomCounts.AVAILABLE}</span>
                <span className="mini-count-lbl">phòng sẵn sàng</span>
              </div>
              <div className="mini-bar-track">
                <div className="mini-bar-fill fill-emerald" style={{ width: `${availPct}%` }} />
              </div>
            </div>

            {/* OCCUPIED */}
            <div className="status-mini-card status-occ-border">
              <div className="mini-card-top">
                <RoomStatusBadge status="OCCUPIED" />
                <span className="mini-pct">{occPct}%</span>
              </div>
              <div className="mini-count-row">
                <span className="mini-count-num text-blue">{data.roomCounts.OCCUPIED}</span>
                <span className="mini-count-lbl">phòng đang ở</span>
              </div>
              <div className="mini-bar-track">
                <div className="mini-bar-fill fill-blue" style={{ width: `${occPct}%` }} />
              </div>
            </div>

            {/* CLEANING */}
            <div className="status-mini-card status-clean-border">
              <div className="mini-card-top">
                <RoomStatusBadge status="CLEANING" />
                <span className="mini-pct">{cleanPct}%</span>
              </div>
              <div className="mini-count-row">
                <span className="mini-count-num text-amber">{data.roomCounts.CLEANING}</span>
                <span className="mini-count-lbl">chờ dọn dẹp</span>
              </div>
              <div className="mini-bar-track">
                <div className="mini-bar-fill fill-amber" style={{ width: `${cleanPct}%` }} />
              </div>
            </div>

            {/* MAINTENANCE */}
            <div className="status-mini-card status-maint-border">
              <div className="mini-card-top">
                <RoomStatusBadge status="MAINTENANCE" />
                <span className="mini-pct">{maintPct}%</span>
              </div>
              <div className="mini-count-row">
                <span className="mini-count-num text-rose">{data.roomCounts.MAINTENANCE}</span>
                <span className="mini-count-lbl">đang bảo trì</span>
              </div>
              <div className="mini-bar-track">
                <div className="mini-bar-fill fill-rose" style={{ width: `${maintPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Operational Rules Accordion (40%) */}
        <div className="dashboard-card-panel operational-rules-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Nguyên Tắc Vận Hành & Kỹ Thuật</h2>
              <p className="panel-desc">Quy chuẩn nghiệp vụ tự động hóa theo SRS v2.1</p>
            </div>
          </div>

          <div className="accordion-list">
            {operationalRules.map((rule, idx) => {
              const isOpen = activeAccordion === idx;
              return (
                <div key={idx} className={`accordion-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="accordion-trigger"
                    onClick={() => setActiveAccordion(isOpen ? -1 : idx)}
                  >
                    <div className="trigger-left">
                      {rule.icon}
                      <span className="trigger-title">{rule.title}</span>
                    </div>
                    <span className="trigger-icon">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="accordion-body">
                      <p>{rule.content}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

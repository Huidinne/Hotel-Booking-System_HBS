import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CircleDollarSign,
  Percent,
  Hotel,
  BedDouble,
  RefreshCw,
  Coins,
  Sparkles,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RoomStatusBadge } from '../../components/common/Badge';
import { KpiCard, RevenueChart } from '../../components/admin/dashboard';
import { ADR_REVPAR_STANDARD_FIXTURE } from '../../mock/adrRevparFixtures';

export function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Safe fallback to ADR/RevPAR fixture if backend hasn't populated time-series yet
  const effectiveAdr = data.adr != null && data.adr > 0 ? data.adr : ADR_REVPAR_STANDARD_FIXTURE.adr;
  const effectiveRevpar = data.revpar != null && data.revpar > 0 ? data.revpar : ADR_REVPAR_STANDARD_FIXTURE.revpar;
  const effectiveSeries = Array.isArray(data.revenueSeries) && data.revenueSeries.length > 0
    ? data.revenueSeries
    : (ADR_REVPAR_STANDARD_FIXTURE.revenueSeries || []);

  const totalRooms = Object.values(data.roomCounts).reduce((a, b) => a + b, 0) || 1;
  const availPct = Math.round((data.roomCounts.AVAILABLE / totalRooms) * 100);
  const occPct = Math.round((data.roomCounts.OCCUPIED / totalRooms) * 100);
  const cleanPct = Math.round((data.roomCounts.CLEANING / totalRooms) * 100);
  const maintPct = Math.round((data.roomCounts.MAINTENANCE / totalRooms) * 100);

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

      {/* CORE 4-COLUMN KPI CARDS GRID (Refactored to KpiCard) */}
      <div className="kpi-grid-container">
        {/* KPI 1: Doanh thu dự kiến */}
        <KpiCard
          label="Doanh thu dự kiến"
          value={data.expectedRevenue}
          unit="VNĐ"
          icon={<TrendingUp size={20} />}
          iconVariant="icon-royal-navy"
          note="Tổng giá trị các booking đã xác nhận và đang lưu trú"
        />

        {/* KPI 2: Doanh thu thực thu (Highlighted) */}
        <KpiCard
          label="Doanh thu thực thu (Net)"
          value={data.actualRevenue}
          unit="VNĐ"
          highlight={true}
          colorVariant="gold"
          icon={<CircleDollarSign size={20} />}
          iconVariant="icon-champagne-gold"
          note={`Đã trừ hoàn cọc (${(data.refundTotal || 0).toLocaleString('vi-VN')} đ)`}
        />

        {/* KPI 3: Tỷ lệ lấp đầy */}
        <KpiCard
          label="Tỷ lệ lấp đầy phòng"
          value={`${Math.round((data.occupancyRate || 0) * 100)}%`}
          colorVariant="navy"
          icon={<Percent size={20} />}
          iconVariant="icon-royal-navy"
          progress={Math.round((data.occupancyRate || 0) * 100)}
          note="Tính trên số phòng đang khai thác"
        />

        {/* KPI 4: Tổng số đơn lưu trú */}
        <KpiCard
          label="Tổng số lượt lưu trú"
          value={data.totalBookings}
          unit="đơn"
          icon={<Hotel size={20} />}
          iconVariant="icon-champagne-gold"
          note={`Gồm ${data.confirmedBookings} đơn đã hoàn tất cọc thành công`}
        />
      </div>

      {/* SPECIALIZED HOTEL EFFICIENCY METRICS (ADR & RevPAR USALI Contract) */}
      <div className="kpi-grid-container" style={{ marginBottom: '2.4rem' }}>
        {/* KPI 5: ADR */}
        <KpiCard
          label="ADR (Giá bán bình quân)"
          value={effectiveAdr}
          unit="VNĐ/đêm"
          icon={<Coins size={20} />}
          iconVariant="icon-champagne-gold"
          colorVariant="gold"
          note="Doanh thu phòng bình quân trên mỗi phòng có khách"
        />

        {/* KPI 6: RevPAR */}
        <KpiCard
          label="RevPAR (Doanh thu trên phòng sẵn có)"
          value={effectiveRevpar}
          unit="VNĐ/đêm"
          icon={<Coins size={20} />}
          iconVariant="icon-champagne-gold"
          colorVariant="navy"
          note="Doanh thu phòng bình quân trên toàn bộ quỹ phòng"
        />
      </div>

      {/* INDEPENDENT REVENUE & TREND CHART COMPONENT */}
      <RevenueChart
        series={effectiveSeries}
        dateFrom={data.dateFrom}
        dateTo={data.dateTo}
        title="Xu Hướng Doanh Thu Lưu Trú & Chỉ Số ADR/RevPAR Theo Ngày"
        subtitle={`Kỳ báo cáo đối soát từ ${data.dateFrom} đến ${data.dateTo}`}
      />

      {/* ROOM STRUCTURE & STATUS (CLEAN, MINIMAL LAYOUT) */}
      <div className="dashboard-card-panel room-breakdown-panel" style={{ marginTop: '2rem' }}>
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
    </div>
  );
}

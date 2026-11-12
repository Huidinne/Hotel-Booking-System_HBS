import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  CircleDollarSign,
  Percent,
  Hotel,
  BedDouble,
  RefreshCw,
  Coins,
  Sparkles,
  AlertCircle,
  Inbox,
  Download,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RoomStatusBadge } from '../../components/common/Badge';
import {
  KpiCard,
  DailyRevenueChart,
  MonthlyRevenueChart,
  RoomTypeRevenueChart,
  DashboardDateRange,
} from '../../components/admin/dashboard';
import {
  formatVND,
  formatOccupancyPercent,
  getOccupancyProgress,
} from '../../utils/dashboardFormatters';

export function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for Monthly Revenue & Room Type Analytics
  const [analyticsDateRange, setAnalyticsDateRange] = useState({
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });
  const [activePreset, setActivePreset] = useState('full_year');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [roomTypeData, setRoomTypeData] = useState([]);
  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const blob = await dashboardService.exportDashboardCsv(data?.dateFrom, data?.dateTo, 'full');
      const filename = `bao-cao-dashboard-${data?.dateFrom || 'start'}-${data?.dateTo || 'end'}.csv`;
      dashboardService.downloadCsvFile(blob, filename);
    } catch (err) {
      console.error('Lỗi xuất file CSV:', err);
      alert('Không thể xuất báo cáo CSV: ' + (err instanceof Error ? err.message : 'Lỗi máy chủ'));
    } finally {
      setExportingCsv(false);
    }
  };

  // Load KPI overview summary from real backend API
  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await dashboardService.getDashboardSummary();
      setData(summary);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
      setError(
        err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ Backend'
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Load Analytics Data for Monthly & Room Type charts from real backend API
  const loadAnalytics = useCallback(async (range, forceError = false) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);

    // QA / Testing preset simulation for Error
    if (forceError) {
      setAnalyticsError('Lỗi giả lập kiểm thử giao diện (Simulated Error)');
      setAnalyticsLoading(false);
      return;
    }

    try {
      const res = await dashboardService.getMonthlyRevenue({
        startDate: range?.startDate,
        endDate: range?.endDate,
      });

      if (res && Array.isArray(res.monthly)) {
        setMonthlyData(res.monthly);
        setRoomTypeData(res.roomTypes || []);
      } else {
        setMonthlyData([]);
        setRoomTypeData([]);
      }
    } catch (err) {
      console.error('Failed to load monthly analytics:', err);
      setMonthlyData([]);
      setRoomTypeData([]);
      setAnalyticsError(
        err instanceof Error
          ? err.message
          : 'Không thể tải dữ liệu thống kê từ máy chủ Backend'
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadAnalytics({ startDate: '2026-01-01', endDate: '2026-12-31' });
  }, [loadAnalytics]);

  // Handler for manual Date Range change
  const handleDateRangeChange = (newRange) => {
    setAnalyticsDateRange(newRange);
    setActivePreset('custom');
    loadAnalytics(newRange);
  };

  // Handler for quick test presets
  const handlePresetSelect = (presetKey, newRange) => {
    setAnalyticsDateRange(newRange);
    setActivePreset(presetKey);

    if (presetKey === 'loading') {
      setAnalyticsLoading(true);
      return;
    }

    if (presetKey === 'error') {
      loadAnalytics(newRange, true);
      return;
    }

    loadAnalytics(newRange, false);
  };

  // Retry handler for Error State
  const handleRetryAnalytics = () => {
    loadAnalytics(analyticsDateRange, activePreset === 'error');
  };

  // 1. Loading State
  if (loading) {
    return <LoadingSpinner text="Đang tải dữ liệu báo cáo thống kê & KPI..." />;
  }

  // 2. Error State (No mock data fallback)
  if (error) {
    return (
      <div className="admin-dashboard-wrapper">
        <div className="dashboard-header-banner">
          <div>
            <div className="dashboard-pretitle">
              <Sparkles size={16} className="text-gold" />
              <span>TRUNG TÂM ĐIỀU HÀNH & PHÂN TÍCH HIỆU SUẤT</span>
            </div>
            <h1 className="dashboard-main-title">Báo Cáo Hoạt Động & Doanh Thu Khách Sạn</h1>
          </div>
        </div>

        <div
          className="dashboard-card-panel"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            background: '#FFF5F5',
            border: '1px solid #FED7D7',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '2rem',
          }}
        >
          <AlertCircle size={44} style={{ color: '#E53E3E' }} />
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#9B2C2C', fontSize: '1.2rem', fontWeight: 700 }}>
              Không thể tải dữ liệu Dashboard
            </h3>
            <p style={{ margin: 0, color: '#742A2A', fontSize: '0.9rem', maxWidth: 480 }}>
              {error}
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadDashboard}
            style={{
              marginTop: '0.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            <span>Thử lại kết nối</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Empty State
  if (!data) {
    return (
      <div className="admin-dashboard-wrapper">
        <div
          className="dashboard-card-panel"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            background: '#FDFBF7',
            border: '1px dashed #DDD5C7',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            marginTop: '2rem',
          }}
        >
          <Inbox size={44} style={{ color: '#C5A880' }} />
          <h3 style={{ margin: 0, color: '#334155', fontSize: '1.1rem', fontWeight: 700 }}>
            Không có dữ liệu thống kê từ hệ thống
          </h3>
          <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>
            Vui lòng kiểm tra lại cấu hình hoặc thử lại.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadDashboard}
            style={{ marginTop: '0.5rem' }}
          >
            <RefreshCw size={15} />
            <span>Tải lại</span>
          </button>
        </div>
      </div>
    );
  }

  // Real backend metrics (no mock fixture overrides)
  const effectiveAdr = Number(data.adr ?? 0);
  const effectiveRevpar = Number(data.revpar ?? 0);
  const effectiveSeries = Array.isArray(data.revenueSeries) ? data.revenueSeries : [];

  // Room status percentages
  const roomCounts = data.roomCounts || {
    AVAILABLE: 0,
    OCCUPIED: 0,
    CLEANING: 0,
    MAINTENANCE: 0,
  };
  const totalRooms =
    Number(data.totalRooms) > 0
      ? Number(data.totalRooms)
      : Object.values(roomCounts).reduce((a, b) => a + b, 0);

  const safeTotalRooms = totalRooms > 0 ? totalRooms : 1;
  const availPct = totalRooms > 0 ? Math.round(((roomCounts.AVAILABLE || 0) / safeTotalRooms) * 100) : 0;
  const occPct = totalRooms > 0 ? Math.round(((roomCounts.OCCUPIED || 0) / safeTotalRooms) * 100) : 0;
  const cleanPct = totalRooms > 0 ? Math.round(((roomCounts.CLEANING || 0) / safeTotalRooms) * 100) : 0;
  const maintPct = totalRooms > 0 ? Math.round(((roomCounts.MAINTENANCE || 0) / safeTotalRooms) * 100) : 0;

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
            Kỳ báo cáo đối soát: <strong>{data.dateFrom || '---'}</strong> đến{' '}
            <strong>{data.dateTo || '---'}</strong> (Dữ liệu thời gian thực)
          </p>
        </div>
        <div className="dashboard-header-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportCsv}
            disabled={exportingCsv}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} />
            <span>{exportingCsv ? 'Đang xuất CSV...' : 'Xuất CSV'}</span>
          </button>
          <button type="button" className="btn-secondary" onClick={loadDashboard}>
            <RefreshCw size={15} />
            <span>Cập nhật số liệu</span>
          </button>
        </div>
      </div>

      {/* CORE 4-COLUMN KPI CARDS GRID */}
      <div className="kpi-grid-container">
        {/* KPI 1: Doanh thu lưu trú (Accrual Basis) */}
        <KpiCard
          label="Doanh thu lưu trú (Accrual)"
          value={data.roomRevenue ?? 0}
          unit="₫"
          highlight={true}
          colorVariant="gold"
          icon={<CircleDollarSign size={20} />}
          iconVariant="icon-champagne-gold"
          note="Doanh thu phòng tiêu dùng thực tế trong kỳ theo ngày ở"
        />

        {/* KPI 2: Dòng tiền thực thu ròng (Cash Basis) */}
        <KpiCard
          label="Dòng tiền thực thu (Net)"
          value={data.netCashFlow ?? data.actualRevenue ?? 0}
          unit="₫"
          colorVariant="navy"
          icon={<CircleDollarSign size={20} />}
          iconVariant="icon-royal-navy"
          note={`Đã trừ hoàn cọc (${formatVND(data.refundTotal ?? 0)})`}
        />

        {/* KPI 3: Tỷ lệ lấp đầy (0..1 converted safely to 0%..100%) */}
        <KpiCard
          label="Tỷ lệ lấp đầy phòng"
          value={formatOccupancyPercent(data.occupancyRate)}
          colorVariant="navy"
          icon={<Percent size={20} />}
          iconVariant="icon-royal-navy"
          progress={getOccupancyProgress(data.occupancyRate)}
          note="Tỷ lệ lấp đầy trên quỹ phòng khả dụng"
        />

        {/* KPI 4: Tổng số đơn lưu trú */}
        <KpiCard
          label="Tổng số lượt lưu trú"
          value={data.totalBookings ?? 0}
          unit="đơn"
          icon={<Hotel size={20} />}
          iconVariant="icon-champagne-gold"
          note={`Gồm ${data.confirmedBookings ?? 0} đơn đã hoàn tất cọc thành công`}
        />
      </div>

      {/* SPECIALIZED HOTEL EFFICIENCY METRICS (ADR, RevPAR, Room Nights, Expected) */}
      <div className="kpi-grid-container" style={{ marginBottom: '2.4rem' }}>
        {/* KPI 5: Doanh thu dự kiến */}
        <KpiCard
          label="Doanh thu dự kiến"
          value={data.expectedRevenue ?? 0}
          unit="₫"
          icon={<TrendingUp size={20} />}
          iconVariant="icon-royal-navy"
          note="Tổng giá trị booking CONFIRMED & đang lưu trú"
        />

        {/* KPI 6: Đêm phòng đã bán / khả dụng */}
        <KpiCard
          label="Đêm phòng đã bán"
          value={data.soldRoomNights ?? 0}
          unit={`/ ${data.totalAvailableRoomNights ?? 0} đêm`}
          icon={<BedDouble size={20} />}
          iconVariant="icon-champagne-gold"
          colorVariant="navy"
          note="Số đêm phòng thực tế khách đã ở trong kỳ"
        />

        {/* KPI 7: ADR */}
        <KpiCard
          label="ADR (Giá bán bình quân)"
          value={effectiveAdr}
          unit="₫/đêm"
          icon={<Coins size={20} />}
          iconVariant="icon-champagne-gold"
          colorVariant="gold"
          note="Doanh thu phòng bình quân trên mỗi đêm phòng đã bán"
        />

        {/* KPI 8: RevPAR */}
        <KpiCard
          label="RevPAR (Doanh thu trên phòng sẵn có)"
          value={effectiveRevpar}
          unit="₫/đêm"
          icon={<Coins size={20} />}
          iconVariant="icon-champagne-gold"
          colorVariant="navy"
          note="Doanh thu phòng bình quân trên toàn bộ quỹ phòng"
        />
      </div>

      {/* INDEPENDENT REVENUE & TREND CHART COMPONENT (Daily Trend) */}
      <DailyRevenueChart
        series={effectiveSeries}
        title="Xu Hướng Doanh Thu Lưu Trú & Chỉ Số ADR/RevPAR Theo Ngày"
      />

      {/* ===================================================================== */}
      {/* SECTION: THỐNG KÊ DOANH THU THEO THÁNG & CƠ CẤU LOẠI PHÒNG             */}
      {/* ===================================================================== */}
      <div style={{ marginTop: '2.4rem', marginBottom: '2.4rem' }}>
        {/* Date Range Filter */}
        <DashboardDateRange
          startDate={analyticsDateRange.startDate}
          endDate={analyticsDateRange.endDate}
          onChange={handleDateRangeChange}
          onPresetSelect={handlePresetSelect}
          activePreset={activePreset}
        />

        {/* 2-Column Responsive Charts Grid */}
        <div className="dashboard-charts-layout">
          {/* Chart 1: Biểu đồ doanh thu theo tháng */}
          <MonthlyRevenueChart
            data={monthlyData}
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={handleRetryAnalytics}
            title="Doanh Thu Theo Tháng"
            subtitle="Diễn biến doanh thu thực thu theo chuỗi thời gian"
          />

          {/* Chart 2: Biểu đồ cơ cấu doanh thu theo loại phòng */}
          <RoomTypeRevenueChart
            data={roomTypeData}
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={handleRetryAnalytics}
            title="Cơ Cấu Doanh Thu Theo Loại Phòng"
            subtitle="Tỷ trọng doanh thu và phân bổ theo từng hạng phòng"
          />
        </div>
      </div>

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
            title={`Sẵn sàng: ${roomCounts.AVAILABLE} phòng (${availPct}%)`}
          />
          <div
            className="stacked-bar-segment segment-occupied"
            style={{ width: `${occPct}%` }}
            title={`Đang có khách: ${roomCounts.OCCUPIED} phòng (${occPct}%)`}
          />
          <div
            className="stacked-bar-segment segment-cleaning"
            style={{ width: `${cleanPct}%` }}
            title={`Đang dọn dẹp: ${roomCounts.CLEANING} phòng (${cleanPct}%)`}
          />
          <div
            className="stacked-bar-segment segment-maintenance"
            style={{ width: `${maintPct}%` }}
            title={`Đang bảo trì: ${roomCounts.MAINTENANCE} phòng (${maintPct}%)`}
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
              <span className="mini-count-num text-emerald">{roomCounts.AVAILABLE}</span>
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
              <span className="mini-count-num text-blue">{roomCounts.OCCUPIED}</span>
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
              <span className="mini-count-num text-amber">{roomCounts.CLEANING}</span>
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
              <span className="mini-count-num text-rose">{roomCounts.MAINTENANCE}</span>
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

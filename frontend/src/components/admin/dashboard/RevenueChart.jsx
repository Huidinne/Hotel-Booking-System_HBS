import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BarChart3, AlertCircle, Calendar, Filter, AlertTriangle, RotateCcw } from 'lucide-react';
import { formatOccupancyPercent } from '../../../utils/dashboardFormatters';

/**
 * Format currency to Vietnamese Dong (VNĐ)
 */
const formatCurrency = (val) => {
  if (val == null || isNaN(Number(val)) || !isFinite(Number(val)) || Number(val) === 0) return '0 ₫';
  const num = Number(val);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M ₫`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K ₫`;
  }
  return `${num.toLocaleString('vi-VN')} ₫`;
};

/**
 * Format DD/MM label for X-axis ticks
 */
const formatDateLabel = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

/**
 * Format DD/MM/YYYY for human-readable display
 */
const formatDisplayDate = (dStr) => {
  if (!dStr) return '';
  try {
    const [y, m, d] = dStr.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return dStr;
  }
};

/**
 * Dynamically computes a sensible default date range from series data.
 * Does NOT hardcode any month or year:
 * - If series has data, defaults to the most recent 30-day window within available dates.
 * - If series is empty, defaults to the last 30 days up to today.
 */
export const computeDynamicDefaultRange = (points = []) => {
  if (Array.isArray(points) && points.length > 0) {
    const validDates = points.map((p) => p.date).filter(Boolean).sort();
    if (validDates.length > 0) {
      const minDate = validDates[0];
      const maxDate = validDates[validDates.length - 1];

      // Window of up to 30 days ending at maxDate
      const maxObj = new Date(maxDate);
      const startObj = new Date(maxObj.getTime() - 29 * 24 * 60 * 60 * 1000);
      const computedStart = startObj.toISOString().slice(0, 10);
      const effectiveStart = computedStart < minDate ? minDate : computedStart;

      return {
        startDate: effectiveStart,
        endDate: maxDate,
      };
    }
  }

  // Fallback: 30 days ending today (dynamic)
  const today = new Date();
  const past30 = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  return {
    startDate: past30.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
  };
};

/**
 * RevenueChart - Independent Revenue & ADR/RevPAR Trend Chart Component
 * Features a fully dynamic Date Range Filter:
 * - User-selectable Start Date & End Date via date pickers.
 * - Apply button & Reset button (restores dynamic 30-day window, never hardcoded).
 * - Multi-criteria testing presets (01/11-07/11, 10/11-20/11, 01/10-30/11, 1-day, empty).
 * - Real-time synchronization of Revenue, ADR, RevPAR, and axis/tooltip.
 */
export function RevenueChart({
  series = [],
  data, // Optional full summary object or array
  title = 'Xu Hướng Doanh Thu Lưu Trú & Chỉ Số ADR/RevPAR Theo Ngày',
  subtitle: customSubtitle,
  dateFrom: _unusedDateFrom,
  dateTo: _unusedDateTo,
  className = '',
  startDate: propStartDate,
  endDate: propEndDate,
  onDateRangeChange,
}) {
  // Normalize series input
  const points = useMemo(() => {
    if (Array.isArray(series) && series.length > 0) return series;
    if (Array.isArray(data?.revenueSeries)) return data.revenueSeries;
    return [];
  }, [series, data]);

  // Compute dynamic default date range (never hardcoded to November 2026)
  const initialRange = useMemo(() => {
    if (propStartDate && propEndDate) {
      return { startDate: propStartDate, endDate: propEndDate };
    }
    return computeDynamicDefaultRange(points);
  }, [points, propStartDate, propEndDate]);

  // Date Filter States
  const [startDateInput, setStartDateInput] = useState(initialRange.startDate);
  const [endDateInput, setEndDateInput] = useState(initialRange.endDate);
  const [appliedRange, setAppliedRange] = useState(initialRange);
  const [validationError, setValidationError] = useState('');
  const [activePreset, setActivePreset] = useState('dynamic_default');

  // Sync internal state when initialRange changes meaningfully
  useEffect(() => {
    if (propStartDate && propEndDate) {
      setStartDateInput(propStartDate);
      setEndDateInput(propEndDate);
      setAppliedRange({ startDate: propStartDate, endDate: propEndDate });
    }
  }, [propStartDate, propEndDate]);

  // Metric View Toggle: 'revenue' (Room Revenue vs Cash Flow) or 'kpi' (ADR vs RevPAR)
  const [activeMetric, setActiveMetric] = useState('revenue');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Filter series based on applied range (lexicographical ISO comparison prevents timezone skew)
  const filteredPoints = useMemo(() => {
    if (!appliedRange.startDate && !appliedRange.endDate) {
      return points;
    }
    return points.filter((p) => {
      if (!p.date) return false;
      if (appliedRange.startDate && p.date < appliedRange.startDate) return false;
      if (appliedRange.endDate && p.date > appliedRange.endDate) return false;
      return true;
    });
  }, [points, appliedRange]);

  // Safe maximum calculation to avoid divide-by-zero
  const maxVal = Math.max(
    ...filteredPoints.map((p) => {
      if (activeMetric === 'revenue') {
        return Math.max(Number(p.roomRevenue || 0), Number(p.netCashFlow || 0));
      } else {
        return Math.max(Number(p.adr || 0), Number(p.revpar || 0));
      }
    }),
    1
  );

  // Apply Filter Handler
  const handleApplyFilter = (e) => {
    if (e) e.preventDefault();

    if (!startDateInput || !endDateInput) {
      setValidationError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc');
      return;
    }

    if (startDateInput > endDateInput) {
      setValidationError('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }

    setValidationError('');
    setActivePreset('custom');
    const newRange = { startDate: startDateInput, endDate: endDateInput };
    setAppliedRange(newRange);
    if (onDateRangeChange) {
      onDateRangeChange(newRange);
    }
  };

  // Reset to Dynamic Default Range
  const handleReset = useCallback(() => {
    const dynRange = computeDynamicDefaultRange(points);
    setValidationError('');
    setStartDateInput(dynRange.startDate);
    setEndDateInput(dynRange.endDate);
    setAppliedRange(dynRange);
    setActivePreset('dynamic_default');
    if (onDateRangeChange) {
      onDateRangeChange(dynRange);
    }
  }, [points, onDateRangeChange]);

  // Preset Selection Handler
  const handlePreset = (presetKey, start, end) => {
    setValidationError('');
    setStartDateInput(start);
    setEndDateInput(end);
    setActivePreset(presetKey);
    const newRange = { startDate: start, endDate: end };
    setAppliedRange(newRange);
    if (onDateRangeChange) {
      onDateRangeChange(newRange);
    }
  };

  // Subtitle dynamically reflects currently filtered range (not locked to 01/11-30/11)
  const displaySubtitle =
    customSubtitle ||
    `Kỳ đối soát đang hiển thị từ ${formatDisplayDate(appliedRange.startDate)} đến ${formatDisplayDate(appliedRange.endDate)} (${filteredPoints.length} ngày dữ liệu)`;

  return (
    <div className={`dashboard-card-panel revenue-chart-panel ${className}`.trim()} style={{ width: '100%', marginBottom: '2.4rem' }}>
      {/* Chart Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
            <BarChart3 size={18} className="text-gold" style={{ color: '#C5A880' }} />
            <h2 className="panel-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
              {title}
            </h2>
          </div>
          <p className="panel-desc" style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>
            {displaySubtitle}
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F8F6F0', padding: '3px', borderRadius: '10px', border: '1px solid #E6E1D6' }}>
          <button
            type="button"
            onClick={() => setActiveMetric('revenue')}
            style={{
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: activeMetric === 'revenue' ? '#0F172A' : 'transparent',
              color: activeMetric === 'revenue' ? '#FFFFFF' : '#64748B',
              transition: 'all 150ms ease',
            }}
          >
            Doanh thu & Dòng tiền
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('kpi')}
            style={{
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: activeMetric === 'kpi' ? '#0F172A' : 'transparent',
              color: activeMetric === 'kpi' ? '#FFFFFF' : '#64748B',
              transition: 'all 150ms ease',
            }}
          >
            Chỉ số ADR & RevPAR
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* DYNAMIC DATE RANGE FILTER WITH APPLY & RESET (NO HARDCODED NOVEMBER)  */}
      {/* ===================================================================== */}
      <div
        style={{
          background: '#FDFBF7',
          borderRadius: '10px',
          border: '1px solid #EAE4D6',
          padding: '0.85rem 1rem',
          marginBottom: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          {/* Active Date Range Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#475569' }}>
            <Calendar size={15} style={{ color: '#C5A880' }} />
            <span>Kỳ áp dụng: </span>
            <strong style={{ color: '#0F172A', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {formatDisplayDate(appliedRange.startDate)} — {formatDisplayDate(appliedRange.endDate)}
            </strong>
            <span style={{ fontSize: '0.74rem', color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '12px' }}>
              {filteredPoints.length} ngày
            </span>
          </div>

          {/* Date Picker Form: Từ ngày, Đến ngày, Áp dụng, Đặt lại */}
          <form
            onSubmit={handleApplyFilter}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <label htmlFor="adr-start-date" style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748B' }}>
                Từ ngày:
              </label>
              <input
                id="adr-start-date"
                type="date"
                value={startDateInput}
                onChange={(e) => {
                  setStartDateInput(e.target.value);
                  setValidationError('');
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.76rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <label htmlFor="adr-end-date" style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748B' }}>
                Đến ngày:
              </label>
              <input
                id="adr-end-date"
                type="date"
                value={endDateInput}
                onChange={(e) => {
                  setEndDateInput(e.target.value);
                  setValidationError('');
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.76rem',
                  color: '#0F172A',
                  background: '#FFFFFF',
                }}
              />
            </div>

            {/* Apply Button */}
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 12px',
                background: '#0B132B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
            >
              <Filter size={12} />
              <span>Áp dụng</span>
            </button>

            {/* Reset Button (khôi phục khoảng thời gian mặc định động) */}
            <button
              type="button"
              onClick={handleReset}
              title="Khôi phục khoảng thời gian mặc định động"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                background: '#FFFFFF',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <RotateCcw size={12} />
              <span>Đặt lại</span>
            </button>
          </form>
        </div>

        {/* Validation Warning Alert */}
        {validationError && (
          <div
            style={{
              padding: '6px 10px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#B91C1C',
              fontSize: '0.76rem',
            }}
          >
            <AlertTriangle size={14} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Quick Testing Presets matching Section 6 Requirements */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.4rem',
            paddingTop: '0.35rem',
            borderTop: '1px dashed #E6E1D6',
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginRight: '2px' }}>
            Mẫu kiểm thử:
          </span>

          <button
            type="button"
            onClick={() => handlePreset('nov_week1', '2026-11-01', '2026-11-07')}
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 500,
              border: '1px solid',
              borderColor: activePreset === 'nov_week1' ? '#0B132B' : '#E2E8F0',
              background: activePreset === 'nov_week1' ? '#0B132B' : '#FFFFFF',
              color: activePreset === 'nov_week1' ? '#FFFFFF' : '#334155',
              cursor: 'pointer',
            }}
          >
            01/11 — 07/11
          </button>

          <button
            type="button"
            onClick={() => handlePreset('nov_mid', '2026-11-10', '2026-11-20')}
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 500,
              border: '1px solid',
              borderColor: activePreset === 'nov_mid' ? '#0B132B' : '#E2E8F0',
              background: activePreset === 'nov_mid' ? '#0B132B' : '#FFFFFF',
              color: activePreset === 'nov_mid' ? '#FFFFFF' : '#334155',
              cursor: 'pointer',
            }}
          >
            10/11 — 20/11
          </button>

          <button
            type="button"
            onClick={() => handlePreset('cross_two_months', '2026-10-01', '2026-11-30')}
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 500,
              border: '1px solid',
              borderColor: activePreset === 'cross_two_months' ? '#0B132B' : '#E2E8F0',
              background: activePreset === 'cross_two_months' ? '#0B132B' : '#FFFFFF',
              color: activePreset === 'cross_two_months' ? '#FFFFFF' : '#334155',
              cursor: 'pointer',
            }}
          >
            01/10 — 30/11 (Cả 2 tháng)
          </button>

          <button
            type="button"
            onClick={() => handlePreset('single_day', '2026-11-10', '2026-11-10')}
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 500,
              border: '1px solid',
              borderColor: activePreset === 'single_day' ? '#0B132B' : '#E2E8F0',
              background: activePreset === 'single_day' ? '#0B132B' : '#FFFFFF',
              color: activePreset === 'single_day' ? '#FFFFFF' : '#334155',
              cursor: 'pointer',
            }}
          >
            1 ngày (10/11)
          </button>

          <button
            type="button"
            onClick={() => handlePreset('empty_range', '2025-01-01', '2025-01-07')}
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 500,
              border: '1px solid',
              borderColor: activePreset === 'empty_range' ? '#0B132B' : '#E2E8F0',
              background: activePreset === 'empty_range' ? '#0B132B' : '#FFFFFF',
              color: activePreset === 'empty_range' ? '#FFFFFF' : '#64748B',
              cursor: 'pointer',
            }}
          >
            Khoảng trống (Empty)
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.2rem', fontSize: '0.8rem', color: '#475569' }}>
        {activeMetric === 'revenue' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#C5A880', display: 'inline-block' }} />
              <span>Doanh thu lưu trú (Accrual)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#0B132B', display: 'inline-block' }} />
              <span>Dòng tiền thực thu (Cash Flow)</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#C5A880', display: 'inline-block' }} />
              <span>ADR (Giá bán bình quân/đêm)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#0B132B', display: 'inline-block' }} />
              <span>RevPAR (Doanh thu/phòng khả dụng)</span>
            </div>
          </>
        )}
      </div>

      {/* Chart Canvas Area */}
      {filteredPoints.length === 0 ? (
        <div
          style={{
            height: 220,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FDFBF7',
            borderRadius: 12,
            border: '1px dashed #E2D9C8',
            color: '#94A3B8',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={28} style={{ marginBottom: 6, color: '#C5A880' }} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            Không có dữ liệu xu hướng trong khoảng thời gian đã chọn
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748B', maxWidth: 420, marginBottom: '0.75rem' }}>
            Kỳ đối soát từ {formatDisplayDate(appliedRange.startDate)} đến {formatDisplayDate(appliedRange.endDate)} chưa có phát sinh giao dịch.
          </span>
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              background: '#0B132B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} />
            <span>Khôi phục khoảng mặc định</span>
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: filteredPoints.length === 1 ? 'center' : 'space-between',
              height: 220,
              gap: filteredPoints.length <= 3 ? '24px' : '8px',
              paddingTop: '20px',
              borderBottom: '1px solid #E2D9C8',
              minWidth: filteredPoints.length * (filteredPoints.length > 25 ? 28 : filteredPoints.length > 15 ? 38 : 55),
            }}
          >
            {filteredPoints.map((p, idx) => {
              const valA = activeMetric === 'revenue' ? Number(p.roomRevenue || 0) : Number(p.adr || 0);
              const valB = activeMetric === 'revenue' ? Number(p.netCashFlow || 0) : Number(p.revpar || 0);

              // Safe height computation: 0 if value is 0, else between 4% and 100%
              const heightPctA = valA > 0 ? Math.max(4, Math.min(100, (valA / maxVal) * 100)) : 0;
              const heightPctB = valB > 0 ? Math.max(4, Math.min(100, (valB / maxVal) * 100)) : 0;
              const isHovered = hoveredIndex === idx;

              // Responsive bar width based on count of points
              const barWidth = filteredPoints.length > 35 ? '6px' : filteredPoints.length > 20 ? '8px' : filteredPoints.length > 10 ? '10px' : '12px';

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    flex: filteredPoints.length === 1 ? 'none' : 1,
                    width: filteredPoints.length === 1 ? '80px' : 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {/* Hover Tooltip */}
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '105%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
                        pointerEvents: 'none',
                        border: '1px solid rgba(197, 168, 128, 0.4)',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#C5A880', marginBottom: 3 }}>
                        {p.date}
                      </div>
                      <div>
                        {activeMetric === 'revenue' ? 'Doanh thu lưu trú:' : 'ADR:'}{' '}
                        <strong>{formatCurrency(valA)}</strong>
                      </div>
                      <div>
                        {activeMetric === 'revenue' ? 'Thực thu ròng:' : 'RevPAR:'}{' '}
                        <strong>{formatCurrency(valB)}</strong>
                      </div>
                      {p.occupancyRate != null && (
                        <div style={{ marginTop: 2, color: '#94A3B8' }}>
                          Lấp đầy: <strong style={{ color: '#FFFFFF' }}>{formatOccupancyPercent(p.occupancyRate)}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dual Bar Group */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100%', width: '100%', justifyContent: 'center' }}>
                    {/* Bar A: roomRevenue or adr */}
                    <div
                      style={{
                        width: barWidth,
                        height: `${heightPctA}%`,
                        backgroundColor: '#C5A880',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 250ms ease, opacity 150ms ease',
                        opacity: isHovered ? 1 : 0.9,
                      }}
                      title={`${activeMetric === 'revenue' ? 'Lưu trú' : 'ADR'}: ${valA.toLocaleString('vi-VN')} ₫`}
                    />
                    {/* Bar B: netCashFlow or revpar */}
                    <div
                      style={{
                        width: barWidth,
                        height: `${heightPctB}%`,
                        backgroundColor: '#0B132B',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 250ms ease, opacity 150ms ease',
                        opacity: isHovered ? 1 : 0.85,
                      }}
                      title={`${activeMetric === 'revenue' ? 'Thực thu' : 'RevPAR'}: ${valB.toLocaleString('vi-VN')} ₫`}
                    />
                  </div>

                  {/* X-axis date label */}
                  <span
                    style={{
                      fontSize: filteredPoints.length > 25 ? '0.6rem' : '0.68rem',
                      color: isHovered ? '#0F172A' : '#64748B',
                      fontWeight: isHovered ? 700 : 500,
                      marginTop: '6px',
                      userSelect: 'none',
                    }}
                  >
                    {formatDateLabel(p.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

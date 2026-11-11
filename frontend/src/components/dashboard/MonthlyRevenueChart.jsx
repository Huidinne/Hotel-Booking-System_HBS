import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { DashboardChartState } from './DashboardChartState';
import { formatVND } from '../../utils/dashboardFormatters';

export { formatVND };

/**
 * Format abbreviated currency for Y-axis ticks
 */
const formatAxisVND = (value) => {
  if (!value || isNaN(value)) return '0 ₫';
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B ₫`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(0)}M ₫`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K ₫`;
  }
  return `${Number(value).toLocaleString('vi-VN')} ₫`;
};

/**
 * MonthlyRevenueChart
 * Visualizes monthly revenue trends with Y-axis value scale, X-axis month ticks,
 * responsive bar layout, accurate VNĐ tooltip, and handling for 0, 1, or 12 months.
 */
export function MonthlyRevenueChart({
  data = [],
  loading = false,
  error = null,
  onRetry,
  title = 'Doanh Thu Theo Tháng',
  subtitle = 'Biểu đồ diễn biến doanh thu thực thu theo từng tháng',
  className = '',
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // An toàn khi mảng data rỗng
  const points = Array.isArray(data) ? data : [];
  const isEmpty = !loading && !error && points.length === 0;

  // Tính toán giá trị lớn nhất cho trục Y (làm tròn lên mốc đẹp)
  const rawMax = points.reduce((max, item) => Math.max(max, Number(item.revenue) || 0), 0);
  // Nếu tất cả = 0 thì gán maxVal = 10.000.000 để trục Y hiển thị hợp lý
  const maxVal = rawMax > 0 ? Math.ceil(rawMax * 1.15) : 10000000;

  // 4 mốc trục Y: 100%, 75%, 50%, 25%, 0%
  const yTicks = [
    maxVal,
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  // Rút gọn nhãn tháng trên trục X nếu dài (ví dụ: "Tháng 01/2026" -> "Thg 01")
  const formatMonthTick = (monthStr) => {
    if (!monthStr) return '';
    const match = monthStr.match(/(\d{1,2})\/(\d{4})/);
    if (match) {
      return `T${match[1]}`;
    }
    return monthStr.replace('Tháng ', 'T');
  };

  return (
    <div
      className={`dashboard-card-panel monthly-revenue-panel chart-card ${className}`.trim()}
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Panel Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <BarChart3 size={18} style={{ color: '#C5A880' }} />
          <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#0F172A' }}>
            {title}
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
          {subtitle} {points.length > 0 && `(${points.length} tháng dữ liệu)`}
        </p>
      </div>

      {/* Chart Canvas or State (Loading / Error / Empty) */}
      <DashboardChartState
        loading={loading}
        error={error}
        empty={isEmpty}
        emptyMessage="Chưa có dữ liệu doanh thu trong khoảng thời gian này"
        onRetry={onRetry}
        minHeight={260}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 260,
            display: 'flex',
            paddingTop: '20px',
            boxSizing: 'border-box',
          }}
        >
          {/* Y-Axis Value Labels */}
          <div
            style={{
              width: '65px',
              height: '190px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingRight: '10px',
              fontSize: '0.7rem',
              color: '#94A3B8',
              fontWeight: 500,
              userSelect: 'none',
            }}
          >
            {yTicks.map((tick, idx) => (
              <span key={idx} title={formatVND(tick)}>
                {formatAxisVND(tick)}
              </span>
            ))}
          </div>

          {/* Plot Area with Grid Lines and Bars */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              height: '190px',
              borderLeft: '1px solid #CBD5E1',
              borderBottom: '1px solid #CBD5E1',
            }}
          >
            {/* Background Grid Lines */}
            {[0, 25, 50, 75, 100].map((pct, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: `${pct}%`,
                  height: '1px',
                  backgroundColor: '#F1F5F9',
                  borderTop: pct > 0 && pct < 100 ? '1px dashed #E2E8F0' : 'none',
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Bars Container */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: points.length === 1 ? 'center' : 'space-around',
                padding: '0 8px',
                gap: points.length <= 3 ? '24px' : '6px',
              }}
            >
              {points.map((item, index) => {
                const revenue = Number(item.revenue) || 0;
                // Chiều cao cột: min 3% nếu revenue > 0 để hiển thị được thanh
                const heightPct = revenue > 0 ? Math.max(3, Math.min(100, (revenue / maxVal) * 100)) : 0;
                const isHovered = hoveredIndex === index;

                // Chiều rộng cột: tối đa 48px khi ít tháng, tối thiểu 14px khi 12 tháng
                const barWidth = points.length === 1 ? '56px' : points.length <= 4 ? '36px' : '22px';

                return (
                  <div
                    key={index}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      position: 'relative',
                      cursor: 'pointer',
                      flex: points.length > 6 ? 1 : 'none',
                      maxWidth: barWidth,
                      minWidth: '14px',
                    }}
                  >
                    {/* Tooltip on Hover */}
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
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          zIndex: 30,
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.25)',
                          pointerEvents: 'none',
                          border: '1px solid rgba(197, 168, 128, 0.4)',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#C5A880', marginBottom: '2px' }}>
                          {item.month}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#94A3B8' }}>Doanh thu:</span>
                          <strong style={{ color: '#FFFFFF', fontSize: '0.8rem' }}>
                            {formatVND(revenue)}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* Column Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPct}%`,
                        background: isHovered
                          ? 'linear-gradient(180deg, #D4AF37 0%, #0B132B 100%)'
                          : 'linear-gradient(180deg, #C5A880 0%, #0B132B 100%)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 300ms ease, transform 150ms ease, opacity 150ms ease',
                        transform: isHovered ? 'scaleY(1.02)' : 'scaleY(1)',
                        transformOrigin: 'bottom',
                        boxShadow: isHovered ? '0 0 10px rgba(197, 168, 128, 0.5)' : 'none',
                        opacity: isHovered ? 1 : 0.9,
                      }}
                    />

                    {/* X-axis Label below bar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        marginTop: '6px',
                        fontSize: points.length > 8 ? '0.68rem' : '0.72rem',
                        fontWeight: isHovered ? 700 : 500,
                        color: isHovered ? '#0F172A' : '#64748B',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                      }}
                      title={item.month}
                    >
                      {points.length <= 6 ? item.month : formatMonthTick(item.month)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DashboardChartState>
    </div>
  );
}

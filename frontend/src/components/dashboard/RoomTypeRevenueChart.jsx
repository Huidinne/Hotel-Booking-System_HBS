import React, { useState } from 'react';
import { PieChart } from 'lucide-react';
import { DashboardChartState } from './DashboardChartState';
import { formatVND } from './MonthlyRevenueChart';

// Elegant luxury color palette for room types
const ROOM_TYPE_COLORS = [
  '#C5A880', // Champagne Gold
  '#0B132B', // Royal Navy
  '#2563EB', // Sapphire Blue
  '#10B981', // Emerald
  '#D97706', // Amber Gold
  '#8B5CF6', // Purple
  '#EC4899', // Rose Pink
];

/**
 * RoomTypeRevenueChart
 * Visualizes the breakdown of hotel revenue by room type using an interactive SVG Donut
 * chart and a detailed responsive breakdown list.
 * Safely guards against totalRevenue === 0 (avoiding NaN and Infinity).
 */
export function RoomTypeRevenueChart({
  data = [],
  loading = false,
  error = null,
  onRetry,
  title = 'Cơ Cấu Doanh Thu Theo Loại Phòng',
  subtitle = 'Tỷ trọng đóng góp doanh thu của từng hạng phòng',
  className = '',
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const items = Array.isArray(data) ? data : [];
  const isEmpty = !loading && !error && items.length === 0;

  // Tính tổng doanh thu an toàn
  const totalRevenue = items.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);

  // Tính toán tỷ trọng % cho từng loại phòng theo đúng công thức
  // percentage = totalRevenue > 0 ? (roomTypeRevenue / totalRevenue) * 100 : 0;
  const processedItems = items.map((item, idx) => {
    const rev = Number(item.revenue) || 0;
    const computedPct = totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0;
    // Làm tròn 1 chữ số thập phân, đảm bảo không có NaN
    const safePct = isNaN(computedPct) ? 0 : Number(computedPct.toFixed(1));

    return {
      ...item,
      safeRevenue: rev,
      computedPercentage: safePct,
      color: ROOM_TYPE_COLORS[idx % ROOM_TYPE_COLORS.length],
    };
  });

  // SVG Donut calculation
  const radius = 64;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius; // ~402.12

  let accumulatedPercent = 0;
  const donutSlices = processedItems.map((item) => {
    const strokeDasharray = `${(item.computedPercentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.computedPercentage;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeItem = hoveredIndex !== null ? processedItems[hoveredIndex] : null;

  return (
    <div
      className={`dashboard-card-panel room-type-revenue-panel chart-card ${className}`.trim()}
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
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <PieChart size={18} style={{ color: '#C5A880' }} />
          <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#0F172A' }}>
            {title}
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B' }}>
          {subtitle} {totalRevenue > 0 && `(Tổng: ${formatVND(totalRevenue)})`}
        </p>
      </div>

      <DashboardChartState
        loading={loading}
        error={error}
        empty={isEmpty}
        emptyMessage="Chưa có dữ liệu cơ cấu loại phòng trong khoảng thời gian này"
        onRetry={onRetry}
        minHeight={260}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
            minHeight: 260,
          }}
        >
          {/* Donut Chart Visual */}
          <div
            style={{
              position: 'relative',
              width: 170,
              height: 170,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              flexShrink: 0,
            }}
          >
            <svg
              width="170"
              height="170"
              viewBox="0 0 170 170"
              style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
            >
              {/* Background ring */}
              <circle
                cx="85"
                cy="85"
                r={radius}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />

              {/* Slices */}
              {totalRevenue > 0 ? (
                donutSlices.map((slice, idx) => {
                  const isHovered = hoveredIndex === idx;
                  return (
                    <circle
                      key={idx}
                      cx="85"
                      cy="85"
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      style={{
                        cursor: 'pointer',
                        transition: 'stroke-width 150ms ease, opacity 150ms ease',
                        opacity: hoveredIndex === null || isHovered ? 1 : 0.6,
                      }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  );
                })
              ) : (
                /* Fallback ring when total revenue is 0 */
                <circle
                  cx="85"
                  cy="85"
                  r={radius}
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth={strokeWidth}
                />
              )}
            </svg>

            {/* Donut Center Display */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                textAlign: 'center',
                padding: '10px',
              }}
            >
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                {activeItem ? activeItem.roomTypeName : 'Tổng doanh thu'}
              </span>
              <strong
                style={{
                  fontSize: activeItem ? '0.85rem' : '0.82rem',
                  color: '#0F172A',
                  fontWeight: 700,
                  marginTop: '2px',
                }}
              >
                {activeItem ? formatVND(activeItem.safeRevenue) : formatVND(totalRevenue)}
              </strong>
              {activeItem && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: activeItem.color,
                    fontWeight: 700,
                    marginTop: '1px',
                  }}
                >
                  {activeItem.computedPercentage}%
                </span>
              )}
            </div>
          </div>

          {/* Breakdown List & Legend */}
          <div
            style={{
              flex: 1,
              minWidth: '220px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxHeight: '260px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {processedItems.map((item, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isHovered ? '#F8FAFC' : 'transparent',
                    border: '1px solid',
                    borderColor: isHovered ? '#CBD5E1' : 'transparent',
                    transition: 'all 150ms ease',
                    cursor: 'pointer',
                    position: 'relative',
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
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        zIndex: 30,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        pointerEvents: 'none',
                        border: `1px solid ${item.color}`,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#C5A880' }}>
                        {item.roomTypeName}
                      </div>
                      <div>
                        Doanh thu: <strong>{formatVND(item.safeRevenue)}</strong>
                      </div>
                      <div>
                        Tỷ trọng: <strong>{item.computedPercentage}%</strong>
                      </div>
                    </div>
                  )}

                  {/* Header row: Dot + Name + Pct + Rev */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      marginBottom: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontWeight: isHovered ? 700 : 600,
                          color: '#1E293B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '140px',
                        }}
                        title={item.roomTypeName}
                      >
                        {item.roomTypeName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, color: item.color, fontSize: '0.82rem' }}>
                        {item.computedPercentage}%
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {formatVND(item.safeRevenue)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      background: '#F1F5F9',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${item.computedPercentage}%`,
                        height: '100%',
                        backgroundColor: item.color,
                        borderRadius: '999px',
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardChartState>
    </div>
  );
}

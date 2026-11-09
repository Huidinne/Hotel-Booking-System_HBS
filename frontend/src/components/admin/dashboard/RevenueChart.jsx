import React, { useState } from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';

/**
 * RevenueChart - Independent Revenue & ADR/RevPAR Trend Chart Component
 * Implements SVG Bar & Trend visualization matching Grand Aurora luxury design.
 * Handles empty, null, or dynamic data without breaking layout.
 */
export function RevenueChart({
  series = [],
  data, // Optional full summary object or array
  title = 'Xu Hướng Doanh Thu & Hiệu Suất Theo Ngày',
  subtitle,
  dateFrom,
  dateTo,
  className = '',
}) {
  // Normalize series input
  const points = Array.isArray(series) && series.length > 0
    ? series
    : (Array.isArray(data?.revenueSeries) ? data.revenueSeries : []);

  // Metric View Toggle: 'revenue' (Room Revenue vs Cash Flow) or 'kpi' (ADR vs RevPAR)
  const [activeMetric, setActiveMetric] = useState('revenue');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return '0 đ';
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M đ`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(0)}K đ`;
    }
    return `${Number(val).toLocaleString('vi-VN')} đ`;
  };

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

  // Safe maximum calculation to avoid divide-by-zero
  const maxVal = Math.max(
    ...points.map((p) => {
      if (activeMetric === 'revenue') {
        return Math.max(Number(p.roomRevenue || 0), Number(p.netCashFlow || 0));
      } else {
        return Math.max(Number(p.adr || 0), Number(p.revpar || 0));
      }
    }),
    1
  );

  return (
    <div className={`dashboard-card-panel revenue-chart-panel ${className}`.trim()} style={{ width: '100%', marginBottom: '2.4rem' }}>
      {/* Chart Header */}
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
            <BarChart3 size={18} className="text-gold" style={{ color: '#C5A880' }} />
            <h2 className="panel-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
              {title}
            </h2>
          </div>
          <p className="panel-desc" style={{ margin: 0, fontSize: '0.84rem', color: '#64748B' }}>
            {subtitle || (dateFrom && dateTo ? `Dữ liệu chuỗi ngày từ ${dateFrom} đến ${dateTo}` : 'Phân tích đa chiều doanh thu lưu trú và dòng tiền đối soát')}
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
      {points.length === 0 ? (
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
          }}
        >
          <AlertCircle size={28} style={{ marginBottom: 6, color: '#C5A880' }} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Chưa có chuỗi dữ liệu xu hướng trong kỳ</span>
          <span style={{ fontSize: '0.78rem' }}>Dữ liệu biểu đồ theo ngày sẽ hiển thị khi có phát sinh giao dịch.</span>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: 220,
              gap: '12px',
              paddingTop: '20px',
              borderBottom: '1px solid #E2D9C8',
              minWidth: points.length * 55,
            }}
          >
            {points.map((p, idx) => {
              const valA = activeMetric === 'revenue' ? Number(p.roomRevenue || 0) : Number(p.adr || 0);
              const valB = activeMetric === 'revenue' ? Number(p.netCashFlow || 0) : Number(p.revpar || 0);

              const heightPctA = Math.max(4, Math.min(100, (valA / maxVal) * 100));
              const heightPctB = Math.max(4, Math.min(100, (valB / maxVal) * 100));
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    flex: 1,
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
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                        pointerEvents: 'none',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#C5A880', marginBottom: 2 }}>
                        {p.date}
                      </div>
                      <div>
                        {activeMetric === 'revenue' ? 'Lưu trú:' : 'ADR:'}{' '}
                        <strong>{formatCurrency(valA)}</strong>
                      </div>
                      <div>
                        {activeMetric === 'revenue' ? 'Thực thu:' : 'RevPAR:'}{' '}
                        <strong>{formatCurrency(valB)}</strong>
                      </div>
                      {p.occupancyRate != null && (
                        <div>
                          Lấp đầy: <strong>{Math.round(p.occupancyRate * 100)}%</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dual Bar Group */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100%', width: '100%', justifyContent: 'center' }}>
                    {/* Bar A: roomRevenue or adr */}
                    <div
                      style={{
                        width: '12px',
                        height: `${heightPctA}%`,
                        backgroundColor: '#C5A880',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 250ms ease, opacity 150ms ease',
                        opacity: isHovered ? 1 : 0.9,
                      }}
                      title={`${activeMetric === 'revenue' ? 'Lưu trú' : 'ADR'}: ${valA.toLocaleString('vi-VN')} đ`}
                    />
                    {/* Bar B: netCashFlow or revpar */}
                    <div
                      style={{
                        width: '12px',
                        height: `${heightPctB}%`,
                        backgroundColor: '#0B132B',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 250ms ease, opacity 150ms ease',
                        opacity: isHovered ? 1 : 0.85,
                      }}
                      title={`${activeMetric === 'revenue' ? 'Thực thu' : 'RevPAR'}: ${valB.toLocaleString('vi-VN')} đ`}
                    />
                  </div>

                  {/* X-axis date label */}
                  <span style={{ fontSize: '0.68rem', color: isHovered ? '#0F172A' : '#64748B', fontWeight: isHovered ? 700 : 500, marginTop: '6px' }}>
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

import React from 'react';
import { AlertCircle, Inbox, RefreshCw, Loader2 } from 'lucide-react';

/**
 * DashboardChartState
 * Handles Loading, Empty, and Error states cleanly across all dashboard charts.
 * Preserves stable layout container height to avoid layout shift.
 */
export function DashboardChartState({
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'Chưa có dữ liệu thống kê trong khoảng thời gian này',
  onRetry,
  minHeight = 280,
  children,
}) {
  // Trạng thái Loading
  if (loading) {
    return (
      <div
        className="dashboard-state-container loading-state"
        style={{
          minHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #FDFBF7 0%, #F8F5EE 100%)',
          borderRadius: '12px',
          border: '1px solid #EAE4D6',
          padding: '2rem',
          gap: '1rem',
        }}
      >
        <Loader2
          size={36}
          style={{
            color: '#C5A880',
            animation: 'spin 1s linear infinite',
          }}
        />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>
            Đang tải dữ liệu biểu đồ...
          </p>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Vui lòng chờ trong giây lát
          </span>
        </div>
      </div>
    );
  }

  // Trạng thái Error
  if (error) {
    return (
      <div
        className="dashboard-state-container error-state"
        style={{
          minHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFF5F5',
          borderRadius: '12px',
          border: '1px solid #FED7D7',
          padding: '2rem',
          gap: '0.75rem',
          textAlign: 'center',
        }}
      >
        <AlertCircle size={36} style={{ color: '#E53E3E' }} />
        <div>
          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#9B2C2C' }}>
            Không thể tải dữ liệu
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#742A2A', maxWidth: 360 }}>
            {error || 'Đã có lỗi xảy ra trong quá trình truy xuất dữ liệu thống kê.'}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              marginTop: '0.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              background: '#0B132B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            <RefreshCw size={14} />
            <span>Thử lại</span>
          </button>
        )}
      </div>
    );
  }

  // Trạng thái Empty
  if (empty) {
    return (
      <div
        className="dashboard-state-container empty-state"
        style={{
          minHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FDFBF7',
          borderRadius: '12px',
          border: '1px dashed #DDD5C7',
          padding: '2rem',
          textAlign: 'center',
          gap: '0.5rem',
        }}
      >
        <Inbox size={38} style={{ color: '#C5A880', opacity: 0.8 }} />
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
          {emptyMessage}
        </p>
        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
          Hãy chọn khoảng thời gian khác hoặc kiểm tra lại bộ lọc ngày
        </span>
      </div>
    );
  }

  return children;
}

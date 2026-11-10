import React, { useState, useEffect } from 'react';
import { Calendar, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * DashboardDateRange
 * Date range filter component for dashboard revenue & room type analytics.
 * Includes start date, end date, date validation, and testing presets for validation acceptance.
 */
export function DashboardDateRange({
  startDate = '2026-01-01',
  endDate = '2026-12-31',
  onChange,
  onPresetSelect,
  activePreset = 'full_year',
}) {
  const [internalStart, setInternalStart] = useState(startDate);
  const [internalEnd, setInternalEnd] = useState(endDate);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setInternalStart(startDate);
  }, [startDate]);

  useEffect(() => {
    setInternalEnd(endDate);
  }, [endDate]);

  const handleApply = (e) => {
    if (e) e.preventDefault();

    if (!internalStart || !internalEnd) {
      setValidationError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc');
      return;
    }

    if (new Date(internalStart) > new Date(internalEnd)) {
      setValidationError('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }

    setValidationError('');
    if (onChange) {
      onChange({ startDate: internalStart, endDate: internalEnd });
    }
  };

  const handlePreset = (presetKey, start, end) => {
    setValidationError('');
    setInternalStart(start);
    setInternalEnd(end);
    if (onPresetSelect) {
      onPresetSelect(presetKey, { startDate: start, endDate: end });
    } else if (onChange) {
      onChange({ startDate: start, endDate: end });
    }
  };

  // Format date display (DD/MM/YYYY)
  const formatDisplayDate = (dStr) => {
    if (!dStr) return '';
    try {
      const [y, m, d] = dStr.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return dStr;
    }
  };

  return (
    <div
      className="dashboard-card-panel date-range-panel"
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Title and Active Status */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Calendar size={18} style={{ color: '#C5A880' }} />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
              Bộ Lọc Khoảng Thời Gian Thống Kê
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#64748B' }}>
            <CheckCircle2 size={14} style={{ color: '#10B981' }} />
            <span>Đang chọn: </span>
            <strong style={{ color: '#0F172A' }}>
              {formatDisplayDate(startDate)} — {formatDisplayDate(endDate)}
            </strong>
          </div>
        </div>

        {/* Date Inputs Form */}
        <form
          onSubmit={handleApply}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="dashboard-start-date" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              Từ ngày:
            </label>
            <input
              id="dashboard-start-date"
              type="date"
              value={internalStart}
              onChange={(e) => {
                setInternalStart(e.target.value);
                setValidationError('');
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                color: '#0F172A',
                background: '#F8FAFC',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="dashboard-end-date" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              Đến ngày:
            </label>
            <input
              id="dashboard-end-date"
              type="date"
              value={internalEnd}
              onChange={(e) => {
                setInternalEnd(e.target.value);
                setValidationError('');
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                color: '#0F172A',
                background: '#F8FAFC',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
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
            <Filter size={14} />
            <span>Áp dụng</span>
          </button>
        </form>
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '8px 12px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#B91C1C',
            fontSize: '0.8rem',
          }}
        >
          <AlertTriangle size={15} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Quick Testing Presets */}
      <div
        style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px dashed #E2E8F0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginRight: '4px' }}>
          Mẫu kiểm thử nhanh:
        </span>

        <button
          type="button"
          onClick={() => handlePreset('full_year', '2026-01-01', '2026-12-31')}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid',
            borderColor: activePreset === 'full_year' ? '#0B132B' : '#E2E8F0',
            background: activePreset === 'full_year' ? '#0B132B' : '#F8FAFC',
            color: activePreset === 'full_year' ? '#FFFFFF' : '#334155',
            cursor: 'pointer',
          }}
        >
          12 tháng (Năm 2026)
        </button>

        <button
          type="button"
          onClick={() => handlePreset('single', '2026-10-01', '2026-10-31')}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid',
            borderColor: activePreset === 'single' ? '#0B132B' : '#E2E8F0',
            background: activePreset === 'single' ? '#0B132B' : '#F8FAFC',
            color: activePreset === 'single' ? '#FFFFFF' : '#334155',
            cursor: 'pointer',
          }}
        >
          1 tháng (Tháng 10/2026)
        </button>

        <button
          type="button"
          onClick={() => handlePreset('empty', '2020-01-01', '2020-12-31')}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid',
            borderColor: activePreset === 'empty' ? '#0B132B' : '#E2E8F0',
            background: activePreset === 'empty' ? '#0B132B' : '#F8FAFC',
            color: activePreset === 'empty' ? '#FFFFFF' : '#334155',
            cursor: 'pointer',
          }}
        >
          0 tháng (Empty State)
        </button>

        <button
          type="button"
          onClick={() => handlePreset('zero', '2026-05-01', '2026-05-31')}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid',
            borderColor: activePreset === 'zero' ? '#0B132B' : '#E2E8F0',
            background: activePreset === 'zero' ? '#0B132B' : '#F8FAFC',
            color: activePreset === 'zero' ? '#FFFFFF' : '#334155',
            cursor: 'pointer',
          }}
        >
          Doanh thu = 0 (NaN Check)
        </button>

        <button
          type="button"
          onClick={() => handlePreset('loading', internalStart, internalEnd)}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid',
            borderColor: activePreset === 'loading' ? '#C5A880' : '#E2E8F0',
            background: activePreset === 'loading' ? '#C5A880' : '#F8FAFC',
            color: activePreset === 'loading' ? '#FFFFFF' : '#854D0E',
            cursor: 'pointer',
          }}
        >
          Giả lập Loading
        </button>

        <button
          type="button"
          onClick={() => handlePreset('error', internalStart, internalEnd)}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid',
            borderColor: activePreset === 'error' ? '#EF4444' : '#E2E8F0',
            background: activePreset === 'error' ? '#EF4444' : '#F8FAFC',
            color: activePreset === 'error' ? '#FFFFFF' : '#991B1B',
            cursor: 'pointer',
          }}
        >
          Giả lập Lỗi (Error)
        </button>
      </div>
    </div>
  );
}

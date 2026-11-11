// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT FILTER BAR COMPONENT
// File: src/components/audit/AuditFilterBar.jsx
// Filter controls for audit logs: Email (debounced), Action, Role, Status, Date range, Reset
// Uses native inline CSS and design tokens - 100% compatible with App.css (No Tailwind dependency)
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Mail, RotateCcw, Calendar, Activity, Shield, Filter, Search } from 'lucide-react';
import { AUDIT_ACTIONS_METADATA } from '../../mock/auditMock';

export function AuditFilterBar({
  filters,
  onChange,
  onReset,
  actions = AUDIT_ACTIONS_METADATA,
}) {
  // Local state for debounced email input to prevent lag and unnecessary API calls
  const [localEmail, setLocalEmail] = useState(filters.actorEmail || '');
  const debounceTimerRef = useRef(null);

  // Synchronize local input state whenever external filters.actorEmail changes (e.g., onReset)
  useEffect(() => {
    setLocalEmail(filters.actorEmail || '');
  }, [filters.actorEmail]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleEmailChange = (value) => {
    setLocalEmail(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange({
        ...filters,
        actorEmail: value,
      });
    }, 300);
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onChange({
        ...filters,
        actorEmail: localEmail,
      });
    }
  };

  const handleFieldChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  const hasActiveFilters = Boolean(
    filters.actorEmail ||
    filters.action ||
    filters.startDate ||
    filters.endDate ||
    filters.status ||
    filters.role
  );

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        padding: '1.25rem',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Top Filter Grid: Responsive auto-fit grid across all screens */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end',
        }}
      >
        {/* 1. Filter Email người thực hiện (Debounced) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label
            htmlFor="filter-actor-email"
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Mail size={14} color="#64748B" />
            <span>Email người thực hiện</span>
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              id="filter-actor-email"
              type="text"
              placeholder="VD: receptionist@hotel.com..."
              value={localEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              onKeyDown={handleEmailKeyDown}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.86rem',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
              }}
            />
            <Search
              size={13}
              color="#94A3B8"
              style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* 2. Filter Hành động (Action) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label
            htmlFor="filter-action"
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Activity size={14} color="#64748B" />
            <span>Hành động ({actions.length})</span>
          </label>
          <select
            id="filter-action"
            value={filters.action || ''}
            onChange={(e) => handleFieldChange('action', e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.86rem',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả các hành động ({actions.length})</option>
            {actions.map((act) => (
              <option key={act.name} value={act.name}>
                {act.description} ({act.name})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Filter Vai trò (Role) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label
            htmlFor="filter-role"
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Shield size={14} color="#64748B" />
            <span>Vai trò</span>
          </label>
          <select
            id="filter-role"
            value={filters.role || ''}
            onChange={(e) => handleFieldChange('role', e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.86rem',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả vai trò</option>
            <option value="ROLE_ADMIN">Quản trị viên (ROLE_ADMIN)</option>
            <option value="ROLE_RECEPTIONIST">Lễ tân (ROLE_RECEPTIONIST)</option>
            <option value="ROLE_CUSTOMER">Khách hàng (ROLE_CUSTOMER)</option>
            <option value="SYSTEM">Hệ thống tự động (SYSTEM)</option>
          </select>
        </div>

        {/* 4. Filter Trạng thái (Status: ALL, SUCCESS, FAILED) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label
            htmlFor="filter-status"
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Filter size={14} color="#64748B" />
            <span>Trạng thái kết quả</span>
          </label>
          <select
            id="filter-status"
            value={filters.status || ''}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.86rem',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SUCCESS">Thành công (SUCCESS)</option>
            <option value="FAILED">Thất bại / Lỗi (FAILED)</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Date range filter & Reset button */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '1rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid #F1F5F9',
          gap: '0.75rem',
        }}
      >
        {/* Date Range Inputs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={15} color="#64748B" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
              Khoảng ngày:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="date"
              aria-label="Từ ngày"
              value={filters.startDate ? filters.startDate.substring(0, 10) : ''}
              onChange={(e) => handleFieldChange('startDate', e.target.value)}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                outline: 'none',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
              }}
            />
            <span style={{ color: '#94A3B8', fontSize: '0.82rem' }}>đến</span>
            <input
              type="date"
              aria-label="Đến ngày"
              value={filters.endDate ? filters.endDate.substring(0, 10) : ''}
              onChange={(e) => handleFieldChange('endDate', e.target.value)}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                outline: 'none',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
              }}
            />
          </div>
        </div>

        {/* Reset Filter Button */}
        <button
          type="button"
          onClick={() => {
            setLocalEmail('');
            onReset();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            border: hasActiveFilters ? '1px solid #93C5FD' : '1px solid #CBD5E1',
            backgroundColor: hasActiveFilters ? '#EFF6FF' : '#F8FAFC',
            color: hasActiveFilters ? '#1D4ED8' : '#64748B',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Xóa trắng các trường lọc và quay về trang đầu"
        >
          <RotateCcw size={14} color={hasActiveFilters ? '#1D4ED8' : '#64748B'} />
          <span>Đặt lại bộ lọc</span>
          {hasActiveFilters && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#2563EB',
                display: 'inline-block',
              }}
            />
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT FILTER BAR
// File: src/components/audit/AuditFilterBar.jsx
// Filter controls for audit logs: search, action, role, status, date range
// =============================================================================

import React from 'react';
import { Search, RotateCcw, Filter, Calendar } from 'lucide-react';
import { AUDIT_ACTIONS_METADATA } from '../../mock/auditMock';

export function AuditFilterBar({
  filters,
  onChange,
  onReset,
  actions = AUDIT_ACTIONS_METADATA,
}) {
  const handleInputChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

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
      {/* Top row: Search and primary dropdowns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end',
        }}
      >
        {/* Search by actor email / target */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
            Tìm kiếm người thực hiện / Đối tượng
          </label>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
              }}
            />
            <input
              type="text"
              placeholder="Email, ID đối tượng (VD: BK-9023, #12)..."
              value={filters.actorEmail || ''}
              onChange={(e) => handleInputChange('actorEmail', e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Action Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
            Hành động (Action)
          </label>
          <select
            value={filters.action || ''}
            onChange={(e) => handleInputChange('action', e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.88rem',
              backgroundColor: '#FFFFFF',
              outline: 'none',
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

        {/* Role Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
            Vai trò (Role)
          </label>
          <select
            value={filters.role || ''}
            onChange={(e) => handleInputChange('role', e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.88rem',
              backgroundColor: '#FFFFFF',
              outline: 'none',
            }}
          >
            <option value="">Tất cả vai trò</option>
            <option value="ROLE_ADMIN">Quản trị viên (ROLE_ADMIN)</option>
            <option value="ROLE_RECEPTIONIST">Lễ tân (ROLE_RECEPTIONIST)</option>
            <option value="ROLE_CUSTOMER">Khách hàng (ROLE_CUSTOMER)</option>
            <option value="SYSTEM">Tự động hệ thống (SYSTEM)</option>
          </select>
        </div>

        {/* Status Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
            Trạng thái thực thi
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleInputChange('status', e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.88rem',
              backgroundColor: '#FFFFFF',
              outline: 'none',
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SUCCESS">Thành công (SUCCESS)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
          </select>
        </div>
      </div>

      {/* Bottom row: Date range + Reset action */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '1rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid #F1F5F9',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={16} color="#64748B" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
              Khoảng thời gian:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="date"
              value={filters.startDate ? filters.startDate.substring(0, 10) : ''}
              onChange={(e) => handleInputChange('startDate', e.target.value ? `${e.target.value}T00:00:00` : '')}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
              }}
            />
            <span style={{ color: '#94A3B8' }}>đến</span>
            <input
              type="date"
              value={filters.endDate ? filters.endDate.substring(0, 10) : ''}
              onChange={(e) => handleInputChange('endDate', e.target.value ? `${e.target.value}T23:59:59` : '')}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            color: '#475569',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
        >
          <RotateCcw size={14} /> Đặt lại bộ lọc
        </button>
      </div>
    </div>
  );
}


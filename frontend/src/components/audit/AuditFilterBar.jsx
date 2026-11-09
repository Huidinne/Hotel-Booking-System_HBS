// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT FILTER BAR COMPONENT
// File: src/components/audit/AuditFilterBar.jsx
// Filter controls for audit logs: Email (debounced), Action, Role, Status, Date range, Reset
// Mobile-responsive: 1 column on mobile, 2 on tablet, 3-4 on desktop
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
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm mb-6 transition-all">
      {/* Top Filter Grid: Responsive 1 col on mobile, 2 col on tablet, 3-4 col on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 items-end">
        {/* 1. Filter Email người thực hiện (Debounced) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filter-actor-email"
            className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5"
          >
            <Mail size={15} className="text-slate-500 shrink-0" />
            <span>Email người thực hiện</span>
          </label>
          <div className="relative">
            <input
              id="filter-actor-email"
              type="text"
              placeholder="VD: receptionist@hotel.com..."
              value={localEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              onKeyDown={handleEmailKeyDown}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* 2. Filter Hành động (Action) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filter-action"
            className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5"
          >
            <Activity size={15} className="text-slate-500 shrink-0" />
            <span>Hành động ({actions.length})</span>
          </label>
          <select
            id="filter-action"
            value={filters.action || ''}
            onChange={(e) => handleFieldChange('action', e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white transition truncate"
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
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filter-role"
            className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5"
          >
            <Shield size={15} className="text-slate-500 shrink-0" />
            <span>Vai trò</span>
          </label>
          <select
            id="filter-role"
            value={filters.role || ''}
            onChange={(e) => handleFieldChange('role', e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white transition"
          >
            <option value="">Tất cả vai trò</option>
            <option value="ROLE_ADMIN">Quản trị viên (ROLE_ADMIN)</option>
            <option value="ROLE_RECEPTIONIST">Lễ tân (ROLE_RECEPTIONIST)</option>
            <option value="ROLE_CUSTOMER">Khách hàng (ROLE_CUSTOMER)</option>
            <option value="SYSTEM">Hệ thống tự động (SYSTEM)</option>
          </select>
        </div>

        {/* 4. Filter Trạng thái (Status: ALL, SUCCESS, FAILED) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filter-status"
            className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5"
          >
            <Filter size={15} className="text-slate-500 shrink-0" />
            <span>Trạng thái kết quả</span>
          </label>
          <select
            id="filter-status"
            value={filters.status || ''}
            onChange={(e) => handleFieldChange('status', e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white transition"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SUCCESS">Thành công (SUCCESS)</option>
            <option value="FAILED">Thất bại / Lỗi (FAILED)</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Date range filter & Reset button - Responsive wrap */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-4 pt-3.5 border-t border-slate-100 gap-3">
        {/* Date Range Inputs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 shrink-0">
            <Calendar size={15} className="text-slate-500" />
            <span>Khoảng ngày:</span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <input
              type="date"
              aria-label="Từ ngày"
              value={filters.startDate ? filters.startDate.substring(0, 10) : ''}
              onChange={(e) => handleFieldChange('startDate', e.target.value)}
              className="px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-blue-500 outline-none bg-white"
            />
            <span className="hidden sm:inline text-xs text-slate-400 self-center">đến</span>
            <input
              type="date"
              aria-label="Đến ngày"
              value={filters.endDate ? filters.endDate.substring(0, 10) : ''}
              onChange={(e) => handleFieldChange('endDate', e.target.value)}
              className="px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-blue-500 outline-none bg-white"
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
          className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition touch-manipulation min-h-[38px] ${
            hasActiveFilters
              ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 shadow-sm'
              : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
          title="Xóa trắng các trường lọc và quay về trang đầu"
        >
          <RotateCcw size={14} className={hasActiveFilters ? 'text-blue-600' : 'text-slate-400'} />
          <span>Đặt lại bộ lọc</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}

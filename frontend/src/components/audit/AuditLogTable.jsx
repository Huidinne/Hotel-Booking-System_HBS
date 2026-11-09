// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOG TABLE COMPONENT
// File: src/components/audit/AuditLogTable.jsx
// Displays system audit logs with:
// 1. Strict Vietnam Timezone (Asia/Ho_Chi_Minh - UTC+7) formatting
// 2. Responsive Mobile Card View (< 768px) and Desktop Ops Table (>= 768px)
// 3. Robust overflow guards for long emails, IDs, and JSON payloads
// =============================================================================

import React from 'react';
import { Eye, CheckCircle2, XCircle, Clock, User, Layers, Globe } from 'lucide-react';

/**
 * Format timestamp strictly in Vietnam Timezone (Asia/Ho_Chi_Minh - GMT+7)
 * Output: HH:mm:ss dd/MM/yyyy (24-hour format)
 */
export function formatVietnamDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return String(isoString);
  }
}

export function RoleBadge({ role }) {
  const configs = {
    ROLE_ADMIN: {
      label: 'Admin',
      bg: '#F5F3FF',
      color: '#6D28D9',
      border: '#DDD6FE',
    },
    ROLE_RECEPTIONIST: {
      label: 'Lễ tân',
      bg: '#FFFBEB',
      color: '#B45309',
      border: '#FDE68A',
    },
    ROLE_CUSTOMER: {
      label: 'Khách hàng',
      bg: '#F0F9FF',
      color: '#0369A1',
      border: '#BAE6FD',
    },
    SYSTEM: {
      label: 'Hệ thống',
      bg: '#F1F5F9',
      color: '#475569',
      border: '#CBD5E1',
    },
  };

  const conf = configs[role] || {
    label: role || 'N/A',
    bg: '#F8FAFC',
    color: '#64748B',
    border: '#E2E8F0',
  };

  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
      style={{
        backgroundColor: conf.bg,
        color: conf.color,
        border: `1px solid ${conf.border}`,
      }}
    >
      {conf.label}
    </span>
  );
}

export function ActionBadge({ action, description, status }) {
  const isFailed = status === 'FAILED';

  let categoryColor = '#3B82F6';
  let categoryBg = '#EFF6FF';
  let categoryBorder = '#BFDBFE';

  if (action?.includes('AUTH') || action?.includes('LOGIN')) {
    categoryColor = '#6366F1';
    categoryBg = '#EEF2FF';
    categoryBorder = '#C7D2FE';
  } else if (action?.includes('CANCEL') || action?.includes('DELETE')) {
    categoryColor = '#EF4444';
    categoryBg = '#FEF2F2';
    categoryBorder = '#FECACA';
  } else if (action?.includes('REFUND') || action?.includes('PAYMENT')) {
    categoryColor = '#059669';
    categoryBg = '#ECFDF5';
    categoryBorder = '#A7F3D0';
  } else if (action?.includes('ROOM') || action?.includes('PRICE')) {
    categoryColor = '#D97706';
    categoryBg = '#FFFBEB';
    categoryBorder = '#FDE68A';
  }

  return (
    <div className="flex flex-col gap-1 max-w-[280px]">
      <div
        className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap"
        title={description || action}
      >
        {isFailed ? (
          <XCircle size={15} className="text-red-600 shrink-0" />
        ) : (
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
        )}
        <span
          className={`font-semibold text-xs sm:text-sm truncate ${
            isFailed ? 'text-red-700' : 'text-slate-900'
          }`}
        >
          {description || action}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-nowrap">
        <span
          className="text-[11px] px-1.5 py-0.5 rounded font-mono truncate max-w-[190px]"
          style={{
            backgroundColor: categoryBg,
            color: categoryColor,
            border: `1px solid ${categoryBorder}`,
          }}
          title={action}
        >
          {action}
        </span>
        {isFailed && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase whitespace-nowrap">
            LỖI
          </span>
        )}
      </div>
    </div>
  );
}

export function AuditLogTable({ logs = [], onSelectLog }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
        Không có dữ liệu nhật ký kiểm toán phù hợp với bộ lọc hiện tại.
      </div>
    );
  }

  return (
    <div>
      {/* =========================================================================
          1. MOBILE VIEW (< 768px): Card List Layout
          Clean, readable cards with big tap buttons on touch screens
      ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {logs.map((log) => {
          const isFailed = log.status === 'FAILED';
          const timeVn = formatVietnamDateTime(log.createdAt);

          return (
            <div
              key={log.id}
              className={`bg-white rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
                isFailed ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
              }`}
            >
              {/* Header: ID + Time (VN) + Status */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 font-mono" title={`Múi giờ Việt Nam (UTC+7)\nGốc: ${log.createdAt}`}>
                  <Clock size={13} className="text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-700">{timeVn}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    isFailed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isFailed ? 'Thất bại' : 'Thành công'}
                </span>
              </div>

              {/* Action Info */}
              <div className="mb-3">
                <ActionBadge
                  action={log.action}
                  description={log.actionDescription || log.description}
                  status={log.status}
                />
              </div>

              {/* Meta details list */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-slate-500">
                    <User size={13} />
                    <span>Người thực hiện:</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                    <RoleBadge role={log.actorRole} />
                    <span className="font-medium text-slate-900 truncate" title={log.actorEmail}>
                      {log.actorEmail}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[11px]">Đối tượng:</span>
                  <span className="font-medium text-slate-800 truncate" title={`${log.targetType || ''} #${log.targetId || ''}`}>
                    {log.targetType || 'SYSTEM'} {log.targetId ? `#${log.targetId}` : ''}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500 text-[11px]">IP Address:</span>
                  <span className="font-mono text-slate-700 truncate" title={log.ipAddress}>
                    {log.ipAddress || '—'}
                  </span>
                </div>
              </div>

              {/* Footer action button */}
              <button
                type="button"
                onClick={() => onSelectLog(log)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 transition active:scale-[0.99] touch-manipulation min-h-[38px]"
              >
                <Eye size={14} />
                <span>Xem chi tiết nhật ký #{log.id}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          2. DESKTOP VIEW (>= 768px): Ops Data Table
          Full multi-column operational audit trail
      ========================================================================= */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm" style={{ minWidth: '950px' }}>
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold tracking-wider">
              <th className="py-3 px-4 w-[165px]">Thời Gian (VN)</th>
              <th className="py-3 px-4 w-[220px]">Người Thực Hiện</th>
              <th className="py-3 px-4 w-[115px]">Vai Trò</th>
              <th className="py-3 px-4 w-[260px]">Hành Động Nghiệp Vụ</th>
              <th className="py-3 px-4 w-[160px]">Đối Tượng</th>
              <th className="py-3 px-4 w-[130px]">Địa Chỉ IP</th>
              <th className="py-3 px-4 w-[80px] text-center">Chi Tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => {
              const isFailed = log.status === 'FAILED';
              const timeVn = formatVietnamDateTime(log.createdAt);

              return (
                <tr
                  key={log.id}
                  className={`hover:bg-slate-50/80 transition group ${
                    isFailed ? 'bg-red-50/30' : ''
                  }`}
                >
                  {/* 1. Timestamp in Vietnam Time */}
                  <td className="py-3 px-4 text-xs font-mono text-slate-700 whitespace-nowrap">
                    <span
                      title={`Giờ Việt Nam (UTC+7)\nGốc ISO: ${log.createdAt}`}
                      className="cursor-help border-b border-dotted border-slate-400"
                    >
                      {timeVn}
                    </span>
                  </td>

                  {/* 2. Actor Email */}
                  <td className="py-3 px-4">
                    <div className="max-w-[210px] truncate" title={log.actorEmail}>
                      <span className="font-medium text-slate-900 text-xs sm:text-sm">
                        {log.actorEmail}
                      </span>
                    </div>
                  </td>

                  {/* 3. Role */}
                  <td className="py-3 px-4">
                    <RoleBadge role={log.actorRole} />
                  </td>

                  {/* 4. Action */}
                  <td className="py-3 px-4">
                    <ActionBadge
                      action={log.action}
                      description={log.actionDescription || log.description}
                      status={log.status}
                    />
                  </td>

                  {/* 5. Target */}
                  <td className="py-3 px-4">
                    <div className="text-xs max-w-[150px] truncate" title={`${log.targetType || ''} ${log.targetId ? `#${log.targetId}` : ''}`}>
                      <span className="font-semibold text-slate-800">
                        {log.targetType || 'SYSTEM'}
                      </span>
                      {log.targetId && (
                        <span className="font-mono text-slate-500 ml-1">
                          #{log.targetId}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 6. IP Address */}
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs text-slate-600">
                      {log.ipAddress || '—'}
                    </span>
                  </td>

                  {/* 7. Action Button */}
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectLog(log)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition inline-flex items-center justify-center"
                      title="Xem chi tiết toàn bộ payload và metadata"
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

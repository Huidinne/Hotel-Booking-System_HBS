// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOG TABLE COMPONENT
// File: src/components/audit/AuditLogTable.jsx
// Displays system audit logs with:
// 1. Strict Vietnam Timezone (Asia/Ho_Chi_Minh - UTC+7) formatting
// 2. Compatible with project's App.css (ops-data-table & table-responsive-wrapper)
// 3. Robust overflow guards for long emails, IDs, and JSON payloads
// =============================================================================

import React from 'react';
import { Eye, CheckCircle2, XCircle } from 'lucide-react';

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
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.55rem',
        borderRadius: '4px',
        fontSize: '0.78rem',
        fontWeight: 600,
        backgroundColor: conf.bg,
        color: conf.color,
        border: `1px solid ${conf.border}`,
        whiteSpace: 'nowrap',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '260px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={description || action}
      >
        {isFailed ? (
          <XCircle size={15} color="#DC2626" style={{ flexShrink: 0 }} />
        ) : (
          <CheckCircle2 size={15} color="#16A34A" style={{ flexShrink: 0 }} />
        )}
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.86rem',
            color: isFailed ? '#DC2626' : '#0F172A',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {description || action}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
        <span
          style={{
            fontSize: '0.72rem',
            padding: '0.1rem 0.45rem',
            borderRadius: '4px',
            backgroundColor: categoryBg,
            color: categoryColor,
            border: `1px solid ${categoryBorder}`,
            fontFamily: 'Consolas, Monaco, monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '190px',
          }}
          title={action}
        >
          {action}
        </span>
        {isFailed && (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              whiteSpace: 'nowrap',
            }}
          >
            LỖI
          </span>
        )}
      </div>
    </div>
  );
}

export function AuditLogTable({ logs = [], onSelectLog }) {
  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <div className="table-responsive-wrapper" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
      <table className="ops-data-table" style={{ width: '100%', minWidth: '950px' }}>
        <thead>
          <tr>
            <th style={{ width: '165px' }}>Thời Gian (VN)</th>
            <th style={{ width: '220px' }}>Người Thực Hiện</th>
            <th style={{ width: '115px' }}>Vai Trò</th>
            <th style={{ width: '260px' }}>Hành Động Nghiệp Vụ</th>
            <th style={{ width: '160px' }}>Đối Tượng</th>
            <th style={{ width: '130px' }}>Địa Chỉ IP</th>
            <th style={{ width: '85px', textAlign: 'center' }}>Chi Tiết</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const isFailed = log.status === 'FAILED';
            const timeVn = formatVietnamDateTime(log.createdAt);

            return (
              <tr
                key={log.id}
                style={{
                  backgroundColor: isFailed ? '#FEF2F233' : undefined,
                  transition: 'background-color 0.15s ease',
                }}
              >
                {/* 1. Timestamp in Vietnam Time */}
                <td style={{ fontSize: '0.82rem', fontFamily: 'Consolas, Monaco, monospace', whiteSpace: 'nowrap' }}>
                  <span
                    title={`Giờ Việt Nam (UTC+7)\nGốc ISO: ${log.createdAt}`}
                    style={{ cursor: 'help', borderBottom: '1px dotted #94A3B8' }}
                  >
                    {timeVn}
                  </span>
                </td>

                {/* 2. Actor Email */}
                <td style={{ maxWidth: '220px' }}>
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 500,
                      color: '#0F172A',
                    }}
                    title={log.actorEmail}
                  >
                    {log.actorEmail}
                  </div>
                </td>

                {/* 3. Role */}
                <td>
                  <RoleBadge role={log.actorRole} />
                </td>

                {/* 4. Action */}
                <td>
                  <ActionBadge
                    action={log.action}
                    description={log.actionDescription || log.description}
                    status={log.status}
                  />
                </td>

                {/* 5. Target */}
                <td>
                  <div
                    style={{
                      fontSize: '0.84rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '160px',
                    }}
                    title={`${log.targetType || ''} ${log.targetId ? `#${log.targetId}` : ''}`}
                  >
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                      {log.targetType || 'SYSTEM'}
                    </span>
                    {log.targetId && (
                      <span
                        style={{
                          color: '#64748B',
                          marginLeft: '0.25rem',
                          fontFamily: 'Consolas, monospace',
                        }}
                      >
                        #{log.targetId}
                      </span>
                    )}
                  </div>
                </td>

                {/* 6. IP Address */}
                <td>
                  <span
                    style={{
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: '0.82rem',
                      color: '#475569',
                    }}
                  >
                    {log.ipAddress || '—'}
                  </span>
                </td>

                {/* 7. Action Button */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => onSelectLog(log)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.35rem 0.55rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#2563EB',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Xem chi tiết toàn bộ payload và metadata"
                  >
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

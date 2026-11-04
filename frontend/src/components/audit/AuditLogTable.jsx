// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOG TABLE COMPONENT
// File: src/components/audit/AuditLogTable.jsx
// Renders the 6-column audit log table with detailed action inspection
// =============================================================================

import React from 'react';
import { Eye, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function RoleBadge({ role }) {
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
      }}
    >
      {conf.label}
    </span>
  );
}

function ActionBadge({ action, description, status }) {
  const isFailed = status === 'FAILED';

  // Extract a recognizable category color based on action prefix
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
          }}
        >
          {description || action}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span
          style={{
            fontSize: '0.72rem',
            padding: '0.1rem 0.45rem',
            borderRadius: '4px',
            backgroundColor: categoryBg,
            color: categoryColor,
            border: `1px solid ${categoryBorder}`,
            fontFamily: 'Consolas, monospace',
          }}
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
            }}
          >
            LỖI
          </span>
        )}
      </div>
    </div>
  );
}

export function AuditLogTable({ logs, onSelectLog }) {
  return (
    <div className="table-responsive-wrapper">
      <table className="ops-data-table">
        <thead>
          <tr>
            <th style={{ width: '170px' }}>Thời Gian</th>
            <th style={{ width: '220px' }}>Người Thực Hiện</th>
            <th style={{ width: '130px' }}>Vai Trò</th>
            <th style={{ minWidth: '220px' }}>Hành Động</th>
            <th style={{ width: '180px' }}>Đối Tượng</th>
            <th style={{ width: '130px' }}>Địa Chỉ IP</th>
            <th style={{ width: '90px', textAlign: 'center' }}>Chi Tiết</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              style={{
                backgroundColor: log.status === 'FAILED' ? '#FEF2F233' : undefined,
              }}
            >
              {/* 1. Thời gian */}
              <td data-label="Thời Gian" style={{ whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 500 }}>
                  {formatDateTime(log.createdAt)}
                </span>
              </td>

              {/* 2. Người thực hiện */}
              <td data-label="Người Thực Hiện">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontWeight: 600,
                      color: '#0F172A',
                      fontSize: '0.86rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {log.actorEmail || 'Hệ thống'}
                  </span>
                  {log.actorId && (
                    <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      ID: #{log.actorId}
                    </span>
                  )}
                </div>
              </td>

              {/* 3. Vai trò */}
              <td data-label="Vai Trò">
                <RoleBadge role={log.actorRole} />
              </td>

              {/* 4. Hành động */}
              <td data-label="Hành Động">
                <ActionBadge
                  action={log.action}
                  description={log.actionDescription}
                  status={log.status}
                />
              </td>

              {/* 5. Đối tượng */}
              <td data-label="Đối Tượng">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1E293B' }}>
                    {log.targetType || 'Hệ thống'}
                  </span>
                  {log.targetId && (
                    <span
                      style={{
                        fontSize: '0.76rem',
                        color: '#64748B',
                        fontFamily: 'Consolas, monospace',
                      }}
                    >
                      {log.targetId}
                    </span>
                  )}
                </div>
              </td>

              {/* 6. Địa chỉ IP */}
              <td data-label="Địa Chỉ IP">
                <code
                  style={{
                    fontSize: '0.8rem',
                    color: '#2563EB',
                    backgroundColor: '#EFF6FF',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                  }}
                >
                  {log.ipAddress || '—'}
                </code>
              </td>

              {/* Action: View Modal */}
              <td data-label="Chi Tiết" style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => onSelectLog(log)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F1F5F9';
                    e.currentTarget.style.borderColor = '#94A3B8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#CBD5E1';
                  }}
                  title="Xem chi tiết bản ghi & payload"
                >
                  <Eye size={14} />
                  <span>Xem</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


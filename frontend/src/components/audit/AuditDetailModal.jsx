// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT DETAIL MODAL
// File: src/components/audit/AuditDetailModal.jsx
// Displays full metadata, user agent, error message, and JSON payloads (null-safe)
// Supports closing via Escape key, close button, or backdrop click
// =============================================================================

import React, { useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Calendar,
  User,
  Shield,
  Layers,
  Globe,
  Terminal,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';

function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return String(isoString);
  }
}

/**
 * Safely stringify JSON or return null if empty/null
 */
function safeStringifyJson(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === '{}') return null;
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return trimmed;
    }
  }
  if (typeof raw === 'object') {
    if (Object.keys(raw).length === 0) return null;
    return JSON.stringify(raw, null, 2);
  }
  return String(raw);
}

export function AuditDetailModal({ isOpen, onClose, log }) {
  // Extra safeguard for Escape key inside the component
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!log) return null;

  const isSuccess = log.status === 'SUCCESS';
  const oldValuesFormatted = safeStringifyJson(log.oldValues);
  const newValuesFormatted = safeStringifyJson(log.newValues);
  const hasPayload = Boolean(oldValuesFormatted || newValuesFormatted);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết Nhật ký Kiểm toán #${log.id}`}
      maxWidth="760px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header Summary Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: isSuccess ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${isSuccess ? '#BBF7D0' : '#FECACA'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isSuccess ? (
              <CheckCircle size={24} color="#16A34A" style={{ flexShrink: 0 }} />
            ) : (
              <XCircle size={24} color="#DC2626" style={{ flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
                {log.actionDescription || log.action}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.15rem' }}>
                Mã hành động: <code style={{ color: '#0284C7', fontWeight: 600 }}>{log.action}</code>
              </div>
            </div>
          </div>
          <span
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              backgroundColor: isSuccess ? '#DCFCE7' : '#FEE2E2',
              color: isSuccess ? '#15803D' : '#B91C1C',
            }}
          >
            {isSuccess ? 'THÀNH CÔNG' : 'THẤT BẠI'}
          </span>
        </div>

        {/* Description Note if available */}
        {log.description && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px',
              borderLeft: '4px solid #3B82F6',
              fontSize: '0.86rem',
              color: '#334155',
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}
          >
            <strong>Mô tả chi tiết:</strong> {log.description}
          </div>
        )}

        {/* 2-Column Meta Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Box 1: Người thực hiện & Vai trò */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                marginBottom: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <User size={15} /> Người Thực Hiện
            </div>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#0F172A',
                wordBreak: 'break-all',
              }}
              title={log.actorEmail}
            >
              {log.actorEmail || 'Hệ thống'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.35rem' }}>
              Actor ID: {log.actorId ? `#${log.actorId}` : 'N/A'} · Vai trò:{' '}
              <span
                style={{
                  fontWeight: 600,
                  color:
                    log.actorRole === 'ROLE_ADMIN'
                      ? '#7C3AED'
                      : log.actorRole === 'ROLE_RECEPTIONIST'
                      ? '#D97706'
                      : log.actorRole === 'ROLE_CUSTOMER'
                      ? '#0284C7'
                      : '#475569',
                }}
              >
                {log.actorRole || 'SYSTEM'}
              </span>
            </div>
          </div>

          {/* Box 2: Đối tượng tác động */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                marginBottom: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Layers size={15} /> Đối Tượng Tác Động
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>
              {log.targetType || 'Hệ thống'}
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                color: '#64748B',
                marginTop: '0.35rem',
                wordBreak: 'break-all',
              }}
            >
              Mã đối tượng (Target ID):{' '}
              <strong style={{ color: '#0F172A' }}>{log.targetId || 'N/A'}</strong>
            </div>
          </div>

          {/* Box 3: Thời gian & Mạng */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                marginBottom: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Calendar size={15} /> Thời Gian & Địa Chỉ IP
            </div>
            <div style={{ fontSize: '0.88rem', color: '#0F172A' }}>
              <strong>Thời gian:</strong> {formatDateTime(log.createdAt)}
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                color: '#64748B',
                marginTop: '0.35rem',
                wordBreak: 'break-all',
              }}
            >
              <strong>IP:</strong>{' '}
              <code style={{ color: '#2563EB', fontWeight: 600 }}>{log.ipAddress || '—'}</code>
            </div>
          </div>

          {/* Box 4: User Agent */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                marginBottom: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Globe size={15} /> Thiết Bị & Trình Duyệt
            </div>
            <div
              style={{
                fontSize: '0.78rem',
                color: '#475569',
                wordBreak: 'break-all',
                lineHeight: 1.45,
                maxHeight: '65px',
                overflowY: 'auto',
              }}
              title={log.userAgent}
            >
              {log.userAgent || 'Không xác định'}
            </div>
          </div>
        </div>

        {/* Error message (if any) */}
        {log.errorMessage && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '6px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #F87171',
              color: '#991B1B',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Chi tiết lỗi:</strong> {log.errorMessage}
            </div>
          </div>
        )}

        {/* Data Changes: oldValues vs newValues (NULL-SAFE) */}
        <div style={{ marginTop: '0.25rem' }}>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#334155',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Terminal size={16} /> Dữ Liệu Thay Đổi (Payload JSON Old / New)
          </div>

          {!hasPayload ? (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                textAlign: 'center',
                color: '#64748B',
                fontSize: '0.86rem',
              }}
            >
              <Info size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              Bản ghi này không đính kèm thay đổi đối tượng (Sự kiện chỉ lưu vết hoặc không có payload trước/sau).
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {/* Cột Old Values */}
              <div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#DC2626',
                    marginBottom: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Giá trị trước thay đổi (Old Values)</span>
                  {!oldValuesFormatted && (
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 'normal' }}>
                      (Không có / Tạo mới)
                    </span>
                  )}
                </div>
                {oldValuesFormatted ? (
                  <pre
                    style={{
                      margin: 0,
                      padding: '0.75rem',
                      borderRadius: '6px',
                      backgroundColor: '#1E293B',
                      color: '#FCA5A5',
                      fontSize: '0.78rem',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      fontFamily: 'Consolas, Monaco, monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {oldValuesFormatted}
                  </pre>
                ) : (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#94A3B8',
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      minHeight: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Không có giá trị trước thay đổi (null)
                  </div>
                )}
              </div>

              {/* Cột New Values */}
              <div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#16A34A',
                    marginBottom: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Giá trị mới cập nhật (New Values)</span>
                  {!newValuesFormatted && (
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 'normal' }}>
                      (Không có / Thao tác xóa)
                    </span>
                  )}
                </div>
                {newValuesFormatted ? (
                  <pre
                    style={{
                      margin: 0,
                      padding: '0.75rem',
                      borderRadius: '6px',
                      backgroundColor: '#1E293B',
                      color: '#86EFAC',
                      fontSize: '0.78rem',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      fontFamily: 'Consolas, Monaco, monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {newValuesFormatted}
                  </pre>
                ) : (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#94A3B8',
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      minHeight: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Không có giá trị sau thay đổi (null)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '1rem',
            borderTop: '1px solid #E2E8F0',
            marginTop: '0.5rem',
          }}
        >
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ minWidth: '100px' }}
          >
            Đóng (Esc)
          </button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT DETAIL MODAL COMPONENT
// File: src/components/audit/AuditDetailModal.jsx
// Displays full metadata, user agent, error message, and JSON payloads
// Enhanced:
// 1. Strict Vietnam Timezone (Asia/Ho_Chi_Minh - UTC+7)
// 2. Safe JSON handling: handles null, empty, long payloads with Expand/Collapse & Copy
// 3. Native inline CSS - 100% compatible with App.css (No Tailwind dependency)
// =============================================================================

import React, { useState, useEffect } from 'react';
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
  Copy,
  Check,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { formatVietnamDateTime } from './AuditLogTable';

/**
 * Safely parse and format JSON payload
 * Returns { formatted: string | null, lineCount: number, charCount: number }
 */
function analyzeJsonPayload(raw) {
  if (raw === null || raw === undefined) {
    return { formatted: null, lineCount: 0, charCount: 0 };
  }

  let formatted = null;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === '{}') {
      return { formatted: null, lineCount: 0, charCount: 0 };
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0) {
        return { formatted: null, lineCount: 0, charCount: 0 };
      }
      formatted = JSON.stringify(parsed, null, 2);
    } catch {
      formatted = trimmed;
    }
  } else if (typeof raw === 'object') {
    if (Object.keys(raw).length === 0) {
      return { formatted: null, lineCount: 0, charCount: 0 };
    }
    formatted = JSON.stringify(raw, null, 2);
  } else {
    formatted = String(raw);
  }

  const lineCount = formatted ? formatted.split('\n').length : 0;
  const charCount = formatted ? formatted.length : 0;

  return { formatted, lineCount, charCount };
}

/**
 * Reusable JSON Viewer Component with Copy & Expand/Collapse controls
 */
function JsonBlockViewer({ title, data, variant = 'primary' }) {
  const { formatted, lineCount, charCount } = analyzeJsonPayload(data);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isOldValue = variant === 'old';
  const headerColor = isOldValue ? '#DC2626' : '#16A34A';
  const codeTextColor = isOldValue ? '#FECDD3' : '#A7F3D0';

  const handleCopy = async () => {
    if (!formatted) return;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      {/* Block Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '0.4rem',
          marginBottom: '0.35rem',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
          <span style={{ fontWeight: 600, color: headerColor }}>{title}</span>
          {formatted && (
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'Consolas, monospace' }}>
              ({lineCount} dòng, {charCount} ký tự)
            </span>
          )}
        </div>

        {formatted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
            {/* Expand / Collapse toggle for long JSON (> 8 lines) */}
            {lineCount > 8 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.72rem',
                  borderRadius: '4px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  cursor: 'pointer',
                }}
                title={isExpanded ? 'Thu gọn khung xem' : 'Mở rộng toàn bộ khung xem'}
              >
                {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                <span>{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
              </button>
            )}

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.2rem 0.55rem',
                fontSize: '0.72rem',
                borderRadius: '4px',
                backgroundColor: copied ? '#DCFCE7' : '#F1F5F9',
                border: copied ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                color: copied ? '#15803D' : '#475569',
                fontWeight: copied ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Sao chép JSON vào bộ nhớ tạm"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Block Content */}
      {formatted ? (
        <pre
          style={{
            margin: 0,
            padding: '0.75rem',
            borderRadius: '6px',
            backgroundColor: '#0F172A',
            color: codeTextColor,
            fontSize: '0.78rem',
            fontFamily: 'Consolas, Monaco, monospace',
            maxHeight: isExpanded ? '480px' : '220px',
            overflowX: 'auto',
            overflowY: 'auto',
            whiteSpace: 'pre',
            wordBreak: 'normal',
            border: '1px solid #1E293B',
            lineHeight: 1.5,
          }}
        >
          {formatted}
        </pre>
      ) : (
        <div
          style={{
            padding: '1.25rem 1rem',
            borderRadius: '6px',
            backgroundColor: '#F8FAFC',
            border: '1px dashed #CBD5E1',
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
          Không có dữ liệu ({isOldValue ? 'null / Tạo mới' : 'null / Không thay đổi'})
        </div>
      )}
    </div>
  );
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
  const hasPayload = Boolean(log.oldValues || log.newValues);
  const timeVn = formatVietnamDateTime(log.createdAt);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết Nhật ký Kiểm toán #${log.id}`}
      maxWidth="780px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* 1. Header Summary Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.9rem 1.15rem',
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
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0F172A' }}>
                {log.actionDescription || log.action}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.15rem' }}>
                Mã hành động: <code style={{ color: '#0284C7', fontWeight: 600 }}>{log.action}</code>
              </div>
            </div>
          </div>

          <span
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.76rem',
              fontWeight: 700,
              backgroundColor: isSuccess ? '#DCFCE7' : '#FEE2E2',
              color: isSuccess ? '#15803D' : '#B91C1C',
              letterSpacing: '0.5px',
            }}
          >
            {isSuccess ? 'THÀNH CÔNG' : 'THẤT BẠI'}
          </span>
        </div>

        {/* 2. Optional Business Description */}
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
            <strong>Mô tả nghiệp vụ:</strong> {log.description}
          </div>
        )}

        {/* 3. 2-Column Responsive Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.85rem',
          }}
        >
          {/* Card 1: Người thực hiện */}
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <User size={14} color="#64748B" /> Người Thực Hiện
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
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
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

          {/* Card 2: Đối tượng tác động */}
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Layers size={14} color="#64748B" /> Đối Tượng Tác Động
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>
              {log.targetType || 'Hệ thống'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
              Mã đối tượng (Target ID):{' '}
              <strong style={{ color: '#0F172A' }}>{log.targetId || 'N/A'}</strong>
            </div>
          </div>

          {/* Card 3: Thời gian (Giờ Việt Nam) & IP */}
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Calendar size={14} color="#64748B" /> Thời Gian & Địa Chỉ IP
            </div>
            <div
              style={{ fontSize: '0.86rem', color: '#0F172A' }}
              title={`Múi giờ Việt Nam (UTC+7)\nGốc ISO: ${log.createdAt}`}
            >
              <strong>Thời gian (VN):</strong> {timeVn}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
              <strong>IP:</strong>{' '}
              <code style={{ color: '#2563EB', fontWeight: 600 }}>{log.ipAddress || '—'}</code>
            </div>
          </div>

          {/* Card 4: User Agent / Thiết bị */}
          <div
            style={{
              padding: '0.9rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Globe size={14} color="#64748B" /> Thiết Bị & Trình Duyệt
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

        {/* 4. Error Details (if any) */}
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
            <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Chi tiết lỗi phát sinh:</strong> {log.errorMessage}
            </div>
          </div>
        )}

        {/* 5. Data Changes: JSON Payloads (Old Values vs New Values) */}
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
            <Terminal size={15} color="#64748B" /> Dữ Liệu Biến Đổi (Payload JSON Old / New)
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
                fontSize: '0.84rem',
              }}
            >
              <Info size={17} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              Bản ghi này không ghi nhận thay đổi đối tượng (Sự kiện chỉ lưu vết hệ thống, không có payload trước/sau).
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '0.85rem',
              }}
            >
              {/* Cột Old Values */}
              <JsonBlockViewer
                title="Giá trị trước thay đổi (Old Values)"
                data={log.oldValues}
                variant="old"
              />

              {/* Cột New Values */}
              <JsonBlockViewer
                title="Giá trị sau thay đổi (New Values)"
                data={log.newValues}
                variant="new"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

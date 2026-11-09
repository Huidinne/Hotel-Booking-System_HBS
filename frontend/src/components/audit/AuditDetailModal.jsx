// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT DETAIL MODAL COMPONENT
// File: src/components/audit/AuditDetailModal.jsx
// Displays full metadata, user agent, error message, and JSON payloads
// Enhanced:
// 1. Strict Vietnam Timezone (Asia/Ho_Chi_Minh - UTC+7)
// 2. Safe JSON handling: handles null, empty, long payloads with Expand/Collapse & Copy
// 3. Fully mobile-responsive layout (< 640px)
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
  const headerColor = isOldValue ? 'text-red-600' : 'text-emerald-600';
  const codeTextColor = isOldValue ? 'text-rose-200' : 'text-emerald-200';

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
    <div className="flex flex-col flex-1 min-w-0">
      {/* Block Header */}
      <div className="flex items-center justify-between pb-1.5 mb-1 text-xs">
        <div className="flex items-center gap-1.5 truncate">
          <span className={`font-semibold ${headerColor} truncate`}>{title}</span>
          {formatted && (
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              ({lineCount} dòng, {charCount} ký tự)
            </span>
          )}
        </div>

        {formatted && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Expand / Collapse toggle for long JSON (> 8 lines) */}
            {lineCount > 8 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                title={isExpanded ? 'Thu gọn khung xem' : 'Mở rộng toàn bộ khung xem'}
              >
                {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                <span className="hidden xs:inline">{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
              </button>
            )}

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition ${
                copied
                  ? 'bg-emerald-100 text-emerald-700 font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
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
          className={`m-0 p-3 rounded-lg bg-slate-900 ${codeTextColor} text-xs font-mono overflow-x-auto transition-all border border-slate-800 ${
            isExpanded ? 'max-h-[500px]' : 'max-h-[220px]'
          } overflow-y-auto leading-relaxed`}
          style={{ whiteSpace: 'pre', wordBreak: 'normal' }}
        >
          {formatted}
        </pre>
      ) : (
        <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 italic min-h-[90px] flex items-center justify-center">
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
      <div className="space-y-4 text-slate-800">
        {/* 1. Header Summary Banner */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border gap-2.5 ${
            isSuccess
              ? 'bg-emerald-50/50 border-emerald-200'
              : 'bg-red-50/50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {isSuccess ? (
              <CheckCircle size={26} className="text-emerald-600 shrink-0" />
            ) : (
              <XCircle size={26} className="text-red-600 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base text-slate-900 truncate">
                {log.actionDescription || log.action}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                Mã hành động: <code className="text-blue-600 font-mono font-semibold">{log.action}</code>
              </div>
            </div>
          </div>

          <span
            className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isSuccess ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isSuccess ? 'THÀNH CÔNG' : 'THẤT BẠI'}
          </span>
        </div>

        {/* 2. Optional Business Description */}
        {log.description && (
          <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-blue-500 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Mô tả nghiệp vụ:</strong> {log.description}
          </div>
        )}

        {/* 3. 2-Column Responsive Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
          {/* Card 1: Người thực hiện */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} className="text-slate-400" />
              <span>Người thực hiện</span>
            </div>
            <div className="font-semibold text-slate-900 break-all" title={log.actorEmail}>
              {log.actorEmail || 'Hệ thống'}
            </div>
            <div className="text-xs text-slate-500">
              Actor ID: <span className="font-mono text-slate-700">{log.actorId ? `#${log.actorId}` : 'N/A'}</span> · Vai trò:{' '}
              <span className="font-semibold text-slate-800">{log.actorRole || 'SYSTEM'}</span>
            </div>
          </div>

          {/* Card 2: Đối tượng tác động */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-slate-400" />
              <span>Đối tượng tác động</span>
            </div>
            <div className="font-semibold text-slate-900">
              {log.targetType || 'Hệ thống'}
            </div>
            <div className="text-xs text-slate-500">
              Mã đối tượng (Target ID):{' '}
              <strong className="font-mono text-slate-800">{log.targetId || 'N/A'}</strong>
            </div>
          </div>

          {/* Card 3: Thời gian (Giờ Việt Nam) & IP */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <span>Thời gian (Giờ VN) & IP</span>
            </div>
            <div className="font-medium text-slate-900" title={`Múi giờ Việt Nam (UTC+7)\nGốc ISO: ${log.createdAt}`}>
              {timeVn} <span className="text-slate-400 text-xs font-normal">(GMT+7)</span>
            </div>
            <div className="text-xs text-slate-500">
              IP:{' '}
              <code className="font-mono text-blue-600 font-semibold">{log.ipAddress || '—'}</code>
            </div>
          </div>

          {/* Card 4: User Agent / Thiết bị */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={14} className="text-slate-400" />
              <span>Thiết bị & Trình duyệt</span>
            </div>
            <div
              className="text-xs text-slate-600 break-all line-clamp-2 hover:line-clamp-none transition-all cursor-help"
              title={log.userAgent}
            >
              {log.userAgent || 'Không xác định'}
            </div>
          </div>
        </div>

        {/* 4. Error Details (if any) */}
        {log.errorMessage && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="break-words">
              <strong>Chi tiết lỗi phát sinh:</strong> {log.errorMessage}
            </div>
          </div>
        )}

        {/* 5. Data Changes: JSON Payloads (Old Values vs New Values) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 mb-2.5">
            <Terminal size={15} className="text-slate-500" />
            <span>Dữ liệu biến đổi (Payload JSON Old / New)</span>
          </div>

          {!hasPayload ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
              <Info size={16} className="inline mr-1 text-slate-400" />
              Bản ghi này không ghi nhận thay đổi đối tượng (Sự kiện chỉ lưu vết hệ thống, không có payload trước/sau).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-start">
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

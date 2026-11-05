// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOGS MANAGEMENT PAGE
// File: src/pages/admin/AuditLogsPage.jsx
// View and inspect system audit trail, security events, and entity mutations
// Acceptance Criteria:
// - Filter change resets to page 0
// - Null old/new JSON does not crash
// - Modal closes on Esc key, close button, or backdrop click
// - Long data strings do not break table layout
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  History,
} from 'lucide-react';
import { auditService } from '../../services/auditService';
import { AuditLogTable } from '../../components/audit/AuditLogTable';
import { AuditFilterBar } from '../../components/audit/AuditFilterBar';
import { AuditDetailModal } from '../../components/audit/AuditDetailModal';
import { LoadingSpinner, EmptyState } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

const DEFAULT_FILTERS = {
  actorEmail: '',
  action: '',
  role: '',
  status: '',
  startDate: '',
  endDate: '',
};

export function AuditLogsPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  // Pagination & Filtering state (pageSize = 8 to produce multiple testable pages)
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(0); // 0-based index for Spring Data
  const [pageSize] = useState(8);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Load available actions once for dropdown filter
  useEffect(() => {
    auditService
      .getAuditActions()
      .then((data) => setActions(data))
      .catch((err) => console.warn('Không thể nạp danh sách actions:', err));
  }, []);

  // Fetch audit logs
  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await auditService.getAuditLogs(
        {
          action: filters.action || undefined,
          actorEmail: filters.actorEmail ? filters.actorEmail.trim() : undefined,
          actorRole: filters.role || undefined,
          status: filters.status || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        },
        currentPage,
        pageSize
      );

      const items = response.content || [];
      setLogs(items);
      setTotalPages(response.totalPages ?? Math.max(1, Math.ceil((response.totalElements ?? items.length) / pageSize)));
      setTotalElements(response.totalElements ?? items.length);
    } catch (err) {
      showToast(err.message || 'Lỗi khi tải nhật ký kiểm toán hệ thống', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize, showToast]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Acceptance criterion: Filter changes always reset to first page (page 0)
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(0);
  };

  // Acceptance criterion: Reset filter clears all inputs and resets to page 0
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(0);
  };

  return (
    <div className="admin-crud-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ margin: 0 }}>Nhật Ký Kiểm Toán (Audit Log)</h1>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                border: '1px solid #BFDBFE',
              }}
            >
              {totalElements} bản ghi ({totalPages} trang)
            </span>
          </div>
          <p style={{ marginTop: '0.35rem', color: '#64748B' }}>
            Giám sát toàn bộ sự kiện nghiệp vụ quan trọng (đặt phòng, check-in, đổi phòng, hoàn tiền cọc, bảo mật) theo thời gian thực
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={loadAuditLogs}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Date / Action / Email / Reset */}
      <AuditFilterBar
        filters={filters}
        actions={actions}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Table Content or State */}
      {loading ? (
        <LoadingSpinner text="Đang tải nhật ký kiểm toán hệ thống..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="Không tìm thấy bản ghi kiểm toán nào"
          message="Không có dữ liệu phù hợp với điều kiện lọc Email, Hành động hoặc Khoảng ngày bạn đã chọn."
          actionText="↺ Đặt lại bộ lọc"
          onAction={handleResetFilters}
        />
      ) : (
        <>
          <AuditLogTable logs={logs} onSelectLog={setSelectedLog} />

          {/* Pagination Controls */}
          <div className="table-pagination-container">
            <div className="pagination-info">
              Hiển thị{' '}
              <strong>
                {currentPage * pageSize + 1} -{' '}
                {Math.min((currentPage + 1) * pageSize, totalElements)}
              </strong>{' '}
              trên tổng số <strong>{totalElements}</strong> bản ghi · Trang{' '}
              <strong>
                {currentPage + 1} / {totalPages}
              </strong>
            </div>

            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  title="Trang trước"
                >
                  ← Trước
                </button>

                {Array.from({ length: totalPages }, (_, i) => i).map((pageIdx) => (
                  <button
                    key={pageIdx}
                    type="button"
                    className={`pagination-btn ${currentPage === pageIdx ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageIdx)}
                  >
                    {pageIdx + 1}
                  </button>
                ))}

                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  title="Trang tiếp theo"
                >
                  Sau →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Inspection Modal (Null-safe JSON old/new & Esc key closeable) */}
      <AuditDetailModal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
}

export default AuditLogsPage;

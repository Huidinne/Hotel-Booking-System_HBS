// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOGS MANAGEMENT PAGE
// File: src/pages/admin/AuditLogsPage.jsx
// View and inspect system audit trail, security events, and entity mutations
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  Database,
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

  // Pagination & Filtering state
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(0); // 0-based for Spring Data Pageable
  const [pageSize] = useState(10);
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
          actorEmail: filters.actorEmail || undefined,
          status: filters.status || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        },
        currentPage,
        pageSize
      );

      // Handle role filtering on client-side if needed (or if backend didn't filter role)
      let items = response.content || [];
      if (filters.role) {
        items = items.filter((item) => item.actorRole === filters.role);
      }

      setLogs(items);
      setTotalPages(response.totalPages ?? Math.ceil(items.length / pageSize));
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

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(0); // Reset to page 0 when filters change
  };

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
              {totalElements} bản ghi
            </span>
          </div>
          <p style={{ marginTop: '0.35rem', color: '#64748B' }}>
            Ghi nhận toàn bộ hành động nghiệp vụ quan trọng (đặt phòng, đổi phòng, hoàn tiền, đăng nhập) theo thời gian thực
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

      {/* Filter toolbar */}
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
          message="Không có dữ liệu phù hợp với điều kiện tìm kiếm hoặc khoảng ngày bạn đã chọn."
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
              trên tổng số <strong>{totalElements}</strong> bản ghi
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

      {/* Detail Inspection Modal */}
      <AuditDetailModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
}
export default AuditLogsPage;


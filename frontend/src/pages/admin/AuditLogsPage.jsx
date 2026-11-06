// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOGS MANAGEMENT PAGE
// File: src/pages/admin/AuditLogsPage.jsx
// View and inspect system audit trail, security events, and entity mutations
// Acceptance Criteria:
// - Real API integration via auditService & apiClient
// - True error states: Loading, Empty, 401 Unauthorized, 403 Forbidden, Network Error
// - Strictly no mock data substitution on API errors
// - Admin role validation
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  RefreshCw,
  Lock,
  ShieldX,
  WifiOff,
  LogIn,
  Home,
  RotateCcw,
  Layers,
  Database,
} from 'lucide-react';
import { auditService } from '../../services/auditService';
import { getMockAuditLogs } from '../../mock/auditMock';
import { AuditLogTable } from '../../components/audit/AuditLogTable';
import { AuditFilterBar } from '../../components/audit/AuditFilterBar';
import { AuditDetailModal } from '../../components/audit/AuditDetailModal';
import { LoadingSpinner, EmptyState } from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
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
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  // Error state for handling 401, 403, and network errors
  const [fetchError, setFetchError] = useState(null);

  // Optional preview mode to inspect fixtures for UI testing
  const [useFixturePreview, setUseFixturePreview] = useState(false);

  // Pagination & Filtering state
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(0); // 0-based index for Spring Boot Pageable
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Load available actions for dropdown
  useEffect(() => {
    auditService
      .getAuditActions()
      .then((data) => setActions(data))
      .catch(() => {});
  }, []);

  // Fetch audit logs
  const loadAuditLogs = useCallback(async () => {
    // 1. Client-side authorization check before network call
    if (!currentUser) {
      setLoading(false);
      setFetchError({
        status: 401,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập bằng tài khoản Quản trị viên để truy cập.',
      });
      return;
    }

    if (!isAdmin) {
      setLoading(false);
      setFetchError({
        status: 403,
        message: 'Tài khoản của bạn không có quyền Quản trị viên (ROLE_ADMIN).',
      });
      return;
    }

    // 2. Validate date range (startDate <= endDate)
    if (filters.startDate && filters.endDate) {
      const start = filters.startDate.split('T')[0];
      const end = filters.endDate.split('T')[0];
      if (start > end) {
        showToast('Khoảng thời gian không hợp lệ: Ngày bắt đầu không được lớn hơn ngày kết thúc', 'error');
        setLoading(false);
        return;
      }
    }

    // 3. If user explicitly toggled fixture preview mode for UI inspection
    if (useFixturePreview) {
      setLoading(true);
      setFetchError(null);
      try {
        const mockRes = getMockAuditLogs(
          {
            action: filters.action || undefined,
            actorEmail: filters.actorEmail || undefined,
            actorRole: filters.role || undefined,
            status: filters.status || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
          },
          currentPage,
          pageSize
        );
        setLogs(mockRes.content || []);
        setTotalPages(mockRes.totalPages || 1);
        setTotalElements(mockRes.totalElements || 0);
      } finally {
        setLoading(false);
      }
      return;
    }

    // 4. Real API call to Backend Spring Boot
    setLoading(true);
    setFetchError(null);

    try {
      const response = await auditService.getAuditLogs(
        {
          action: filters.action || undefined,
          actorEmail: filters.actorEmail ? filters.actorEmail.trim() : undefined,
          actorRole: filters.role || undefined,
          status: filters.status || undefined,
          startDate: filters.startDate ? filters.startDate.split('T')[0] : undefined,
          endDate: filters.endDate ? filters.endDate.split('T')[0] : undefined,
        },
        currentPage,
        pageSize
      );

      let items = response?.content || [];

      // Client-side role filter if backend did not filter role
      if (filters.role) {
        items = items.filter((item) => item.actorRole === filters.role);
      }

      setLogs(items);
      setTotalPages(response?.totalPages ?? Math.max(1, Math.ceil((response?.totalElements ?? items.length) / pageSize)));
      setTotalElements(response?.totalElements ?? items.length);
    } catch (err) {
      // Strictly capture backend error status without disguising as mock data
      const status = err?.status || (err?.message?.includes('Failed to fetch') ? 0 : 500);
      setFetchError({
        status,
        message: err?.message || 'Không thể kết nối đến máy chủ Backend.',
      });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, filters, currentPage, pageSize, useFixturePreview, showToast]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleFilterChange = (newFilters) => {
    // Validate date logic
    if (newFilters.startDate && newFilters.endDate) {
      const start = newFilters.startDate.split('T')[0];
      const end = newFilters.endDate.split('T')[0];
      if (start > end) {
        showToast('Khoảng thời gian không hợp lệ: Từ ngày không được sau Đến ngày', 'error');
        return;
      }
    }
    setFilters(newFilters);
    setCurrentPage(0);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(0);
  };

  // --- RENDER ERROR STATES: 401, 403, NETWORK ERROR ---
  if (!loading && fetchError) {
    // 401 Unauthorized State
    if (fetchError.status === 401) {
      return (
        <div className="admin-crud-container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <div
            style={{
              maxWidth: '520px',
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '2.5rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#FEF3C7',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <Lock size={32} color="#D97706" />
            </div>
            <h2 style={{ fontSize: '1.35rem', color: '#0F172A', marginBottom: '0.65rem' }}>
              Yêu Cầu Đăng Nhập (401 Unauthorized)
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1.75rem' }}>
              {fetchError.message || 'Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập bằng tài khoản Quản trị viên.'}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/login')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
            >
              <LogIn size={16} />
              Đăng nhập ngay
            </button>
          </div>
        </div>
      );
    }

    // 403 Forbidden State (Access Denied for Non-Admin)
    if (fetchError.status === 403) {
      return (
        <div className="admin-crud-container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
          <div
            style={{
              maxWidth: '520px',
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '2.5rem',
              border: '1px solid #FEE2E2',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.05)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#FEE2E2',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <ShieldX size={32} color="#DC2626" />
            </div>
            <h2 style={{ fontSize: '1.35rem', color: '#991B1B', marginBottom: '0.65rem' }}>
              Truy Cập Bị Từ Chối (403 Forbidden)
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1.75rem' }}>
              Bạn không có quyền truy cập vào Nhật ký Kiểm toán hệ thống. Tính năng này chỉ dành riêng cho tài khoản Quản trị viên (ROLE_ADMIN).
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
            >
              <Home size={16} />
              Về Trang chủ
            </button>
          </div>
        </div>
      );
    }

    // Network Error / 500 Connection Refused State
    return (
      <div className="admin-crud-container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <div
          style={{
            maxWidth: '540px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '2.5rem',
            border: '1px solid #FED7AA',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#FFEDD5',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <WifiOff size={32} color="#EA580C" />
          </div>
          <h2 style={{ fontSize: '1.35rem', color: '#9A3412', marginBottom: '0.65rem' }}>
            Không Thể Kết Nối Máy Chủ Backend
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            {fetchError.message || 'Mất kết nối với Spring Boot API (cổng 8080). Vui lòng đảm bảo Backend đang chạy hoặc kiểm tra kết nối mạng.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={loadAuditLogs}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
            >
              <RefreshCw size={16} />
              Thử lại kết nối (Retry)
            </button>
            <button
              type="button"
              onClick={() => setUseFixturePreview(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              <Layers size={16} />
              Xem bản xem trước dữ liệu mẫu (Fixtures)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN CONTENT ---
  return (
    <div className="admin-crud-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Nhật Ký Kiểm Toán (Audit Log)</h1>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                backgroundColor: useFixturePreview ? '#FEF3C7' : '#EFF6FF',
                color: useFixturePreview ? '#B45309' : '#1D4ED8',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                border: `1px solid ${useFixturePreview ? '#FDE68A' : '#BFDBFE'}`,
              }}
            >
              {useFixturePreview ? 'Chế độ: Dữ liệu mẫu (Fixtures)' : `Dữ liệu thật: ${totalElements} bản ghi (${totalPages} trang)`}
            </span>
          </div>
          <p style={{ marginTop: '0.35rem', color: '#64748B' }}>
            Tra cứu và đối soát toàn bộ hành động nghiệp vụ quan trọng (đặt phòng, check-in, đổi phòng, hoàn cọc, sửa giá)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Toggle between Live Backend and Fixture Preview */}
          <button
            type="button"
            onClick={() => setUseFixturePreview((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: useFixturePreview ? '#FEF3C7' : '#FFFFFF',
              color: useFixturePreview ? '#B45309' : '#475569',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Chuyển đổi giữa xem Dữ liệu thật từ Backend và Dữ liệu mẫu"
          >
            <Database size={15} />
            {useFixturePreview ? 'Đang xem Mock ➔ Chuyển sang Dữ liệu thật' : 'Xem Dữ liệu mẫu (Demo Fixtures)'}
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={loadAuditLogs}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
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
        <LoadingSpinner text="Đang tải dữ liệu nhật ký kiểm toán từ máy chủ..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="Chưa có bản ghi nhật ký kiểm toán nào"
          message={
            useFixturePreview
              ? 'Không có dữ liệu mẫu phù hợp với điều kiện lọc hiện tại.'
              : 'Cơ sở dữ liệu thật chưa phát sinh thao tác nào, hoặc không có bản ghi nào khớp với bộ lọc.'
          }
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

      {/* Detail Inspection Modal */}
      <AuditDetailModal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
}

export default AuditLogsPage;

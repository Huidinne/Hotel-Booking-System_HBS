// =============================================================================
// HOTEL BOOKING SYSTEM - AUDIT LOGS MANAGEMENT PAGE
// File: src/pages/admin/AuditLogsPage.jsx
// View and inspect system audit trail, security events, and entity mutations
// Acceptance Criteria:
// - Real API integration via auditService & apiClient
// - Resilient Rapid Filtering: AbortController + activeRequestIdRef prevents race conditions
// - Strict Vietnam Timezone formatting (Asia/Ho_Chi_Minh)
// - Robust JSON null / long payload handling
// - Fully responsive mobile view (< 768px card layout)
// - True error states: Loading, Empty, 401 Unauthorized, 403 Forbidden, Network Error
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  SlidersHorizontal,
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

  // References for Rapid Filter change race-condition protection
  const abortControllerRef = useRef(null);
  const activeRequestIdRef = useRef(0);

  // Load available actions for dropdown
  useEffect(() => {
    auditService
      .getAuditActions()
      .then((data) => setActions(data))
      .catch(() => {});
  }, []);

  // Fetch audit logs with race-condition guard
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

    // 3. Abort prior in-flight request if user rapidly changed filter
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++activeRequestIdRef.current;

    // 4. If user explicitly toggled fixture preview mode for UI inspection
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

        if (currentRequestId === activeRequestIdRef.current) {
          setLogs(mockRes.content || []);
          setTotalPages(mockRes.totalPages || 1);
          setTotalElements(mockRes.totalElements || 0);
        }
      } finally {
        if (currentRequestId === activeRequestIdRef.current) {
          setLoading(false);
        }
      }
      return;
    }

    // 5. Real API call to Backend Spring Boot
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
        pageSize,
        { signal: controller.signal }
      );

      // Verify that this is still the latest request (discard out-of-order stale responses)
      if (currentRequestId !== activeRequestIdRef.current) {
        return;
      }

      let items = response?.content || [];

      // Client-side role filter if backend did not filter role
      if (filters.role) {
        items = items.filter((item) => item.actorRole === filters.role);
      }

      setLogs(items);
      setTotalPages(response?.totalPages ?? Math.max(1, Math.ceil((response?.totalElements ?? items.length) / pageSize)));
      setTotalElements(response?.totalElements ?? items.length);
    } catch (err) {
      // If request was aborted because user selected a newer filter, silently discard
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }

      // If a newer request has already been dispatched, do not overwrite state
      if (currentRequestId !== activeRequestIdRef.current) {
        return;
      }

      // Strictly capture backend error status without disguising as mock data
      const status = err?.status || (err?.message?.includes('Failed to fetch') ? 0 : 500);
      setFetchError({
        status,
        message: err?.message || 'Không thể kết nối đến máy chủ Backend.',
      });
      setLogs([]);
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentUser, isAdmin, filters, currentPage, pageSize, useFixturePreview, showToast]);

  useEffect(() => {
    loadAuditLogs();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadAuditLogs]);

  const handleFilterChange = (newFilters) => {
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
        <div className="p-6 sm:p-12 text-center max-w-lg mx-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-amber-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
              Yêu Cầu Đăng Nhập (401 Unauthorized)
            </h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {fetchError.message || 'Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập bằng tài khoản Quản trị viên.'}
            </p>
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 w-full justify-center"
              onClick={() => navigate('/login')}
            >
              <LogIn size={16} />
              <span>Đăng nhập ngay</span>
            </button>
          </div>
        </div>
      );
    }

    // 403 Forbidden State (Access Denied for Non-Admin)
    if (fetchError.status === 403) {
      return (
        <div className="p-6 sm:p-12 text-center max-w-lg mx-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-red-200 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <ShieldX size={28} className="text-red-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-red-800 mb-2">
              Truy Cập Bị Từ Chối (403 Forbidden)
            </h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Bạn không có quyền truy cập vào Nhật ký Kiểm toán hệ thống. Tính năng này chỉ dành riêng cho tài khoản Quản trị viên (ROLE_ADMIN).
            </p>
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 w-full justify-center"
              onClick={() => navigate('/')}
            >
              <Home size={16} />
              <span>Về Trang chủ</span>
            </button>
          </div>
        </div>
      );
    }

    // Network Error / 500 Connection Refused State
    return (
      <div className="p-6 sm:p-12 text-center max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-orange-200 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <WifiOff size={28} className="text-orange-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-orange-900 mb-2">
            Không Thể Kết Nối Máy Chủ Backend
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {fetchError.message || 'Mất kết nối với Spring Boot API (cổng 8080). Vui lòng đảm bảo Backend đang chạy hoặc kiểm tra kết nối mạng.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm"
              onClick={loadAuditLogs}
            >
              <RefreshCw size={15} />
              <span>Thử lại kết nối</span>
            </button>
            <button
              type="button"
              onClick={() => setUseFixturePreview(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold transition"
            >
              <Layers size={15} />
              <span>Xem Dữ liệu mẫu (Demo)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN CONTENT ---
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Row: Responsive Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Nhật Ký Kiểm Toán (Audit Log)
            </h1>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                useFixturePreview
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {useFixturePreview
                ? 'Dữ liệu mẫu (Fixtures)'
                : `Dữ liệu thật: ${totalElements} bản ghi (${totalPages} trang)`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tra cứu và đối soát toàn bộ thao tác bảo mật, phân quyền, biến động buồng phòng và giao dịch thanh toán
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Toggle between Live Backend and Fixture Preview */}
          <button
            type="button"
            onClick={() => setUseFixturePreview((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg border font-semibold transition ${
              useFixturePreview
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
            }`}
            title="Chuyển đổi giữa xem Dữ liệu thật từ Backend và Dữ liệu mẫu"
          >
            <Database size={15} />
            <span className="hidden xs:inline">
              {useFixturePreview ? 'Về dữ liệu thật' : 'Dữ liệu mẫu (Fixtures)'}
            </span>
          </button>

          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg shadow-sm"
            onClick={loadAuditLogs}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Component (Debounced + Responsive) */}
      <AuditFilterBar
        filters={filters}
        actions={actions}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Main Content Area */}
      {loading ? (
        <div className="py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <LoadingSpinner text="Đang đồng bộ dữ liệu nhật ký kiểm toán từ máy chủ..." />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          title="Chưa có bản ghi nhật ký kiểm toán nào"
          message={
            useFixturePreview
              ? 'Không có dữ liệu mẫu phù hợp với điều kiện lọc hiện tại.'
              : 'Cơ sở dữ liệu thật chưa phát sinh thao tác nào hoặc không khớp với bộ lọc đã chọn.'
          }
          actionText="↺ Đặt lại bộ lọc"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="space-y-4">
          {/* Table / Mobile Cards */}
          <AuditLogTable logs={logs} onSelectLog={setSelectedLog} />

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs sm:text-sm text-slate-600 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              Hiển thị{' '}
              <strong className="text-slate-900">
                {currentPage * pageSize + 1} -{' '}
                {Math.min((currentPage + 1) * pageSize, totalElements)}
              </strong>{' '}
              trên tổng số <strong className="text-slate-900">{totalElements}</strong> bản ghi · Trang{' '}
              <strong className="text-slate-900">
                {currentPage + 1} / {totalPages}
              </strong>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  title="Trang trước"
                >
                  ← Trước
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageIdx = i;
                  if (totalPages > 7) {
                    if (currentPage < 4) {
                      pageIdx = i;
                    } else if (currentPage > totalPages - 4) {
                      pageIdx = totalPages - 7 + i;
                    } else {
                      pageIdx = currentPage - 3 + i;
                    }
                  }

                  return (
                    <button
                      key={pageIdx}
                      type="button"
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition ${
                        currentPage === pageIdx
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => setCurrentPage(pageIdx)}
                    >
                      {pageIdx + 1}
                    </button>
                  );
                })}

                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  title="Trang tiếp theo"
                >
                  Sau →
                </button>
              </div>
            )}
          </div>
        </div>
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

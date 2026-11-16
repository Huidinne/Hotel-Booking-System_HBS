import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Eye,
  AlertTriangle,
  Lock,
  Layers,
  Wrench,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { incidentService } from '../../services/incidentService';
import {
  BlocksResaleBadge,
  IncidentPriorityBadge,
  IncidentStatusBadge,
} from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ReportIncidentModal } from '../../components/incident/ReportIncidentModal';
import { IncidentDetailModal } from '../../components/incident/IncidentDetailModal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ITEMS_PER_PAGE = 8;
const CATEGORIES = [
  'ALL',
  'Hỏng điều hòa',
  'Điện nước / Rò rỉ',
  'Thiết bị điện tử / TV',
  'Khóa cửa / Thẻ từ',
  'Vệ sinh / Mùi hôi',
  'Nội thất / Giường tủ',
  'Khác',
];

const PRIORITIES = [
  { key: 'ALL', label: 'Tất cả ưu tiên' },
  { key: 'LOW', label: 'Thấp' },
  { key: 'MEDIUM', label: 'Trung bình' },
  { key: 'HIGH', label: 'Cao' },
  { key: 'CRITICAL', label: 'Khẩn cấp' },
];

const STATUSES = [
  { key: 'ALL', label: 'Tất cả trạng thái' },
  { key: 'REPORTED', label: 'Mới tiếp nhận' },
  { key: 'IN_PROGRESS', label: 'Đang xử lý' },
  { key: 'RESOLVED', label: 'Đã xử lý xong' },
  { key: 'CLOSED', label: 'Đã đóng phiếu' },
];

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

export function AdminIncidentsPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [blocksResaleFilter, setBlocksResaleFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await incidentService.getIncidents({
        search: searchTerm,
        category: categoryFilter,
        priority: priorityFilter,
        status: statusFilter,
        blocksResale: blocksResaleFilter === 'ALL' ? 'ALL' : blocksResaleFilter === 'true',
      });
      setIncidents(data);
    } catch (err) {
      showToast(err.message || 'Lỗi tải danh sách sự cố', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, priorityFilter, statusFilter, blocksResaleFilter, showToast]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(incidents.length / ITEMS_PER_PAGE));
  const paginatedIncidents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return incidents.slice(start, start + ITEMS_PER_PAGE);
  }, [incidents, currentPage]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('ALL');
    setPriorityFilter('ALL');
    setStatusFilter('ALL');
    setBlocksResaleFilter('ALL');
    setCurrentPage(1);
  };

  const handleCreateSuccess = async (data) => {
    try {
      const created = await incidentService.createIncident(data);
      showToast(`Đã tạo phiếu sự cố ${created.incidentCode} thành công!`, 'success');
      loadIncidents();
    } catch (err) {
      showToast(err.message || 'Tạo phiếu sự cố thất bại', 'error');
      throw err;
    }
  };

  const handleUpdateIncident = async (id, data) => {
    try {
      const updated = await incidentService.updateIncident(id, data);
      showToast(`Đã cập nhật phiếu sự cố ${updated.incidentCode} thành công!`, 'success');
      setSelectedIncident(updated);
      loadIncidents();
    } catch (err) {
      showToast(err.message || 'Cập nhật thất bại', 'error');
      throw err;
    }
  };

  const handleResetDefault = async () => {
    const isConfirmed = await confirm({
      title: 'Khôi phục danh sách sự cố mẫu',
      message: 'Hành động này sẽ đặt lại danh sách về các phiếu sự cố mẫu ban đầu. Bạn có chắc chắn không?',
      confirmText: 'Khôi phục',
      cancelText: 'Hủy',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await incidentService.resetToDefault();
      showToast('Đã khôi phục dữ liệu sự cố mẫu thành công!', 'success');
      handleResetFilters();
      loadIncidents();
    } catch (err) {
      showToast(err.message || 'Khôi phục thất bại', 'error');
    }
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ margin: 0 }}>Quản Lý & Theo Dõi Phiếu Sự Cố (Room Incidents)</h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                background: '#FEF2F2',
                color: '#991B1B',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #FECACA',
              }}
            >
              Vận hành buồng phòng
            </span>
          </div>
          <p className="page-header-sub">
            Ghi nhận và giám sát xử lý các sự cố cơ sở vật chất, quản lý trạng thái chặn bán phòng (blocksResale) độc lập với chi phí dịch vụ.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResetDefault}
            title="Đặt lại các phiếu sự cố mẫu"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RotateCcw size={15} /> Khôi phục mẫu
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsCreateOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Báo cáo sự cố mới
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="table-filter-toolbar">
        <form
          className="search-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(1);
            loadIncidents();
          }}
        >
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo mã phiếu, số phòng, nội dung sự cố..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        {/* Category filter */}
        <div className="dropdown-filter-group">
          <label>Loại sự cố:</label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c === 'ALL' ? 'Tất cả loại sự cố' : c}</option>
            ))}
          </select>
        </div>

        {/* Priority filter */}
        <div className="dropdown-filter-group">
          <label>Ưu tiên:</label>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="dropdown-filter-group">
          <label>Trạng thái:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* blocksResale filter */}
        <div className="dropdown-filter-group">
          <label>Khóa bán (blocksResale):</label>
          <select
            value={blocksResaleFilter}
            onChange={(e) => {
              setBlocksResaleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Tất cả</option>
            <option value="true">🔒 Chặn bán lại phòng</option>
            <option value="false">✓ Không chặn bán</option>
          </select>
        </div>

        <button type="button" className="btn-reset-filter" onClick={handleResetFilters}>
          ↺ Đặt lại bộ lọc
        </button>
      </div>

      {/* Table & Data Views */}
      {loading ? (
        <LoadingSpinner message="Đang tải danh sách sự cố..." />
      ) : incidents.length === 0 ? (
        <EmptyState
          title="Không tìm thấy phiếu sự cố nào"
          description={
            searchTerm || categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || statusFilter !== 'ALL' || blocksResaleFilter !== 'ALL'
              ? 'Không có phiếu sự cố nào khớp với điều kiện lọc hiện tại.'
              : 'Hiện tại khách sạn không có sự cố phòng nào được ghi nhận.'
          }
          actionText={
            searchTerm || categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || statusFilter !== 'ALL' || blocksResaleFilter !== 'ALL'
              ? 'Xóa bộ lọc'
              : 'Tạo phiếu sự cố'
          }
          onAction={
            searchTerm || categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || statusFilter !== 'ALL' || blocksResaleFilter !== 'ALL'
              ? handleResetFilters
              : () => setIsCreateOpen(true)
          }
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="ops-data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Mã phiếu</th>
                <th style={{ width: '90px' }}>Phòng</th>
                <th style={{ width: '150px' }}>Lượt lưu trú</th>
                <th style={{ width: '140px' }}>Phân loại</th>
                <th style={{ minWidth: '220px' }}>Tiêu đề & Nội dung</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Ưu tiên</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Chặn bán (blocksResale)</th>
                <th style={{ width: '135px' }}>Thời gian tạo</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIncidents.map((inc) => (
                <tr key={inc.id}>
                  {/* Incident Code */}
                  <td>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#0F1E36',
                        background: '#F1F5F9',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                      }}
                    >
                      {inc.incidentCode}
                    </span>
                  </td>

                  {/* Room Number */}
                  <td>
                    <span style={{ fontWeight: 800, color: '#0F1E36', fontSize: '0.92rem' }}>
                      Phòng {inc.roomNumber}
                    </span>
                  </td>

                  {/* Booking / Stay reference */}
                  <td>
                    {inc.bookingRoomId ? (
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B45309', fontFamily: 'monospace' }}>
                          {inc.bookingRoomId}
                        </div>
                        {inc.customerName && (
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            {inc.customerName}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Phòng trống</span>
                    )}
                  </td>

                  {/* Category */}
                  <td>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                      {inc.category}
                    </span>
                  </td>

                  {/* Title & Description */}
                  <td>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F1E36' }}>
                        {inc.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#64748B',
                          marginTop: '0.15rem',
                          maxWidth: '320px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={inc.description}
                      >
                        {inc.description}
                      </div>
                    </div>
                  </td>

                  {/* Priority */}
                  <td style={{ textAlign: 'center' }}>
                    <IncidentPriorityBadge priority={inc.priority} />
                  </td>

                  {/* Status */}
                  <td style={{ textAlign: 'center' }}>
                    <IncidentStatusBadge status={inc.status} />
                  </td>

                  {/* blocksResale */}
                  <td style={{ textAlign: 'center' }}>
                    <BlocksResaleBadge blocksResale={inc.blocksResale} />
                  </td>

                  {/* Created At */}
                  <td>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      {formatDateTime(inc.createdAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIncident(inc);
                        setIsDetailOpen(true);
                      }}
                      title="Xem chi tiết & Cập nhật phiếu"
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '0.4rem 0.65rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: '#1E293B',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      <Eye size={13} /> Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="table-pagination-container">
            <div className="pagination-info">
              Hiển thị{' '}
              <strong>
                {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, incidents.length)} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, incidents.length)}
              </strong>{' '}
              trên tổng số <strong>{incidents.length}</strong> phiếu sự cố
              {categoryFilter !== 'ALL' && ` (${categoryFilter})`}
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹ Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tạo phiếu sự cố */}
      <ReportIncidentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Modal chi tiết và cập nhật */}
      <IncidentDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedIncident(null);
        }}
        incident={selectedIncident}
        onUpdate={handleUpdateIncident}
      />
    </div>
  );
}

export default AdminIncidentsPage;

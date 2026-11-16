import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Utensils,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Layers,
  Tag,
  DollarSign,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { menuService } from '../../services/menuService';
import { MenuItemStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { MenuItemModal } from '../../components/menu/MenuItemModal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ITEMS_PER_PAGE = 8;
const CATEGORIES = ['ALL', 'Khai vị', 'Món chính', 'Ăn nhẹ 24/7', 'Tráng miệng', 'Đồ uống'];

function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '0 ₫';
  return `${Number(amount).toLocaleString('vi-VN')} ₫`;
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export function AdminMenuPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const loadMenuItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await menuService.getAllMenuItems({
        category: categoryFilter,
        status: statusFilter,
        search: searchTerm,
      });
      setMenuItems(data);
    } catch (err) {
      showToast(err.message || 'Lỗi tải danh mục món ăn', 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, searchTerm, showToast]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(menuItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return menuItems.slice(start, start + ITEMS_PER_PAGE);
  }, [menuItems, currentPage]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = async (data) => {
    try {
      if (editingItem) {
        await menuService.updateMenuItem(editingItem.id, data);
        showToast(`Đã cập nhật món ăn "${data.name}" thành công!`, 'success');
      } else {
        await menuService.createMenuItem(data);
        showToast(`Đã thêm món ăn "${data.name}" vào thực đơn!`, 'success');
      }
      loadMenuItems();
    } catch (err) {
      showToast(err.message || 'Lưu món ăn thất bại', 'error');
      throw err;
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    const nextText = nextStatus === 'AVAILABLE' ? 'Đang bán' : 'Ngừng bán';

    const isConfirmed = await confirm({
      title: `Xác nhận chuyển sang "${nextText}"`,
      message: `Bạn có chắc muốn chuyển trạng thái món "${item.name}" sang "${nextText}"? ${
        nextStatus === 'UNAVAILABLE'
          ? 'Món này sẽ tạm thời không thể chọn trong dịch vụ phòng 24/7.'
          : 'Khách hàng và nhân viên có thể tiếp tục gọi món này.'
      }`,
      confirmText: `Chuyển sang ${nextText}`,
      cancelText: 'Hủy bỏ',
      variant: nextStatus === 'AVAILABLE' ? 'primary' : 'danger',
    });

    if (!isConfirmed) return;

    try {
      await menuService.updateMenuItemStatus(item.id, nextStatus);
      showToast(`Đã đổi trạng thái món "${item.name}" sang "${nextText}"`, 'success');
      loadMenuItems();
    } catch (err) {
      showToast(err.message || 'Đổi trạng thái thất bại', 'error');
    }
  };

  const handleResetDefault = async () => {
    const isConfirmed = await confirm({
      title: 'Khôi phục danh mục mẫu ban đầu',
      message: 'Hành động này sẽ đặt lại thực đơn về 18 món mẫu chuẩn Grand Aurora. Bạn có chắc chắn không?',
      confirmText: 'Khôi phục mẫu',
      cancelText: 'Hủy',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await menuService.resetToDefault();
      showToast('Đã khôi phục danh mục món ăn mẫu thành công!', 'success');
      handleResetFilters();
      loadMenuItems();
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
            <h1 style={{ margin: 0 }}>Quản Lý Danh Mục Món Ăn (Menu Items)</h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                background: '#FEF3C7',
                color: '#92400E',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #FDE68A',
              }}
            >
              Phục vụ 24/7
            </span>
          </div>
          <p className="page-header-sub">
            Thiết lập danh mục món ăn, nhóm món, giá bán và trạng thái cung ứng phục vụ dịch vụ phòng không giới hạn thời gian.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResetDefault}
            title="Đặt lại thực đơn mẫu 18 món"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RotateCcw size={15} /> Khôi phục mẫu
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenCreateModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Thêm món mới
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
            loadMenuItems();
          }}
        >
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo tên món hoặc mã món (KV-001, MC-002)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <div className="dropdown-filter-group">
          <label>Nhóm món:</label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Tất cả nhóm ({CATEGORIES.length - 1})</option>
            {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="dropdown-filter-group">
          <label>Trạng thái:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="AVAILABLE">✓ Đang bán</option>
            <option value="UNAVAILABLE">✗ Ngừng bán</option>
          </select>
        </div>

        <button type="button" className="btn-reset-filter" onClick={handleResetFilters}>
          ↺ Đặt lại bộ lọc
        </button>
      </div>

      {/* Table & Data Views */}
      {loading ? (
        <LoadingSpinner message="Đang tải danh mục thực đơn..." />
      ) : menuItems.length === 0 ? (
        <EmptyState
          title="Không tìm thấy món ăn nào"
          description={
            searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Không có món ăn nào phù hợp với điều kiện tìm kiếm. Hãy thử xóa bộ lọc.'
              : 'Thực đơn hiện tại đang trống. Nhấn "+ Thêm món mới" hoặc "Khôi phục mẫu" để bắt đầu.'
          }
          actionText={searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL' ? 'Xóa bộ lọc' : 'Thêm món mới'}
          onAction={
            searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
              ? handleResetFilters
              : handleOpenCreateModal
          }
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="ops-data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Mã món</th>
                <th style={{ minWidth: '220px' }}>Tên món ăn</th>
                <th style={{ width: '130px' }}>Nhóm món</th>
                <th style={{ width: '100px' }}>Đơn vị</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Giá bán</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '150px' }}>Cập nhật gần nhất</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr key={item.id}>
                  {/* Item Code */}
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
                      {item.itemCode}
                    </span>
                  </td>

                  {/* Name & Description */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '1px solid #E2E8F0',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F1E36', fontSize: '0.92rem' }}>
                          {item.name}
                        </div>
                        {item.description && (
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: '#64748B',
                              marginTop: '0.15rem',
                              maxWidth: '360px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={item.description}
                          >
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.82rem',
                        color: '#334155',
                        fontWeight: 600,
                        background: item.category === 'Ăn nhẹ 24/7' ? '#FEF3C7' : '#F8FAFC',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      {item.category === 'Ăn nhẹ 24/7' && <Sparkles size={12} color="#D97706" />}
                      {item.category}
                    </span>
                  </td>

                  {/* Unit */}
                  <td>
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>{item.unit}</span>
                  </td>

                  {/* Price */}
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: '#B45309', fontSize: '0.95rem' }}>
                      {formatCurrency(item.price)}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ textAlign: 'center' }}>
                    <MenuItemStatusBadge status={item.status} />
                  </td>

                  {/* Updated At */}
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {formatDate(item.updatedAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        title="Chỉnh sửa thông tin món ăn"
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          padding: '0.4rem 0.6rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: '#1E293B',
                          fontSize: '0.8rem',
                        }}
                      >
                        <Edit2 size={13} style={{ marginRight: '4px' }} /> Sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        title={item.status === 'AVAILABLE' ? 'Chuyển sang Ngừng bán' : 'Kích hoạt Đang bán'}
                        style={{
                          background: item.status === 'AVAILABLE' ? '#FEF2F2' : '#F0FDF4',
                          border: `1px solid ${item.status === 'AVAILABLE' ? '#FECACA' : '#BBF7D0'}`,
                          borderRadius: '6px',
                          padding: '0.4rem 0.6rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: item.status === 'AVAILABLE' ? '#991B1B' : '#15803D',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        {item.status === 'AVAILABLE' ? 'Ngừng bán' : 'Mở bán'}
                      </button>
                    </div>
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
                {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, menuItems.length)} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, menuItems.length)}
              </strong>{' '}
              trên tổng số <strong>{menuItems.length}</strong> món ăn
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

      {/* Create / Edit Modal */}
      <MenuItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        item={editingItem}
      />
    </div>
  );
}

export default AdminMenuPage;

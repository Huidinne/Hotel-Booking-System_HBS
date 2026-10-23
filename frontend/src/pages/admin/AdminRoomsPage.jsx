import React, { useState, useEffect, useMemo } from 'react';
import { roomService } from '../../services/roomService';
import { RoomStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { CustomInput } from '../../components/common/CustomInput';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

const ITEMS_PER_PAGE = 8;

export function AdminRoomsPage() {
  const { showToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(1);
  const [floor, setFloor] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Dialog
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Validation States
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (field, val) => {
    let error = '';
    if (field === 'roomNumber') {
      const v = (val || '').trim();
      if (!v) {
        error = 'Vui lòng nhập số phòng';
      } else if (v.length < 2 || v.length > 10) {
        error = 'Số phòng phải từ 2 đến 10 ký tự';
      }
    } else if (field === 'floor') {
      const num = Number(val);
      if (!val && val !== 0) {
        error = 'Vui lòng nhập số tầng';
      } else if (isNaN(num) || num < 1 || num > 50) {
        error = 'Tầng phải từ 1 đến 50';
      }
    } else if (field === 'selectedRoomTypeId') {
      if (!val) {
        error = 'Vui lòng chọn loại phòng liên kết';
      }
    }
    return error;
  };

  const handleBlur = (field, val) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field, val, setter) => {
    setter(val);
    if (touched[field]) {
      const errorMsg = validateField(field, val);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, typesData] = await Promise.all([
        roomService.getRooms(),
        roomService.getRoomTypes(),
      ]);
      setRooms(roomsData);
      setRoomTypes(typesData);
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách phòng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Danh sách các tầng thực tế lấy từ dữ liệu
  const availableFloors = useMemo(() => {
    const floorSet = new Set(
      rooms
        .map((r) => Number(r.floor))
        .filter((f) => !isNaN(f) && f > 0)
    );
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [rooms]);

  // Sắp xếp theo tầng (tăng dần: Tầng 1 -> Tầng 2 -> ...), sau đó theo số phòng và áp dụng bộ lọc
  const filteredAndSortedRooms = useMemo(() => {
    const sorted = [...rooms].sort((a, b) => {
      const floorA = Number(a.floor) || 0;
      const floorB = Number(b.floor) || 0;
      if (floorA !== floorB) return floorA - floorB;
      return (a.roomNumber || '').localeCompare(b.roomNumber || '', undefined, { numeric: true });
    });

    return sorted.filter((room) => {
      // Lọc theo tầng
      if (floorFilter !== 'ALL' && Number(room.floor) !== Number(floorFilter)) {
        return false;
      }
      // Lọc theo trạng thái
      if (statusFilter !== 'ALL' && room.status !== statusFilter) {
        return false;
      }
      // Lọc theo loại phòng
      if (roomTypeFilter !== 'ALL' && Number(room.roomTypeId) !== Number(roomTypeFilter)) {
        return false;
      }
      // Lọc theo tìm kiếm số phòng hoặc loại phòng
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchNumber = (room.roomNumber || '').toLowerCase().includes(term);
        const matchTypeName = (room.roomTypeName || '').toLowerCase().includes(term);
        if (!matchNumber && !matchTypeName) return false;
      }
      return true;
    });
  }, [rooms, floorFilter, statusFilter, roomTypeFilter, searchTerm]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRooms.length / ITEMS_PER_PAGE));

  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedRooms.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedRooms, currentPage]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFloorFilter('ALL');
    setStatusFilter('ALL');
    setRoomTypeFilter('ALL');
    setCurrentPage(1);
  };

  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  // Mở modal Tạo mới
  const handleOpenCreate = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setFloor(1);
    setSelectedRoomTypeId(roomTypes[0]?.id || 1);
    setErrors({});
    setTouched({});
    setIsModalOpen(true);
  };

  // Mở modal Chỉnh sửa
  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setRoomNumber(room.roomNumber || '');
    setFloor(room.floor || 1);
    setSelectedRoomTypeId(room.roomTypeId || roomTypes[0]?.id || 1);
    setErrors({});
    setTouched({});
    setIsModalOpen(true);
  };

  // Mở dialog Xóa
  const handleOpenDelete = (room) => {
    if (room.status === 'OCCUPIED') {
      showToast(`Không thể xóa phòng ${room.roomNumber} do đang có khách lưu trú!`, 'warning');
      return;
    }
    setDeletingRoom(room);
  };

  // Xác nhận Xóa phòng
  const handleConfirmDelete = async () => {
    if (!deletingRoom) return;
    setDeleteLoading(true);
    try {
      await roomService.deleteRoom(deletingRoom.id);
      showToast(`Đã xóa vĩnh viễn phòng ${deletingRoom.roomNumber} thành công!`, 'success');
      setDeletingRoom(null);
      // Nếu trang hiện tại không còn phần tử nào sau khi xóa, lùi về trang trước
      if (paginatedRooms.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
      loadData();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa phòng', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Submit Tạo mới / Sửa phòng
  const handleSubmit = async (e) => {
    e.preventDefault();

    const roomNumberErr = validateField('roomNumber', roomNumber);
    const floorErr = validateField('floor', floor);
    const roomTypeErr = validateField('selectedRoomTypeId', selectedRoomTypeId);

    setTouched({
      roomNumber: true,
      floor: true,
      selectedRoomTypeId: true,
    });

    const newErrors = {
      roomNumber: roomNumberErr,
      floor: floorErr,
      selectedRoomTypeId: roomTypeErr,
    };
    setErrors(newErrors);

    if (roomNumberErr || floorErr || roomTypeErr) {
      showToast('Vui lòng kiểm tra và điền đúng các thông tin còn thiếu!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (editingRoom) {
        await roomService.updateRoom(editingRoom.id, {
          roomNumber: roomNumber.trim(),
          roomTypeId: selectedRoomTypeId,
          floor: Number(floor),
        });
        showToast(`Đã cập nhật thông tin phòng ${roomNumber} thành công!`, 'success');
      } else {
        await roomService.createRoom({
          roomNumber: roomNumber.trim(),
          roomTypeId: selectedRoomTypeId,
          floor: Number(floor),
          status: 'AVAILABLE',
        });
        showToast(`Đã thêm phòng ${roomNumber} thành công!`, 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || (editingRoom ? 'Lỗi cập nhật phòng' : 'Lỗi thêm phòng'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Bật/tắt bảo trì
  const handleToggleMaintenance = async (room) => {
    const newStatus = room.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    try {
      await roomService.updateRoomStatus(room.id, newStatus);
      showToast(
        `Đã chuyển phòng ${room.roomNumber} sang ${newStatus === 'MAINTENANCE' ? 'BẢO TRÌ' : 'SẴN SÀNG'}!`,
        'success'
      );
      loadData();
    } catch (err) {
      showToast(err.message || 'Lỗi cập nhật', 'error');
    }
  };

  return (
    <div className="admin-crud-container">
      <div className="page-header-row">
        <div>
          <h1>Quản Lý Danh Sách Phòng Vật Lý (Rooms)</h1>
          <p>
            Quản lý số phòng cụ thể theo từng tầng, liên kết Loại phòng, chỉnh sửa, xóa và kiểm soát trạng thái
          </p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate}>
          + Thêm Phòng Vật Lý Mới
        </button>
      </div>

      {/* Thanh Công Cụ Bộ Lọc & Tìm Kiếm */}
      <div className="table-filter-toolbar">
        <form
          className="search-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(1);
          }}
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo số phòng hoặc tên loại..."
          />
          <button type="submit" className="btn-search-icon">
            🔍 Tìm kiếm
          </button>
        </form>

        {/* Lọc theo Tầng */}
        <div className="dropdown-filter-group">
          <label>Tầng:</label>
          <select
            value={floorFilter}
            onChange={(e) => handleFilterChange(setFloorFilter, e.target.value)}
          >
            <option value="ALL">Tất cả các tầng</option>
            {availableFloors.map((fl) => (
              <option key={fl} value={fl}>
                Tầng {fl}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo Trạng Thái */}
        <div className="dropdown-filter-group">
          <label>Trạng thái:</label>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="AVAILABLE">Sẵn sàng đón khách</option>
            <option value="OCCUPIED">Đang có khách lưu trú</option>
            <option value="CLEANING">Đang dọn dẹp</option>
            <option value="MAINTENANCE">Đang bảo trì</option>
          </select>
        </div>

        {/* Lọc theo Loại Phòng */}
        <div className="dropdown-filter-group">
          <label>Loại phòng:</label>
          <select
            value={roomTypeFilter}
            onChange={(e) => handleFilterChange(setRoomTypeFilter, e.target.value)}
          >
            <option value="ALL">Tất cả loại phòng</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn-reset-filter" onClick={handleResetFilters}>
          ↺ Đặt lại
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Đang tải danh sách phòng vật lý..." />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="ops-data-table">
            <thead>
              <tr>
                <th>Số phòng</th>
                <th>Tầng</th>
                <th>Thuộc Loại Phòng</th>
                <th>Trạng thái hiện tại</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRooms.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748B' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏨</div>
                    <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>
                      Không tìm thấy phòng vật lý phù hợp
                    </p>
                    <p style={{ fontSize: '0.88rem', color: '#64748B', maxWidth: '400px', margin: '0 auto 1.2rem auto' }}>
                      Hãy thử đổi từ khóa tìm kiếm, chọn tầng khác hoặc trạng thái khác.
                    </p>
                    <button
                      type="button"
                      className="btn-reset-filter"
                      onClick={handleResetFilters}
                    >
                      ↺ Đặt lại bộ lọc
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedRooms.map((room) => (
                  <tr key={room.id}>
                    <td className="code-cell" data-label="Số phòng">
                      <strong>Phòng {room.roomNumber}</strong>
                    </td>
                    <td data-label="Tầng">
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>Tầng {room.floor}</span>
                    </td>
                    <td data-label="Thuộc Loại Phòng">{room.roomTypeName}</td>
                    <td data-label="Trạng thái hiện tại">
                      <RoomStatusBadge status={room.status} />
                    </td>
                    <td data-label="Thao tác" style={{ textAlign: 'right' }}>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-action-edit"
                          onClick={() => handleOpenEdit(room)}
                          title="Chỉnh sửa thông tin phòng"
                        >
                          ✏️ Sửa
                        </button>

                        {room.status === 'AVAILABLE' && (
                          <button
                            type="button"
                            className="btn-action-outline-danger"
                            onClick={() => handleToggleMaintenance(room)}
                            title="Đưa vào bảo trì"
                          >
                            🔧 Bảo trì
                          </button>
                        )}
                        {room.status === 'MAINTENANCE' && (
                          <button
                            type="button"
                            className="btn-action-success"
                            onClick={() => handleToggleMaintenance(room)}
                            title="Kích hoạt sẵn sàng"
                          >
                            ✓ Kích hoạt
                          </button>
                        )}
                        {room.status === 'OCCUPIED' && (
                          <span className="non-cancellable-note">Khách đang ở</span>
                        )}
                        {room.status === 'CLEANING' && (
                          <span className="non-cancellable-note">Đang dọn dẹp</span>
                        )}

                        <button
                          type="button"
                          className="btn-action-delete"
                          onClick={() => handleOpenDelete(room)}
                          disabled={room.status === 'OCCUPIED'}
                          title={
                            room.status === 'OCCUPIED'
                              ? 'Không thể xóa phòng đang có khách ở'
                              : 'Xóa phòng này khỏi hệ thống'
                          }
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Phân Trang (8 phần tử / trang) */}
          {filteredAndSortedRooms.length > 0 && (
            <div className="table-pagination-container">
              <div className="pagination-info">
                Hiển thị{' '}
                <strong>
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedRooms.length)}
                </strong>{' '}
                trên tổng số <strong>{filteredAndSortedRooms.length}</strong> phòng
                {floorFilter !== 'ALL' && ` (Tầng ${floorFilter})`}
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="Trang trước"
                  >
                    ← Trước
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
                    title="Trang tiếp theo"
                  >
                    Tiếp →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Thêm Mới / Chỉnh Sửa Phòng */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? `Chỉnh Sửa Phòng: ${editingRoom.roomNumber}` : 'Thêm Phòng Vật Lý Mới'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit} className="crud-form" noValidate>
          <CustomInput
            id="roomNumber"
            name="roomNumber"
            label="Số phòng (Ví dụ: 104, 205, 304)"
            placeholder="Nhập mã số phòng..."
            value={roomNumber}
            required
            error={touched.roomNumber ? errors.roomNumber : ''}
            onChange={(e) => handleChange('roomNumber', e.target.value, setRoomNumber)}
            onBlur={(e) => handleBlur('roomNumber', e.target.value)}
          />

          <CustomInput
            id="floor"
            name="floor"
            type="number"
            label="Tầng (1 - 50)"
            placeholder="Nhập số tầng..."
            value={floor}
            min="1"
            max="50"
            required
            error={touched.floor ? errors.floor : ''}
            onChange={(e) => handleChange('floor', e.target.value, setFloor)}
            onBlur={(e) => handleBlur('floor', e.target.value)}
          />

          <CustomInput
            as="select"
            id="selectedRoomTypeId"
            name="selectedRoomTypeId"
            label="Loại phòng liên kết"
            value={selectedRoomTypeId}
            required
            error={touched.selectedRoomTypeId ? errors.selectedRoomTypeId : ''}
            onChange={(e) =>
              handleChange('selectedRoomTypeId', Number(e.target.value), setSelectedRoomTypeId)
            }
            onBlur={(e) => handleBlur('selectedRoomTypeId', e.target.value)}
          >
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name} ({rt.basePrice.toLocaleString('vi-VN')} đ/đêm)
              </option>
            ))}
          </CustomInput>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? editingRoom
                  ? 'Đang lưu...'
                  : 'Đang tạo...'
                : editingRoom
                ? 'Lưu thay đổi'
                : 'Tạo phòng vật lý'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog Xóa Phòng */}
      <ConfirmDialog
        isOpen={!!deletingRoom}
        title="Xác nhận xóa phòng"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn phòng ${deletingRoom?.roomNumber} (Tầng ${deletingRoom?.floor} - ${deletingRoom?.roomTypeName}) khỏi hệ thống không? Dữ liệu phòng sẽ bị xóa hoàn toàn.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingRoom(null)}
      />
    </div>
  );
}

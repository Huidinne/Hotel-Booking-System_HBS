import React, { useState, useEffect } from 'react';
import { roomService } from '../../services/roomService';
import { RoomStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export function AdminRoomsPage() {
  const { showToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(1);
  const [floor, setFloor] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, typesData] = await Promise.all([
        roomService.getRooms(),
        roomService.getRoomTypes(),
      ]);
      setRooms(roomsData);
      setRoomTypes(typesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setRoomNumber('');
    setFloor(1);
    setSelectedRoomTypeId(roomTypes[0]?.id || 1);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      showToast('Vui lòng nhập số phòng!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await roomService.createRoom({
        roomNumber: roomNumber.trim(),
        roomTypeId: selectedRoomTypeId,
        floor,
        status: 'AVAILABLE',
      });
      showToast(`Đã thêm phòng ${roomNumber} thành công!`, 'success');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Lỗi thêm phòng', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
          <p>Quản lý số phòng cụ thể, tầng, liên kết Loại phòng và kích hoạt trạng thái bảo trì</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate}>
          + Thêm Phòng Vật Lý Mới
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
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td className="code-cell">
                    <strong>Phòng {room.roomNumber}</strong>
                  </td>
                  <td>Tầng {room.floor}</td>
                  <td>{room.roomTypeName}</td>
                  <td>
                    <RoomStatusBadge status={room.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {room.status === 'AVAILABLE' && (
                      <button
                        className="btn-action-outline-danger"
                        onClick={() => handleToggleMaintenance(room)}
                      >
                        🔧 Đưa vào bảo trì
                      </button>
                    )}
                    {room.status === 'MAINTENANCE' && (
                      <button
                        className="btn-action-success"
                        onClick={() => handleToggleMaintenance(room)}
                      >
                        ✓ Kích hoạt lại
                      </button>
                    )}
                    {room.status === 'OCCUPIED' && (
                      <span className="non-cancellable-note">Khách đang ở</span>
                    )}
                    {room.status === 'CLEANING' && (
                      <span className="non-cancellable-note">Đang dọn dẹp</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create Room */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thêm Phòng Vật Lý Mới"
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit} className="crud-form">
          <div className="form-group">
            <label>Số phòng (Ví dụ: 104, 205, 304) *</label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="Nhập mã số phòng..."
              required
            />
          </div>

          <div className="form-group">
            <label>Tầng *</label>
            <input
              type="number"
              min="1"
              max="20"
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              required
            />
          </div>

          <div className="form-group">
            <label>Loại phòng liên kết *</label>
            <select
              value={selectedRoomTypeId}
              onChange={(e) => setSelectedRoomTypeId(Number(e.target.value))}
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name} ({rt.basePrice.toLocaleString('vi-VN')} đ/đêm)
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo phòng vật lý'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

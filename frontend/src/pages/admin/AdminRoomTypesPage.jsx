import React, { useState, useEffect } from 'react';
import { roomService } from '../../services/roomService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export function AdminRoomTypesPage() {
  const { showToast } = useToast();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [basePrice, setBasePrice] = useState(1000000);
  const [description, setDescription] = useState('');
  const [amenitiesStr, setAmenitiesStr] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRoomTypes = async () => {
    setLoading(true);
    try {
      const data = await roomService.getRoomTypes();
      setRoomTypes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoomTypes();
  }, []);

  const handleOpenCreate = () => {
    setEditingType(null);
    setName('');
    setCapacity(2);
    setBasePrice(1000000);
    setDescription('');
    setAmenitiesStr('Wifi tốc độ cao, Điều hòa, Smart TV, Nước nóng lạnh');
    setImageUrl('https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rt) => {
    setEditingType(rt);
    setName(rt.name);
    setCapacity(rt.capacity);
    setBasePrice(rt.basePrice);
    setDescription(rt.description);
    setAmenitiesStr(rt.amenities.join(', '));
    setImageUrl(rt.images[0] || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Tên loại phòng không được để trống!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const amenities = amenitiesStr.split(',').map((s) => s.trim()).filter(Boolean);
      const images = [imageUrl || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'];

      if (editingType) {
        await roomService.updateRoomType(editingType.id, {
          name: name.trim(),
          capacity,
          basePrice,
          description: description.trim(),
          amenities,
          images,
        });
        showToast('Cập nhật loại phòng thành công!', 'success');
      } else {
        await roomService.createRoomType({
          name: name.trim(),
          capacity,
          basePrice,
          description: description.trim(),
          isActive: true,
          amenities,
          images,
        });
        showToast('Tạo mới loại phòng thành công!', 'success');
      }

      setIsModalOpen(false);
      loadRoomTypes();
    } catch (err) {
      showToast(err.message || 'Lỗi lưu thông tin', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-crud-container">
      <div className="page-header-row">
        <div>
          <h1>Quản Lý Danh Mục Loại Phòng (Room Types)</h1>
          <p>Cấu hình bảng giá niêm yết theo đêm, sức chứa tiêu chuẩn và tiện nghi buồng phòng</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate}>
          + Thêm Loại Phòng Mới
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Đang tải danh mục loại phòng..." />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="ops-data-table">
            <thead>
              <tr>
                <th>Hình ảnh</th>
                <th>Tên Loại Phòng</th>
                <th>Sức chứa</th>
                <th>Giá cơ bản / đêm</th>
                <th>Tiện nghi nổi bật</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.map((rt) => (
                <tr key={rt.id}>
                  <td style={{ width: '90px' }}>
                    <img
                      src={rt.images[0]}
                      alt={rt.name}
                      style={{ width: '75px', height: '50px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  </td>
                  <td>
                    <strong>{rt.name}</strong>
                  </td>
                  <td>{rt.capacity} Khách</td>
                  <td>
                    <strong className="green-text">
                      {rt.basePrice.toLocaleString('vi-VN')} VNĐ
                    </strong>
                  </td>
                  <td>
                    <div className="amenities-tags-compact">
                      {rt.amenities.slice(0, 3).map((a, i) => (
                        <span key={i} className="amenity-chip-sm">
                          {a}
                        </span>
                      ))}
                      {rt.amenities.length > 3 && (
                        <span className="amenity-chip-sm">+{rt.amenities.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="badge-active">Hoạt động</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary-sm" onClick={() => handleOpenEdit(rt)}>
                      ✏️ Chỉnh sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingType ? `Chỉnh sửa: ${editingType.name}` : 'Thêm Loại Phòng Mới'}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit} className="crud-form">
          <div className="form-group">
            <label>Tên loại phòng *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Premier Ocean View Suite"
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Sức chứa tiêu chuẩn (Khách) *</label>
              <input
                type="number"
                min="1"
                max="10"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label>Giá cơ bản mỗi đêm (VNĐ) *</label>
              <input
                type="number"
                step="50000"
                min="100000"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Mô tả chi tiết</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Mô tả không gian phòng, loại giường, tầm nhìn..."
            />
          </div>

          <div className="form-group">
            <label>Tiện nghi (Ngăn cách bằng dấu phẩy)</label>
            <input
              type="text"
              value={amenitiesStr}
              onChange={(e) => setAmenitiesStr(e.target.value)}
              placeholder="Wifi, Điều hòa, Smart TV, Bồn tắm nằm..."
            />
          </div>

          <div className="form-group">
            <label>Đường dẫn hình ảnh đại diện (URL)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

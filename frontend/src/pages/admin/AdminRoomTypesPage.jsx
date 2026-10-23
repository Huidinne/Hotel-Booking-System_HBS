import React, { useState, useEffect } from 'react';
import { roomService, DEFAULT_ROOM_IMAGE } from '../../services/roomService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { CustomInput } from '../../components/common/CustomInput';
import { useToast } from '../../context/ToastContext';

const PRESET_ROOM_IMAGES = [
  { label: '🏖️ Hướng Biển', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80' },
  { label: '👑 Deluxe King', url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80' },
  { label: '🌟 Luxury Suite', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80' },
  { label: '👨‍👩‍👧 Family VIP', url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80' },
];

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
  const [imageStatus, setImageStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [submitting, setSubmitting] = useState(false);

  // Validation States
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (field, val) => {
    let error = '';
    if (field === 'name') {
      const v = (val || '').trim();
      if (!v) {
        error = 'Vui lòng nhập tên loại phòng';
      } else if (v.length < 3) {
        error = 'Tên loại phòng phải có ít nhất 3 ký tự';
      }
    } else if (field === 'capacity') {
      const num = Number(val);
      if (!val && val !== 0) {
        error = 'Vui lòng nhập sức chứa';
      } else if (isNaN(num) || num < 1 || num > 20) {
        error = 'Sức chứa tiêu chuẩn phải từ 1 đến 20 khách';
      }
    } else if (field === 'basePrice') {
      const num = Number(val);
      if (!val && val !== 0) {
        error = 'Vui lòng nhập giá cơ bản mỗi đêm';
      } else if (isNaN(num) || num < 50000) {
        error = 'Giá cơ bản tối thiểu 50.000 VNĐ / đêm';
      }
    } else if (field === 'imageUrl') {
      const v = (val || '').trim();
      if (v && !/^(https?:\/\/|\/|\.\/|data:image\/).+/i.test(v)) {
        error = 'Đường dẫn ảnh phải bắt đầu bằng http://, https:// hoặc định dạng ảnh hợp lệ';
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
    setImageUrl(DEFAULT_ROOM_IMAGE);
    setImageStatus('idle');
    setErrors({});
    setTouched({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rt) => {
    setEditingType(rt);
    setName(rt.name);
    setCapacity(rt.capacity);
    setBasePrice(rt.basePrice);
    setDescription(rt.description);
    setAmenitiesStr(Array.isArray(rt.amenities) ? rt.amenities.join(', ') : rt.amenities || '');
    const currentImg = rt.images?.[0] || DEFAULT_ROOM_IMAGE;
    setImageUrl(currentImg);
    setImageStatus('idle');
    setErrors({});
    setTouched({});
    setIsModalOpen(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP)!', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        setImageStatus('loading');
        setErrors((prev) => ({ ...prev, imageUrl: '' }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameErr = validateField('name', name);
    const capacityErr = validateField('capacity', capacity);
    const priceErr = validateField('basePrice', basePrice);
    const imageErr = validateField('imageUrl', imageUrl);

    setTouched({
      name: true,
      capacity: true,
      basePrice: true,
      imageUrl: true,
    });

    const newErrors = {
      name: nameErr,
      capacity: capacityErr,
      basePrice: priceErr,
      imageUrl: imageErr,
    };
    setErrors(newErrors);

    if (nameErr || capacityErr || priceErr || imageErr) {
      showToast('Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const amenities = amenitiesStr.split(',').map((s) => s.trim()).filter(Boolean);
      const trimmedUrl = (imageUrl || '').trim();
      const finalImage = trimmedUrl || DEFAULT_ROOM_IMAGE;
      const images = [finalImage];

      if (editingType) {
        await roomService.updateRoomType(editingType.id, {
          name: name.trim(),
          capacity: Number(capacity),
          basePrice: Number(basePrice),
          description: description.trim(),
          amenities,
          images,
        });
        showToast('Cập nhật loại phòng thành công!', 'success');
      } else {
        await roomService.createRoomType({
          name: name.trim(),
          capacity: Number(capacity),
          basePrice: Number(basePrice),
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
                  <td data-label="Hình ảnh" style={{ width: '90px' }}>
                    <img
                      src={rt.images?.[0] || DEFAULT_ROOM_IMAGE}
                      alt={rt.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_ROOM_IMAGE;
                      }}
                      style={{ width: '75px', height: '50px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  </td>
                  <td data-label="Tên Loại Phòng">
                    <strong>{rt.name}</strong>
                  </td>
                  <td data-label="Sức chứa">{rt.capacity} Khách</td>
                  <td data-label="Giá cơ bản / đêm">
                    <strong className="green-text">
                      {rt.basePrice.toLocaleString('vi-VN')} VNĐ
                    </strong>
                  </td>
                  <td data-label="Tiện nghi nổi bật">
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
                  <td data-label="Trạng thái">
                    <span className="badge-active">Hoạt động</span>
                  </td>
                  <td data-label="Thao tác" style={{ textAlign: 'right' }}>
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
        <form onSubmit={handleSubmit} className="crud-form" noValidate>
          <CustomInput
            id="roomTypeName"
            name="roomTypeName"
            label="Tên loại phòng"
            placeholder="Ví dụ: Premier Ocean View Suite"
            value={name}
            required
            error={touched.name ? errors.name : ''}
            onChange={(e) => handleChange('name', e.target.value, setName)}
            onBlur={(e) => handleBlur('name', e.target.value)}
          />

          <div className="form-row-2">
            <CustomInput
              id="capacity"
              name="capacity"
              type="number"
              label="Sức chứa tiêu chuẩn (Khách)"
              placeholder="2"
              value={capacity}
              min="1"
              max="20"
              required
              error={touched.capacity ? errors.capacity : ''}
              onChange={(e) => handleChange('capacity', e.target.value, setCapacity)}
              onBlur={(e) => handleBlur('capacity', e.target.value)}
            />

            <CustomInput
              id="basePrice"
              name="basePrice"
              type="number"
              label="Giá cơ bản mỗi đêm (VNĐ)"
              placeholder="1000000"
              value={basePrice}
              step="50000"
              min="50000"
              required
              error={touched.basePrice ? errors.basePrice : ''}
              onChange={(e) => handleChange('basePrice', e.target.value, setBasePrice)}
              onBlur={(e) => handleBlur('basePrice', e.target.value)}
            />
          </div>

          <CustomInput
            as="textarea"
            id="description"
            name="description"
            label="Mô tả chi tiết"
            placeholder="Mô tả không gian phòng, loại giường, tầm nhìn cảnh quan..."
            value={description}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
          />

          <CustomInput
            id="amenitiesStr"
            name="amenitiesStr"
            label="Tiện nghi (Ngăn cách bằng dấu phẩy)"
            placeholder="Wifi, Điều hòa, Smart TV, Bồn tắm nằm..."
            value={amenitiesStr}
            onChange={(e) => setAmenitiesStr(e.target.value)}
          />

          <div className="room-image-input-section" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            <CustomInput
              id="imageUrl"
              name="imageUrl"
              type="text"
              label="Đường dẫn hình ảnh đại diện (URL hoặc Tải tệp)"
              placeholder="https://images.unsplash.com/... hoặc dán link ảnh"
              value={imageUrl}
              error={touched.imageUrl ? errors.imageUrl : ''}
              onChange={(e) => {
                handleChange('imageUrl', e.target.value, setImageUrl);
                setImageStatus('loading');
              }}
              onBlur={(e) => handleBlur('imageUrl', e.target.value)}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                📁 Tải ảnh từ thiết bị
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>

              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Gợi ý mẫu:</span>
              {PRESET_ROOM_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setImageUrl(preset.url);
                    setImageStatus('loading');
                    setErrors((prev) => ({ ...prev, imageUrl: '' }));
                  }}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.78rem',
                    backgroundColor: imageUrl === preset.url ? '#e0f2fe' : '#ffffff',
                    color: imageUrl === preset.url ? '#0284c7' : '#475569',
                    border: imageUrl === preset.url ? '1px solid #38bdf8' : '1px solid #e2e8f0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {imageUrl && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#334155' }}>
                    Xem trước hình ảnh (Live Preview):
                  </span>
                  {imageStatus === 'success' && (
                    <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                      ✓ Ảnh hiển thị tốt
                    </span>
                  )}
                  {imageStatus === 'error' && (
                    <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                      ⚠️ Không tải được ảnh
                    </span>
                  )}
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={imageUrl}
                    alt="Preview loại phòng"
                    onLoad={() => setImageStatus('success')}
                    onError={() => setImageStatus('error')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {imageStatus === 'error' && (
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#dc2626', lineHeight: 1.4 }}>
                    Đường dẫn ảnh không tải được. Nếu tiếp tục lưu, hệ thống sẽ sử dụng ảnh mặc định để đảm bảo giao diện luôn đẹp mắt.
                  </p>
                )}
              </div>
            )}
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

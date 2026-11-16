import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Lock,
  Upload,
  Image as ImageIcon,
  Trash2,
  Info,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { roomService } from '../../services/roomService';

const INCIDENT_CATEGORIES = [
  'Hỏng điều hòa / Nhiệt độ',
  'Điện nước / Rò rỉ',
  'Thiết bị điện tử / TV / WiFi',
  'Khóa cửa / Thẻ từ',
  'Vệ sinh buồng phòng / Mùi hôi',
  'Nội thất / Giường tủ',
  'Khác',
];

const PRIORITIES = [
  { key: 'LOW', label: 'Thấp (Low)', desc: 'Ảnh hưởng nhỏ, có thể xử lý trong ca hoặc ngày tiếp theo' },
  { key: 'NORMAL', label: 'Bình thường (Normal)', desc: 'Tiện nghi chưa hoàn hảo nhưng vẫn sử dụng được' },
  { key: 'HIGH', label: 'Cao (High)', desc: 'Ảnh hưởng trực tiếp đến sinh hoạt và trải nghiệm nghỉ dưỡng' },
  { key: 'URGENT', label: 'Khẩn cấp (Urgent)', desc: 'Nguy cơ an toàn, hỏng hóc nghiêm trọng cần hỗ trợ ngay' },
];

export function ReportIncidentModal({
  isOpen,
  onClose,
  initialData,
  initialRoom,
  isCustomerMode = false,
  onSuccess,
}) {
  const data = initialData || initialRoom;
  const fileInputRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [category, setCategory] = useState(INCIDENT_CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [blocksResale, setBlocksResale] = useState(false);

  // Image attachment state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load rooms for staff mode
  useEffect(() => {
    if (!isCustomerMode) {
      roomService.getRooms().then(setRooms).catch(() => {});
    }
  }, [isCustomerMode]);

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      if (data?.assignedRooms && data.assignedRooms.length > 0) {
        setSelectedRoomId(String(data.assignedRooms[0].id || data.assignedRooms[0].roomId || ''));
        setSelectedRoomNumber(String(data.assignedRooms[0].roomNumber || ''));
      } else if (data?.roomId || data?.id) {
        setSelectedRoomId(String(data.roomId || data.id));
        setSelectedRoomNumber(String(data.roomNumber || ''));
      } else if (rooms.length > 0) {
        setSelectedRoomId(String(rooms[0].id));
        setSelectedRoomNumber(String(rooms[0].roomNumber || ''));
      } else {
        setSelectedRoomId('');
        setSelectedRoomNumber('');
      }

      setCategory(INCIDENT_CATEGORIES[0]);
      setTitle('');
      setDescription('');
      setPriority('NORMAL');
      setBlocksResale(false);
      setImageFile(null);
      setImagePreview(null);
      setImageError('');
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen, data, rooms, isCustomerMode]);

  const handleRoomChange = (e) => {
    const val = e.target.value;
    setSelectedRoomId(val);
    if (data?.assignedRooms) {
      const match = data.assignedRooms.find(
        (r) => String(r.id || r.roomId) === String(val)
      );
      if (match) setSelectedRoomNumber(match.roomNumber);
    } else {
      const match = rooms.find((r) => String(r.id) === String(val));
      if (match) setSelectedRoomNumber(match.roomNumber);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    setImageError('');
    if (!file) return;

    // Validate image format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setImageError('Định dạng ảnh không hợp lệ. Vui lòng chọn ảnh định dạng JPG, PNG hoặc WebP.');
      return;
    }

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError('Dung lượng ảnh vượt quá giới hạn 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = () => {
    const errs = {};
    if (!selectedRoomId && !selectedRoomNumber) {
      errs.room = 'Vui lòng xác định phòng xảy ra sự cố';
    }
    if (!category) {
      errs.category = 'Vui lòng chọn loại sự cố';
    }
    if (!description.trim()) {
      errs.description = 'Vui lòng nhập mô tả chi tiết sự cố bạn gặp phải';
    } else if (description.trim().length < 5) {
      errs.description = 'Mô tả chi tiết tối thiểu 5 ký tự';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      let finalDescription = description.trim();
      if (imageFile) {
        finalDescription += `\n[Đính kèm ảnh minh họa: ${imageFile.name} (${(imageFile.size / 1024).toFixed(1)} KB)]`;
      }

      const activeRoomNumber =
        selectedRoomNumber ||
        data?.roomNumber ||
        (data?.assignedRooms?.[0]?.roomNumber ? String(data.assignedRooms[0].roomNumber) : '—');

      await onSuccess({
        roomId: Number(selectedRoomId || data?.roomId || data?.id || 0),
        roomNumber: activeRoomNumber,
        bookingId: data?.id || data?.bookingId,
        bookingCode: data?.bookingCode,
        bookingRoomId: data?.bookingRoomId || data?.assignedRooms?.[0]?.id,
        customerName: data?.customerName,
        category,
        title: title.trim() || `${category} - Phòng ${activeRoomNumber}`,
        description: finalDescription,
        priority,
        blocksResale: isCustomerMode ? false : blocksResale,
        imageUrl: imagePreview || undefined,
      });

      onClose();
    } catch (err) {
      console.error('Lỗi khi gửi báo cáo sự cố:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCustomerMode ? 'Báo cáo sự cố phòng đang lưu trú' : 'Báo cáo phiếu sự cố buồng phòng (Incident Report)'}
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* Banner thông tin */}
        <div
          style={{
            background: isCustomerMode ? '#EFF6FF' : '#FEF2F2',
            border: `1px solid ${isCustomerMode ? '#BFDBFE' : '#FECACA'}`,
            borderRadius: '8px',
            padding: '0.65rem 0.85rem',
            color: isCustomerMode ? '#1E40AF' : '#991B1B',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {isCustomerMode ? (
            <Info size={16} style={{ flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          )}
          <span>
            {isCustomerMode
              ? 'Yêu cầu khắc phục sự cố buồng phòng hoàn toàn miễn phí. Đội ngũ kỹ thuật sẽ tiếp nhận và xử lý nhanh chóng.'
              : 'Phiếu sự cố dùng để theo dõi khắc phục kỹ thuật, bảo trì và vệ sinh phòng. Không tính phí vào hóa đơn khách hàng.'}
          </span>
        </div>

        {/* Thông tin phòng & Booking liên quan */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Phòng xảy ra sự cố *
            </label>
            {isCustomerMode && data?.assignedRooms && data.assignedRooms.length > 1 ? (
              <select
                value={selectedRoomId}
                onChange={handleRoomChange}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  background: '#FFFFFF',
                  color: '#0F1E36',
                  fontWeight: 600,
                }}
              >
                {data.assignedRooms.map((r) => (
                  <option key={r.id || r.roomId} value={r.id || r.roomId}>
                    Phòng {r.roomNumber} (Tầng {r.floor || '—'})
                  </option>
                ))}
              </select>
            ) : isCustomerMode ? (
              <input
                type="text"
                readOnly
                value={
                  selectedRoomNumber
                    ? `Phòng ${selectedRoomNumber}`
                    : data?.roomNumber
                    ? `Phòng ${data.roomNumber}`
                    : 'Phòng theo đơn đặt'
                }
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  background: '#F1F5F9',
                  color: '#0F1E36',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <select
                value={selectedRoomId}
                onChange={handleRoomChange}
                disabled={Boolean(data?.roomId || data?.id)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  background: data?.roomId || data?.id ? '#F1F5F9' : '#FFFFFF',
                  color: '#0F1E36',
                  fontWeight: 600,
                }}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Phòng {r.roomNumber} ({r.roomTypeName}) · {r.status}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Mã đặt phòng liên quan
            </label>
            <input
              type="text"
              readOnly
              value={data?.bookingCode ? `${data.bookingCode} (Đang lưu trú)` : 'Chưa gắn mã đặt phòng'}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '0.85rem',
                background: '#F8FAFC',
                color: '#64748B',
                fontWeight: 600,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Loại sự cố & Mức độ ưu tiên */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Phân loại sự cố *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
                background: '#FFFFFF',
              }}
            >
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Mức độ ảnh hưởng / Ưu tiên *
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
                background:
                  priority === 'URGENT' || priority === 'CRITICAL'
                    ? '#FEF2F2'
                    : priority === 'HIGH'
                    ? '#FFF7ED'
                    : '#FFFFFF',
                color:
                  priority === 'URGENT' || priority === 'CRITICAL'
                    ? '#B91C1C'
                    : priority === 'HIGH'
                    ? '#C2410C'
                    : '#0F1E36',
                fontWeight: 700,
              }}
            >
              {PRIORITIES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tiêu đề tóm tắt */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Tiêu đề tóm tắt (Tùy chọn)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Điều hòa không mát, Khóa cửa chớp đèn đỏ, Vòi sen rò rỉ..."
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.88rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Mô tả chi tiết */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Mô tả chi tiết sự cố *
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả cụ thể vị trí, hiện tượng hoặc mong muốn hỗ trợ để nhân viên kỹ thuật chuẩn bị công cụ xử lý..."
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: errors.description ? '1px solid #EF4444' : '1px solid #CBD5E1',
              fontSize: '0.88rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          {errors.description && (
            <span style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '0.25rem', display: 'block' }}>
              {errors.description}
            </span>
          )}
        </div>

        {/* Đính kèm ảnh sự cố */}
        <div style={{ border: '1px dashed #CBD5E1', borderRadius: '10px', padding: '0.85rem 1rem', background: '#F8FAFC' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ImageIcon size={15} /> Ảnh chụp sự cố (Tùy chọn, tối đa 5MB)
            </span>
            {imagePreview && (
              <button
                type="button"
                onClick={handleRemoveImage}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EF4444',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Trash2 size={13} /> Xóa ảnh
              </button>
            )}
          </div>

          {imagePreview ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <img
                src={imagePreview}
                alt="Ảnh chụp sự cố"
                style={{
                  width: '90px',
                  height: '70px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                }}
              />
              <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                <div style={{ fontWeight: 600, color: '#0F172A' }}>{imageFile?.name}</div>
                <div>Dung lượng: {(imageFile?.size ? imageFile.size / 1024 : 0).toFixed(1)} KB</div>
                <div style={{ color: '#16A34A', marginTop: '0.2rem' }}>✓ Đã đính kèm ảnh thành công</div>
              </div>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                id="incident-file-upload"
              />
              <label
                htmlFor="incident-file-upload"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} /> Chọn ảnh từ máy tính / điện thoại
              </label>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', marginLeft: '0.75rem' }}>
                Hỗ trợ JPG, PNG, WebP (Tối đa 5MB)
              </span>
            </div>
          )}

          {imageError && (
            <div style={{ color: '#EF4444', fontSize: '0.78rem', marginTop: '0.4rem' }}>
              {imageError}
            </div>
          )}
        </div>

        {/* blocksResale switch / checkbox - Chỉ hiển thị cho nhân viên / Admin */}
        {!isCustomerMode && (
          <div
            style={{
              background: blocksResale ? '#FEF2F2' : '#F8FAFC',
              border: `1px solid ${blocksResale ? '#FECACA' : '#E2E8F0'}`,
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <input
              type="checkbox"
              id="blocksResale-checkbox"
              checked={blocksResale}
              onChange={(e) => setBlocksResale(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                marginTop: '2px',
              }}
            />
            <label htmlFor="blocksResale-checkbox" style={{ cursor: 'pointer', flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: blocksResale ? '#991B1B' : '#0F1E36', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={14} /> Chặn bán lại phòng (blocksResale)
              </div>
              <div style={{ fontSize: '0.78rem', color: blocksResale ? '#B91C1C' : '#64748B', marginTop: '0.2rem' }}>
                {blocksResale
                  ? 'ĐANG BẬT: Sự cố nghiêm trọng yêu cầu tạm dừng bán hoặc phân bổ phòng này cho khách mới cho đến khi được sửa chữa hoàn tất.'
                  : 'ĐANG TẮT: Sự cố nhỏ không ảnh hưởng lớn đến việc mở bán phòng sau khi khách hiện tại trả phòng.'}
              </div>
            </label>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ minWidth: '150px' }}
          >
            {submitting
              ? 'Đang gửi...'
              : isCustomerMode
              ? 'Gửi báo cáo sự cố'
              : 'Tạo phiếu sự cố'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ReportIncidentModal;
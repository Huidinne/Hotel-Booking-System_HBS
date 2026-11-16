import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Home, FileText, CheckCircle2, Lock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { CustomInput } from '../common/CustomInput';
import { MOCK_ROOMS } from '../../mock/roomMock';

const INCIDENT_CATEGORIES = [
  'Hỏng điều hòa',
  'Điện nước / Rò rỉ',
  'Thiết bị điện tử / TV',
  'Khóa cửa / Thẻ từ',
  'Vệ sinh / Mùi hôi',
  'Nội thất / Giường tủ',
  'Khác',
];

const PRIORITIES = [
  { key: 'LOW', label: 'Thấp (Không gấp)', desc: 'Xử lý trong ca hoặc ngày tiếp theo' },
  { key: 'MEDIUM', label: 'Trung bình', desc: 'Ảnh hưởng nhỏ đến tiện nghi lưu trú' },
  { key: 'HIGH', label: 'Cao (Cần khắc phục sớm)', desc: 'Ảnh hưởng trực tiếp đến trải nghiệm khách' },
  { key: 'CRITICAL', label: 'Khẩn cấp', desc: 'Nguy cơ an toàn, hư hỏng nghiêm trọng' },
];

export function ReportIncidentModal({
  isOpen,
  onClose,
  initialData, // { roomId, roomNumber, bookingId, bookingCode, bookingRoomId, customerName }
  onSuccess,
}) {
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [category, setCategory] = useState('Hỏng điều hòa');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [blocksResale, setBlocksResale] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData?.roomId) {
        setSelectedRoomId(String(initialData.roomId));
      } else {
        setSelectedRoomId(String(MOCK_ROOMS[0]?.id || '1'));
      }
      setCategory('Hỏng điều hòa');
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setBlocksResale(false);
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen, initialData]);

  const selectedRoom = MOCK_ROOMS.find((r) => String(r.id) === String(selectedRoomId));

  const validate = () => {
    const errs = {};
    if (!selectedRoomId) {
      errs.room = 'Vui lòng chọn phòng xảy ra sự cố';
    }
    if (!category) {
      errs.category = 'Vui lòng chọn loại sự cố';
    }
    if (!description.trim()) {
      errs.description = 'Mô tả chi tiết sự cố không được để trống';
    } else if (description.trim().length < 5) {
      errs.description = 'Mô tả chi tiết tối thiểu 5 ký tự';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSuccess({
        roomId: Number(selectedRoomId),
        roomNumber: selectedRoom?.roomNumber || initialData?.roomNumber || '—',
        bookingId: initialData?.bookingId,
        bookingCode: initialData?.bookingCode,
        bookingRoomId: initialData?.bookingRoomId,
        customerName: initialData?.customerName,
        category,
        title: title.trim() || `${category} - Phòng ${selectedRoom?.roomNumber || ''}`,
        description: description.trim(),
        priority,
        blocksResale,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Báo cáo phiếu sự cố buồng phòng (Incident Report)"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* Banner phân biệt nghiệp vụ */}
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem',
            color: '#991B1B',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            Phiếu sự cố dùng để theo dõi khắc phục kỹ thuật, bảo trì và vệ sinh phòng. <strong>Không tính phí vào hóa đơn khách hàng.</strong>
          </span>
        </div>

        {/* Thông tin phòng & Booking liên quan */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Phòng xảy ra sự cố *
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              disabled={Boolean(initialData?.roomId)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
                background: initialData?.roomId ? '#F1F5F9' : '#FFFFFF',
                color: '#0F1E36',
                fontWeight: 600,
              }}
            >
              {MOCK_ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  Phòng {r.roomNumber} ({r.roomTypeName}) · {r.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Lượt lưu trú liên quan
            </label>
            <input
              type="text"
              readOnly
              value={
                initialData?.bookingRoomId
                  ? `${initialData.bookingRoomId} (${initialData.customerName || 'Khách đang ở'})`
                  : 'Sự cố phát hiện khi phòng trống'
              }
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '0.82rem',
                background: '#F8FAFC',
                color: '#64748B',
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
              Mức độ ưu tiên *
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
                  priority === 'CRITICAL'
                    ? '#FEF2F2'
                    : priority === 'HIGH'
                    ? '#FFF7ED'
                    : '#FFFFFF',
                color:
                  priority === 'CRITICAL'
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
            placeholder="Ví dụ: Điều hòa chảy nước, Khóa từ chớp đỏ..."
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
            placeholder="Mô tả cụ thể vị trí, hiện tượng, thời điểm phát hiện hoặc yêu cầu xử lý..."
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

        {/* blocksResale switch / checkbox */}
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

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ minWidth: '140px' }}
          >
            {submitting ? 'Đang tạo phiếu...' : 'Tạo phiếu sự cố'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ReportIncidentModal;

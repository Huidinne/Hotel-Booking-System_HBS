import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  User,
  CheckCircle2,
  Lock,
  Edit2,
  Save,
  Calendar,
  Layers,
  Wrench,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  BlocksResaleBadge,
  IncidentPriorityBadge,
  IncidentStatusBadge,
} from '../common/Badge';

const INCIDENT_STATUSES = [
  { key: 'OPEN', label: 'Tiếp nhận mới (OPEN)' },
  { key: 'IN_PROGRESS', label: 'Đang xử lý (IN_PROGRESS)' },
  { key: 'RESOLVED', label: 'Đã hoàn tất (RESOLVED)' },
  { key: 'CANCELLED', label: 'Đã hủy phiếu (CANCELLED)' },
];

const PRIORITIES = [
  { key: 'LOW', label: 'Thấp (LOW)' },
  { key: 'NORMAL', label: 'Bình thường (NORMAL)' },
  { key: 'HIGH', label: 'Cao (HIGH)' },
  { key: 'URGENT', label: 'Khẩn cấp (URGENT)' },
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

export function IncidentDetailModal({ isOpen, onClose, incident, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [priority, setPriority] = useState('NORMAL');
  const [status, setStatus] = useState('OPEN');
  const [blocksResale, setBlocksResale] = useState(false);
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (incident) {
      setPriority(incident.priority === 'MEDIUM' ? 'NORMAL' : incident.priority === 'CRITICAL' ? 'URGENT' : (incident.priority || 'NORMAL'));
      setStatus(incident.status === 'REPORTED' ? 'OPEN' : incident.status === 'CLOSED' ? 'RESOLVED' : (incident.status || 'OPEN'));
      setBlocksResale(Boolean(incident.blocksResale));
      setDescription(incident.description || '');
      setAssignedTo(incident.assignedTo || incident.resolvedBy || '');
      setResolutionNote(incident.resolutionNote || '');
      setIsEditing(false);
      setSubmitting(false);
    }
  }, [incident]);

  if (!isOpen || !incident) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onUpdate(incident.id, {
        priority,
        status,
        blocksResale,
        description: description.trim(),
        assignedTo: assignedTo.trim(),
        resolutionNote: resolutionNote.trim(),
        reason: resolutionNote.trim() || 'Hủy phiếu theo yêu cầu vận hành',
        version: incident.version,
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết phiếu sự cố: ${incident.incidentCode}`}
      maxWidth="700px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header Bar */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>PHÒNG VẬT LÝ</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F1E36' }}>
              Phòng {incident.roomNumber}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IncidentPriorityBadge priority={incident.priority} />
            <IncidentStatusBadge status={incident.status} />
            <BlocksResaleBadge blocksResale={incident.blocksResale} />
          </div>
        </div>

        {/* Thông tin ngữ cảnh */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            fontSize: '0.85rem',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
          }}
        >
          <div>
            <span style={{ color: '#64748B' }}>Loại sự cố:</span>{' '}
            <strong style={{ color: '#0F1E36' }}>{incident.category}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Lượt lưu trú:</span>{' '}
            <strong style={{ color: '#0F1E36' }}>
              {incident.bookingRoomId ? `${incident.bookingRoomId} (${incident.customerName})` : 'Phát hiện khi phòng trống'}
            </strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Người báo cáo:</span>{' '}
            <strong style={{ color: '#0F1E36' }}>{incident.reportedBy || 'Lễ tân'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Thời gian lập phiếu:</span>{' '}
            <span style={{ color: '#334155' }}>{formatDateTime(incident.createdAt)}</span>
          </div>
        </div>

        {/* View mode vs Edit mode */}
        {!isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Tiêu đề & Mô tả */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F1E36', marginBottom: '0.35rem' }}>
                {incident.title}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {incident.description}
              </div>
            </div>

            {/* Thông tin phân công & xử lý */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748B' }}>Người / Bộ phận xử lý:</span>{' '}
                <strong>{incident.assignedTo || 'Chưa phân công'}</strong>
              </div>
              {incident.resolutionNote && (
                <div style={{ marginTop: '0.5rem', background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#166534' }}>
                  <strong>Ghi chú xử lý:</strong> {incident.resolutionNote}
                </div>
              )}
              {incident.resolvedAt && (
                <div style={{ marginTop: '0.35rem', color: '#15803D', fontSize: '0.8rem' }}>
                  Hoàn tất lúc: {formatDateTime(incident.resolvedAt)}
                </div>
              )}
            </div>

            {/* Action button to switch to Edit mode */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditing(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Edit2 size={14} /> Cập nhật phiếu sự cố
              </button>

              <button type="button" className="btn-secondary" onClick={onClose}>
                Đóng
              </button>
            </div>
          </div>
        ) : (
          /* EDIT FORM */
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Status & Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Trạng thái xử lý *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    background: '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  {INCIDENT_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Mức độ ưu tiên *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    background: '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* blocksResale Switch */}
            <div
              style={{
                background: blocksResale ? '#FEF2F2' : '#F8FAFC',
                border: `1px solid ${blocksResale ? '#FECACA' : '#E2E8F0'}`,
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <input
                type="checkbox"
                id="edit-blocksResale"
                checked={blocksResale}
                onChange={(e) => setBlocksResale(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="edit-blocksResale" style={{ cursor: 'pointer', flex: 1, fontSize: '0.85rem' }}>
                <strong>Yêu cầu chặn bán lại phòng (blocksResale)</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {blocksResale ? 'Đang bật chặn bán lại' : 'Không chặn bán'}
                </div>
              </label>
            </div>

            {/* Assigned To */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                Người / Bộ phận xử lý
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Ví dụ: Kỹ thuật viên Daikin, Vũ Minh..."
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                Mô tả chi tiết sự cố
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Resolution Note */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                Ghi chú khắc phục / Kết quả xử lý
              </label>
              <textarea
                rows={2}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Ghi rõ giải pháp đã khắc phục, phụ tùng đã thay thế..."
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={submitting}
                onClick={() => setIsEditing(false)}
              >
                Hủy sửa
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={14} /> {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export default IncidentDetailModal;

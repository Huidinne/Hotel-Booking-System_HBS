import React, { useState, useEffect } from 'react';
import { Utensils, DollarSign, Layers, Tag, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { CustomInput } from '../common/CustomInput';

const CATEGORIES = ['Khai vị', 'Món chính', 'Ăn nhẹ 24/7', 'Tráng miệng', 'Đồ uống'];
const COMMON_UNITS = ['Phần', 'Dĩa', 'Tô', 'Ly', 'Chai', 'Ấm', 'Combo'];

export function MenuItemModal({ isOpen, onClose, onSave, item }) {
  const isEdit = Boolean(item);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Món chính');
  const [unit, setUnit] = useState('Phần');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setName(item.name || '');
        setCategory(item.category || 'Món chính');
        setUnit(item.unit || 'Phần');
        setPrice(String(item.price ?? ''));
        setStatus(item.status || 'AVAILABLE');
        setDescription(item.description || '');
      } else {
        setName('');
        setCategory('Món chính');
        setUnit('Phần');
        setPrice('');
        setStatus('AVAILABLE');
        setDescription('');
      }
      setErrors({});
      setTouched({});
      setSubmitting(false);
    }
  }, [isOpen, item]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Tên món ăn không được để trống';
    } else if (name.trim().length < 2) {
      errs.name = 'Tên món ăn tối thiểu 2 ký tự';
    }

    if (!category) {
      errs.category = 'Vui lòng chọn nhóm món ăn';
    }

    if (!unit.trim()) {
      errs.unit = 'Đơn vị tính không được để trống';
    }

    const numPrice = Number(price);
    if (price === '' || isNaN(numPrice)) {
      errs.price = 'Giá bán phải là một số hợp lệ';
    } else if (numPrice < 0) {
      errs.price = 'Giá bán không được âm';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, category: true, unit: true, price: true });
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        category,
        unit: unit.trim(),
        price: Number(price),
        status,
        description: description.trim(),
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
      title={isEdit ? `Chỉnh sửa món ăn: ${item?.itemCode || ''}` : 'Thêm món ăn mới vào thực đơn'}
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Tên món ăn */}
        <CustomInput
          id="menu-item-name"
          name="name"
          label="Tên món ăn *"
          placeholder="Ví dụ: Bò Wagyu A5 Áp Chảo"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (touched.name) validate();
          }}
          onBlur={() => setTouched((p) => ({ ...p, name: true }))}
          error={touched.name ? errors.name : ''}
          required
        />

        {/* Nhóm món & Đơn vị tính */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Nhóm món ăn *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '0.9rem',
                color: '#0F172A',
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Đơn vị tính *
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                list="unit-suggestions"
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  if (touched.unit) validate();
                }}
                onBlur={() => setTouched((p) => ({ ...p, unit: true }))}
                placeholder="Phần, Tô, Dĩa..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: touched.unit && errors.unit ? '1px solid #EF4444' : '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.9rem',
                  color: '#0F172A',
                }}
              />
              <datalist id="unit-suggestions">
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
            {touched.unit && errors.unit && (
              <span style={{ fontSize: '0.8rem', color: '#EF4444', marginTop: '0.25rem', display: 'block' }}>
                {errors.unit}
              </span>
            )}
          </div>
        </div>

        {/* Giá bán & Trạng thái bán */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
          <div>
            <CustomInput
              id="menu-item-price"
              name="price"
              type="number"
              min="0"
              step="1000"
              label="Giá bán (VND) *"
              placeholder="Ví dụ: 150000"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                if (touched.price) validate();
              }}
              onBlur={() => setTouched((p) => ({ ...p, price: true }))}
              error={touched.price ? errors.price : ''}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Trạng thái bán *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: status === 'AVAILABLE' ? '#F0FDF4' : '#F8FAFC',
                fontWeight: 600,
                color: status === 'AVAILABLE' ? '#15803D' : '#64748B',
                fontSize: '0.9rem',
              }}
            >
              <option value="AVAILABLE">✓ Đang bán (AVAILABLE)</option>
              <option value="UNAVAILABLE">✗ Ngừng bán (UNAVAILABLE)</option>
            </select>
            <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginTop: '0.3rem' }}>
              {status === 'UNAVAILABLE' ? 'Món ngừng bán sẽ bị khóa khi gọi món dịch vụ phòng.' : 'Khách có thể đặt món này qua dịch vụ phòng 24/7.'}
            </span>
          </div>
        </div>

        {/* Mô tả món ăn */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
            Mô tả món ăn / Thành phần
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả nguyên liệu, hương vị hoặc lưu ý chế biến..."
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.88rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ minWidth: '130px' }}
          >
            {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm món ăn'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

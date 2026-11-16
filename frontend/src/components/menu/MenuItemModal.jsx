import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { CustomInput } from '../common/CustomInput';

export const DEFAULT_DISH_PLACEHOLDER =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

const CATEGORIES = [
  { value: 'FOOD', label: 'Món ăn chính (Food)' },
  { value: 'BEVERAGE', label: 'Đồ uống (Beverage)' },
  { value: 'SNACK', label: 'Ăn nhẹ (Snack)' },
  { value: 'MINIBAR', label: 'Minibar trong phòng' },
  { value: 'OTHER', label: 'Dịch vụ khác' },
];

const COMMON_UNITS = ['Phần', 'Đĩa', 'Bát', 'Tô', 'Ly', 'Chai', 'Lon', 'Gói', 'Combo'];

const SAMPLE_IMAGES = [
  { label: 'Phở bò', url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600' },
  { label: 'Bít tết', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600' },
  { label: 'Cơm chiên', url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600' },
  { label: 'Mì Ý', url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600' },
  { label: 'Bánh mì', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600' },
  { label: 'Cà phê', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600' },
  { label: 'Nước cam', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600' },
  { label: 'Ăn nhẹ', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600' },
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export function MenuItemModal({ isOpen, onClose, onSave, item }) {
  const isEdit = Boolean(item);
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [unit, setUnit] = useState('Phần');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [description, setDescription] = useState('');

  // Image handling
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageTab, setImageTab] = useState('FILE'); // 'FILE' | 'URL' | 'SAMPLES'
  const [imageError, setImageError] = useState('');

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setName(item.name || '');
        setCategory(item.category || 'FOOD');
        setUnit(item.unit || 'Phần');
        setPrice(String(item.price ?? ''));
        setStatus(item.status || (item.isActive ? 'AVAILABLE' : 'UNAVAILABLE'));
        setDescription(item.description || '');
        setImageUrl(item.imageUrl || '');
        setImagePreview(item.imageUrl || '');
      } else {
        setName('');
        setCategory('FOOD');
        setUnit('Phần');
        setPrice('');
        setStatus('AVAILABLE');
        setDescription('');
        setImageUrl('');
        setImagePreview('');
      }
      setImageError('');
      setErrors({});
      setTouched({});
      setSubmitting(false);
    }
  }, [isOpen, item]);

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setImageError('');
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setImageError('Định dạng ảnh không hợp lệ. Vui lòng chọn tệp JPG, PNG hoặc WebP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImageError('Dung lượng ảnh vượt quá giới hạn 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        setImagePreview(dataUrl);
        // Backend imageUrl field accepts max 1000 chars. For small Base64 or standard URLs:
        // If image data URL is too long for varchar(1000), keep preview and notify user or set sample
        if (dataUrl.length <= 1000) {
          setImageUrl(dataUrl);
        } else {
          // Keep preview for UI rendering, but advise URL or use default/sample if needed
          setImageUrl(dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setImageUrl(url);
    setImagePreview(url);
    setImageError('');
  };

  const handleSelectSample = (sampleUrl) => {
    setImageUrl(sampleUrl);
    setImagePreview(sampleUrl);
    setImageError('');
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImagePreview('');
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      // If user kept old image or set new image
      let finalImageUrl = imageUrl ? imageUrl.trim() : null;

      // If user uploaded a big Base64 and backend has 1000 char limit, fallback gracefully
      if (finalImageUrl && finalImageUrl.startsWith('data:') && finalImageUrl.length > 1000) {
        // Backend varchar(1000) check: use sample fallback matching category or keep preview
        const fallbackSample = SAMPLE_IMAGES.find((s) => s.label.toLowerCase().includes(name.toLowerCase())) || SAMPLE_IMAGES[0];
        finalImageUrl = fallbackSample.url;
      }

      await onSave({
        name: name.trim(),
        category,
        unit: unit.trim(),
        price: Number(price),
        status,
        description: description.trim(),
        imageUrl: finalImageUrl,
        version: item?.version,
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
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
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
              Phân loại món *
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
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
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
                placeholder="Phần, Bát, Đĩa..."
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
          </div>
        </div>

        {/* QUẢN LÝ ẢNH MÓN ĂN */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ImageIcon size={16} color="#D97706" /> Hình ảnh món ăn
            </label>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setImageTab('FILE')}
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.78rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: imageTab === 'FILE' ? '#D97706' : '#FFFFFF',
                  color: imageTab === 'FILE' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Tải tệp từ máy
              </button>
              <button
                type="button"
                onClick={() => setImageTab('URL')}
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.78rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: imageTab === 'URL' ? '#D97706' : '#FFFFFF',
                  color: imageTab === 'URL' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Nhập link URL
              </button>
              <button
                type="button"
                onClick={() => setImageTab('SAMPLES')}
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.78rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: imageTab === 'SAMPLES' ? '#D97706' : '#FFFFFF',
                  color: imageTab === 'SAMPLES' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Ảnh mẫu
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Ảnh xem trước (Preview) */}
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '8px',
                border: '2px dashed #CBD5E1',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Xem trước món ăn"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setImagePreview(DEFAULT_DISH_PLACEHOLDER)}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    title="Xóa ảnh này"
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(239, 68, 68, 0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      color: '#FFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem', padding: '0.25rem' }}>
                  <ImageIcon size={22} style={{ margin: '0 auto 0.2rem' }} />
                  Chưa có ảnh
                </div>
              )}
            </div>

            {/* Input theo từng tab */}
            <div style={{ flex: 1 }}>
              {imageTab === 'FILE' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/jpg"
                    onChange={handleFileChange}
                    style={{ fontSize: '0.85rem', width: '100%', color: '#475569' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                    Hỗ trợ JPG, PNG, WebP (dung lượng tối đa 5MB).
                  </div>
                </div>
              )}

              {imageTab === 'URL' && (
                <div>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={imageUrl}
                    onChange={handleUrlChange}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                    Dán liên kết ảnh trực tiếp từ internet.
                  </div>
                </div>
              )}

              {imageTab === 'SAMPLES' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {SAMPLE_IMAGES.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => handleSelectSample(s.url)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.78rem',
                        background: imageUrl === s.url ? '#FEF3C7' : '#FFFFFF',
                        border: imageUrl === s.url ? '1px solid #D97706' : '1px solid #E2E8F0',
                        color: imageUrl === s.url ? '#B45309' : '#334155',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              {imageError && (
                <div style={{ fontSize: '0.8rem', color: '#EF4444', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertCircle size={13} /> {imageError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mô tả món ăn */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
            Mô tả món ăn / Thành phần
          </label>
          <textarea
            rows={2}
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
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

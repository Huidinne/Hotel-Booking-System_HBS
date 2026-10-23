import React, { useEffect } from 'react';

/**
 * Custom Confirmation Dialog Component (HTML/CSS Modal)
 * Replaces native window.confirm() with a luxurious, modern, accessible dialog.
 */
export function ConfirmDialog({
  isOpen,
  title = 'Xác nhận thao tác',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'primary', // 'primary' | 'danger' | 'warning'
  icon = null,
  onConfirm,
  onCancel,
  loading = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          accent: 'linear-gradient(90deg, #C5A880 0%, #881337 100%)',
          iconBg: '#F5EAEA',
          iconColor: '#881337',
          btnBg: '#C5A880',
          btnHover: '#D4AF37',
          btnText: '#0F172A',
          defaultIcon: '⚠️',
        };
      case 'warning':
        return {
          accent: 'linear-gradient(90deg, #C5A880 0%, #FEF3C7 100%)',
          iconBg: '#FEF3C7',
          iconColor: '#92400E',
          btnBg: '#C5A880',
          btnHover: '#D4AF37',
          btnText: '#0F172A',
          defaultIcon: '⚡',
        };
      case 'primary':
      default:
        return {
          accent: 'linear-gradient(90deg, #C5A880 0%, #D4AF37 100%)',
          iconBg: '#F3E8D3',
          iconColor: '#785E2F',
          btnBg: '#C5A880',
          btnHover: '#D4AF37',
          btnText: '#0F172A',
          defaultIcon: '⚜️',
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div
      className="custom-confirm-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="custom-confirm-card">
        {/* Soft Luxury Top Accent Line */}
        <div
          className="custom-confirm-accent-line"
          style={{ background: style.accent }}
        />

        <div className="custom-confirm-body">
          <div className="custom-confirm-header">
            <div
              className="custom-confirm-icon-wrapper"
              style={{ background: style.iconBg, color: style.iconColor }}
            >
              {icon || style.defaultIcon}
            </div>
            <div>
              <h3 className="custom-confirm-title">{title}</h3>
              <p className="custom-confirm-message">{message}</p>
            </div>
          </div>

          <div className="custom-confirm-actions">
            <button
              type="button"
              className="custom-confirm-btn-cancel"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className="custom-confirm-btn-confirm"
              style={{
                backgroundColor: style.btnBg,
                color: style.btnText,
              }}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

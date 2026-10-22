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
          accent: 'linear-gradient(90deg, #EF4444 0%, #B91C1C 100%)',
          iconBg: '#FEE2E2',
          iconColor: '#DC2626',
          btnBg: '#DC2626',
          btnHover: '#B91C1C',
          btnText: '#FFFFFF',
          defaultIcon: '⚠️',
        };
      case 'warning':
        return {
          accent: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
          iconBg: '#FEF3C7',
          iconColor: '#D97706',
          btnBg: '#D97706',
          btnHover: '#B45309',
          btnText: '#FFFFFF',
          defaultIcon: '⚡',
        };
      case 'primary':
      default:
        return {
          accent: 'linear-gradient(90deg, #C5A880 0%, #1E40AF 100%)',
          iconBg: '#EFF6FF',
          iconColor: '#1E40AF',
          btnBg: '#0F172A',
          btnHover: '#1E293B',
          btnText: '#F5D77F',
          defaultIcon: '✨',
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

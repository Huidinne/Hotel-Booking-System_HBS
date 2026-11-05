import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import styles from './ChatWindow.module.css';

export function ChatConfirmModal({ isOpen, onConfirm, onCancel }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className={styles.confirmBackdrop} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className={styles.confirmCard}>
        <button
          type="button"
          className={styles.confirmCloseBtn}
          onClick={onCancel}
          aria-label="Đóng hộp thoại"
        >
          <X size={16} />
        </button>

        <div className={styles.confirmIconWrapper}>
          <AlertTriangle size={24} className={styles.confirmAlertIcon} />
        </div>

        <h4 id="confirm-modal-title" className={styles.confirmTitle}>
          Xóa lịch sử hội thoại?
        </h4>

        <p className={styles.confirmDesc}>
          Toàn bộ tin nhắn hiện tại sẽ được làm mới và một phiên trò chuyện mới cùng Hotel Assistant sẽ được bắt đầu.
        </p>

        <div className={styles.confirmActions}>
          <button
            type="button"
            className={styles.confirmCancelBtn}
            onClick={onCancel}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className={styles.confirmDangerBtn}
            onClick={onConfirm}
          >
            <Trash2 size={14} />
            <span>Xác nhận xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
}

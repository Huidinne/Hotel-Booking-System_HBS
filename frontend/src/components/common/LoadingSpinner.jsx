import React from 'react';

export function LoadingSpinner({ text = 'Đang tải dữ liệu...' }) {
  return (
    <div className="loading-state-container">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

export function EmptyState({ icon = '📭', title = 'Không có dữ liệu', message, actionText, onAction }) {
  return (
    <div className="empty-state-container">
      <span className="empty-icon">{icon}</span>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {actionText && onAction && (
        <button className="btn-primary" onClick={onAction} style={{ marginTop: '1rem' }}>
          {actionText}
        </button>
      )}
    </div>
  );
}

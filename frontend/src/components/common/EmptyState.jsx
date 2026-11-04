import React from 'react';

export function EmptyState({ title = 'Không có dữ liệu', message, actionText, onAction }) {
  return (
    <div className="empty-state-container">
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

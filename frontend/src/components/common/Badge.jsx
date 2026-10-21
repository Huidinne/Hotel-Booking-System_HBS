import React from 'react';

export function BookingStatusBadge({ status }) {
  const configs = {
    PENDING: { label: 'Chờ xác nhận', bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    CONFIRMED: { label: 'Đã xác nhận', bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    CHECKED_IN: { label: 'Đang lưu trú', bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    CHECKED_OUT: { label: 'Đã trả phòng', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
    CANCELLED: { label: 'Đã hủy', bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    NO_SHOW: { label: 'Vắng mặt (No-Show)', bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
  };

  const conf = configs[status] || { label: status, bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {conf.label}
    </span>
  );
}

export function PaymentStatusBadge({ status }) {
  const configs = {
    UNPAID: { label: 'Chưa thanh toán', bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    PARTIALLY_PAID: { label: 'Đã cọc 50%', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    FULLY_PAID: { label: 'Đã thanh toán đủ', bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    REFUND_PENDING: { label: 'Chờ hoàn tiền', bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
    REFUNDED: { label: 'Đã hoàn tiền', bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
  };

  const conf = configs[status] || { label: status, bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {conf.label}
    </span>
  );
}

export function RoomStatusBadge({ status }) {
  const configs = {
    AVAILABLE: { label: 'Sẵn sàng đón khách', bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    OCCUPIED: { label: 'Đang có khách', bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    CLEANING: { label: 'Đang dọn dẹp', bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    MAINTENANCE: { label: 'Đang bảo trì', bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  };

  const conf = configs[status] || { label: status, bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.65rem',
        borderRadius: '6px',
        fontSize: '0.8rem',
        fontWeight: 600,
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: conf.text,
        }}
      />
      {conf.label}
    </span>
  );
}

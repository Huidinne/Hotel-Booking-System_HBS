import React from 'react';

export function BookingStatusBadge({ status }) {
  const configs = {
    PENDING: {
      label: 'Chờ xác nhận',
      bg: 'var(--status-warning-bg, #FFFBEB)',
      text: 'var(--status-warning-text, #92400E)',
      border: 'var(--status-warning-border, #FDE68A)',
      dot: 'var(--status-warning-dot, #F59E0B)',
    },
    CONFIRMED: {
      label: 'Đã xác nhận',
      bg: 'var(--status-info-bg, #EFF6FF)',
      text: 'var(--status-info-text, #1E40AF)',
      border: 'var(--status-info-border, #BFDBFE)',
      dot: 'var(--status-info-dot, #3B82F6)',
    },
    CHECKED_IN: {
      label: 'Đang lưu trú',
      bg: 'var(--status-success-bg, #ECFDF5)',
      text: 'var(--status-success-text, #065F46)',
      border: 'var(--status-success-border, #A7F3D0)',
      dot: 'var(--status-success-dot, #10B981)',
    },
    CHECKED_OUT: {
      label: 'Đã trả phòng',
      bg: '#F1F5F9',
      text: '#475569',
      border: '#CBD5E1',
      dot: '#64748B',
    },
    CANCELLED: {
      label: 'Đã hủy',
      bg: 'var(--status-danger-bg, #FEF2F2)',
      text: 'var(--status-danger-text, #991B1B)',
      border: 'var(--status-danger-border, #FECACA)',
      dot: 'var(--status-danger-dot, #EF4444)',
    },
    NO_SHOW: {
      label: 'Vắng mặt (No-Show)',
      bg: '#FAF5FF',
      text: '#6B21A8',
      border: '#E9D5FF',
      dot: '#9333EA',
    },
  };

  const conf = configs[status] || { label: status, bg: '#F8FAFC', text: '#475569', border: '#CBD5E1', dot: '#94A3B8' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.35rem 0.85rem',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize: '0.82rem',
        fontWeight: 600,
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: conf.dot || conf.text,
          flexShrink: 0,
        }}
      />
      {conf.label}
    </span>
  );
}

export function PaymentStatusBadge({ status }) {
  const configs = {
    UNPAID: {
      label: 'Chưa thanh toán',
      bg: 'var(--status-danger-bg, #FEF2F2)',
      text: 'var(--status-danger-text, #991B1B)',
      border: 'var(--status-danger-border, #FECACA)',
      dot: 'var(--status-danger-dot, #EF4444)',
    },
    PARTIALLY_PAID: {
      label: 'Đã cọc 50%',
      bg: 'var(--color-gold-light, #F7F3EE)',
      text: 'var(--text-gold, #967038)',
      border: 'var(--color-gold-border, rgba(197, 168, 128, 0.35))',
      dot: 'var(--color-gold, #C5A880)',
    },
    FULLY_PAID: {
      label: 'Đã thanh toán đủ',
      bg: 'var(--status-success-bg, #ECFDF5)',
      text: 'var(--status-success-text, #065F46)',
      border: 'var(--status-success-border, #A7F3D0)',
      dot: 'var(--status-success-dot, #10B981)',
    },
    REFUND_PENDING: {
      label: 'Chờ hoàn tiền',
      bg: 'var(--status-warning-bg, #FFFBEB)',
      text: 'var(--status-warning-text, #92400E)',
      border: 'var(--status-warning-border, #FDE68A)',
      dot: 'var(--status-warning-dot, #F59E0B)',
    },
    REFUNDED: {
      label: 'Đã hoàn tiền',
      bg: '#FAF5FF',
      text: '#6B21A8',
      border: '#E9D5FF',
      dot: '#9333EA',
    },
  };

  const conf = configs[status] || { label: status, bg: '#F8FAFC', text: '#475569', border: '#CBD5E1', dot: '#94A3B8' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.35rem 0.85rem',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize: '0.82rem',
        fontWeight: 600,
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: conf.dot || conf.text,
          flexShrink: 0,
        }}
      />
      {conf.label}
    </span>
  );
}

export function RoomStatusBadge({ status }) {
  const configs = {
    AVAILABLE: {
      label: 'Sẵn sàng đón khách',
      bg: 'var(--status-success-bg, #ECFDF5)',
      text: 'var(--status-success-text, #065F46)',
      border: 'var(--status-success-border, #A7F3D0)',
      dot: 'var(--status-success-dot, #10B981)',
    },
    OCCUPIED: {
      label: 'Đang có khách',
      bg: 'var(--status-info-bg, #EFF6FF)',
      text: 'var(--status-info-text, #1E40AF)',
      border: 'var(--status-info-border, #BFDBFE)',
      dot: 'var(--status-info-dot, #3B82F6)',
    },
    CLEANING: {
      label: 'Đang dọn dẹp',
      bg: 'var(--status-warning-bg, #FFFBEB)',
      text: 'var(--status-warning-text, #92400E)',
      border: 'var(--status-warning-border, #FDE68A)',
      dot: 'var(--status-warning-dot, #F59E0B)',
    },
    MAINTENANCE: {
      label: 'Đang bảo trì',
      bg: 'var(--status-danger-bg, #FEF2F2)',
      text: 'var(--status-danger-text, #991B1B)',
      border: 'var(--status-danger-border, #FECACA)',
      dot: 'var(--status-danger-dot, #EF4444)',
    },
  };

  const conf = configs[status] || { label: status, bg: '#F8FAFC', text: '#475569', border: '#CBD5E1', dot: '#94A3B8' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.35rem 0.85rem',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize: '0.82rem',
        fontWeight: 600,
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: conf.dot || conf.text,
          flexShrink: 0,
        }}
      />
      {conf.label}
    </span>
  );
}

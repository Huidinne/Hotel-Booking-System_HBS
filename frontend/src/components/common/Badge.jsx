import React from 'react';

export function BookingStatusBadge({ status }) {
  const configs = {
    PENDING: {
      label: 'Chờ xác nhận',
      bg: 'var(--status-warning-bg, #FEF3C7)',
      text: 'var(--status-warning-text, #92400E)',
      border: 'var(--status-warning-border, #FDE68A)',
      dot: 'var(--status-warning-dot, #B45309)',
    },
    CONFIRMED: {
      label: 'Đã xác nhận',
      bg: 'var(--status-info-bg, #F3E8D3)',
      text: 'var(--status-info-text, #785E2F)',
      border: 'var(--status-info-border, #E2D2B3)',
      dot: 'var(--status-info-dot, #9E7D3B)',
    },
    CHECKED_IN: {
      label: 'Đang lưu trú',
      bg: 'var(--status-success-bg, #E8DFCA)',
      text: 'var(--status-success-text, #6B5120)',
      border: 'var(--status-success-border, #D8CCA8)',
      dot: 'var(--status-success-dot, #8C6D2D)',
    },
    CHECKED_OUT: {
      label: 'Đã trả phòng',
      bg: '#F1F5F9',
      text: '#475569',
      border: '#E2E8F0',
      dot: '#64748B',
    },
    CANCELLED: {
      label: 'Đã hủy',
      bg: 'var(--status-danger-bg, #F5EAEA)',
      text: 'var(--status-danger-text, #881337)',
      border: 'var(--status-danger-border, #E5D0D0)',
      dot: 'var(--status-danger-dot, #881337)',
    },
    NO_SHOW: {
      label: 'Vắng mặt (No-Show)',
      bg: 'var(--status-danger-bg, #F5EAEA)',
      text: 'var(--status-danger-text, #881337)',
      border: 'var(--status-danger-border, #E5D0D0)',
      dot: 'var(--status-danger-dot, #881337)',
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
      bg: 'var(--status-danger-bg, #F5EAEA)',
      text: 'var(--status-danger-text, #881337)',
      border: 'var(--status-danger-border, #E5D0D0)',
      dot: 'var(--status-danger-dot, #881337)',
    },
    PARTIALLY_PAID: {
      label: 'Đã cọc 50%',
      bg: 'var(--status-info-bg, #F3E8D3)',
      text: 'var(--status-info-text, #785E2F)',
      border: 'var(--status-info-border, #E2D2B3)',
      dot: 'var(--status-info-dot, #9E7D3B)',
    },
    FULLY_PAID: {
      label: 'Đã thanh toán đủ',
      bg: 'var(--status-success-bg, #E8DFCA)',
      text: 'var(--status-success-text, #6B5120)',
      border: 'var(--status-success-border, #D8CCA8)',
      dot: 'var(--status-success-dot, #8C6D2D)',
    },
    REFUND_PENDING: {
      label: 'Chờ hoàn tiền',
      bg: 'var(--status-warning-bg, #FEF3C7)',
      text: 'var(--status-warning-text, #92400E)',
      border: 'var(--status-warning-border, #FDE68A)',
      dot: 'var(--status-warning-dot, #B45309)',
    },
    REFUNDED: {
      label: 'Đã hoàn tiền',
      bg: '#DCFCE7',
      text: '#166534',
      border: '#BBF7D0',
      dot: '#16A34A',
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
      bg: 'var(--status-success-bg, #E8DFCA)',
      text: 'var(--status-success-text, #6B5120)',
      border: 'var(--status-success-border, #D8CCA8)',
      dot: 'var(--status-success-dot, #8C6D2D)',
    },
    OCCUPIED: {
      label: 'Đang có khách',
      bg: 'var(--status-info-bg, #F3E8D3)',
      text: 'var(--status-info-text, #785E2F)',
      border: 'var(--status-info-border, #E2D2B3)',
      dot: 'var(--status-info-dot, #9E7D3B)',
    },
    CLEANING: {
      label: 'Đang dọn dẹp',
      bg: 'var(--status-warning-bg, #FEF3C7)',
      text: 'var(--status-warning-text, #92400E)',
      border: 'var(--status-warning-border, #FDE68A)',
      dot: 'var(--status-warning-dot, #B45309)',
    },
    MAINTENANCE: {
      label: 'Đang bảo trì',
      bg: 'var(--status-danger-bg, #F5EAEA)',
      text: 'var(--status-danger-text, #881337)',
      border: 'var(--status-danger-border, #E5D0D0)',
      dot: 'var(--status-danger-dot, #881337)',
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

export function MenuItemStatusBadge({ status }) {
  const isAvailable = status === 'AVAILABLE';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        backgroundColor: isAvailable ? '#DCFCE7' : '#F1F5F9',
        color: isAvailable ? '#15803D' : '#64748B',
        border: `1px solid ${isAvailable ? '#BBF7D0' : '#CBD5E1'}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: isAvailable ? '#16A34A' : '#94A3B8',
          flexShrink: 0,
        }}
      />
      {isAvailable ? 'Đang bán' : 'Ngừng bán'}
    </span>
  );
}

export function RoomServiceStatusBadge({ status }) {
  const configs = {
    PENDING: { label: 'Chờ tiếp nhận', bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', dot: '#B45309' },
    PREPARING: { label: 'Đang chuẩn bị', bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', dot: '#0284C7' },
    DELIVERED: { label: 'Đã phục vụ', bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0', dot: '#16A34A' },
    COMPLETED: { label: 'Hoàn tất', bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF', dot: '#9333EA' },
    CANCELLED: { label: 'Đã hủy', bg: '#FEE2E2', text: '#991B1B', border: '#FECACA', dot: '#DC2626' },
  };
  const conf = configs[status] || { label: status, bg: '#F8FAFC', text: '#475569', border: '#CBD5E1', dot: '#94A3B8' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: conf.dot,
          flexShrink: 0,
        }}
      />
      {conf.label}
    </span>
  );
}

export function IncidentPriorityBadge({ priority }) {
  const configs = {
    LOW: { label: 'Thấp', bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', dot: '#64748B' },
    MEDIUM: { label: 'Trung bình', bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', dot: '#B45309' },
    HIGH: { label: 'Cao', bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA', dot: '#EA580C' },
    CRITICAL: { label: 'Khẩn cấp', bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', dot: '#DC2626' },
  };
  const conf = configs[priority] || { label: priority, bg: '#F8FAFC', text: '#475569', border: '#CBD5E1', dot: '#94A3B8' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.78rem',
        fontWeight: 700,
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: conf.dot,
          flexShrink: 0,
        }}
      />
      {conf.label}
    </span>
  );
}

export function IncidentStatusBadge({ status }) {
  const configs = {
    REPORTED: { label: 'Mới tiếp nhận', bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', dot: '#0284C7' },
    IN_PROGRESS: { label: 'Đang xử lý', bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', dot: '#B45309' },
    RESOLVED: { label: 'Đã xử lý xong', bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0', dot: '#16A34A' },
    CLOSED: { label: 'Đã đóng phiếu', bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', dot: '#64748B' },
  };
  const conf = configs[status] || { label: status, bg: '#F8FAFC', text: '#475569', border: '#CBD5E1', dot: '#94A3B8' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
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
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: conf.dot,
          flexShrink: 0,
        }}
      />
      {conf.label}
    </span>
  );
}

export function BlocksResaleBadge({ blocksResale }) {
  if (blocksResale) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.65rem',
          borderRadius: '6px',
          fontSize: '0.78rem',
          fontWeight: 700,
          backgroundColor: '#FEF2F2',
          color: '#991B1B',
          border: '1px solid #FECACA',
          whiteSpace: 'nowrap',
        }}
        title="Sự cố này yêu cầu tạm chặn bán lại phòng cho khách mới"
      >
        🔒 Chặn bán lại
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.65rem',
        borderRadius: '6px',
        fontSize: '0.78rem',
        fontWeight: 500,
        backgroundColor: '#F8FAFC',
        color: '#64748B',
        border: '1px solid #E2E8F0',
        whiteSpace: 'nowrap',
      }}
      title="Sự cố nhỏ, không yêu cầu chặn bán phòng"
    >
      ✓ Không chặn bán
    </span>
  );
}

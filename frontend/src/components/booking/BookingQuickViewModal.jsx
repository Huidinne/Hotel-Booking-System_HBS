import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Phone, DollarSign, Home, ExternalLink, Hash, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { bookingService } from '../../services/bookingService';

// Format YYYY-MM-DD or ISO string to DD/MM/YYYY
function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  const clean = String(dateStr).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Format VND currency
function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '0 ₫';
  return `${Number(amount).toLocaleString('vi-VN')} ₫`;
}

export function BookingQuickViewModal({ isOpen, onClose, booking }) {
  const navigate = useNavigate();
  const [detailBooking, setDetailBooking] = useState(null);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [extraError, setExtraError] = useState(null);

  // Synchronize modal state immediately with passed booking data for sub-100ms render
  useEffect(() => {
    if (!isOpen || !booking) {
      setDetailBooking(null);
      setLoadingExtra(false);
      setExtraError(null);
      return;
    }

    // Initialize with timeline pre-cached data immediately
    setDetailBooking(booking);
    setExtraError(null);

    // If critical information is missing from the timeline projection, fetch lazily in background
    const hasMissingInfo =
      !booking.customerPhone ||
      booking.depositAmount === undefined ||
      booking.depositAmount === null;

    if (hasMissingInfo && booking.bookingCode) {
      setLoadingExtra(true);
      bookingService
        .getReceptionistBookings({ bookingCode: booking.bookingCode })
        .then((list) => {
          if (Array.isArray(list) && list.length > 0) {
            const found = list[0];
            setDetailBooking((prev) => ({
              ...prev,
              ...found,
              customerPhone: found.customerPhone || prev?.customerPhone,
              depositAmount: found.depositAmount ?? prev?.depositAmount,
              totalPrice: found.totalAmount ?? found.totalPrice ?? prev?.totalPrice,
              checkInDate: found.checkIn || prev?.checkInDate,
              checkOutDate: found.checkOut || prev?.checkOutDate,
            }));
          }
        })
        .catch((err) => {
          console.warn('Lỗi lấy thêm thông tin booking:', err);
          setExtraError('Không thể lấy thêm thông tin chi tiết từ hệ thống');
        })
        .finally(() => {
          setLoadingExtra(false);
        });
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const current = detailBooking || booking;
  const bookingCode = current.bookingCode || (current.bookingId ? `#${current.bookingId}` : '—');
  const customerName = current.customerName || 'Khách vãng lai';
  const customerPhone = current.customerPhone || '—';
  const checkIn = current.checkInDate || current.checkIn || '';
  const checkOut = current.checkOutDate || current.checkOut || '';
  const deposit = current.depositAmount !== undefined && current.depositAmount !== null
    ? current.depositAmount
    : (current.paidAmount || 0);

  const status = current.status || current.bookingStatus || 'CONFIRMED';
  const statusLabel =
    status === 'CHECKED_IN' ? 'Đang lưu trú' :
    status === 'CONFIRMED' ? 'Đã xác nhận' :
    status === 'PENDING' ? 'Chờ xác nhận' :
    status === 'CHECKED_OUT' ? 'Đã trả phòng' :
    status === 'CANCELLED' ? 'Đã hủy' : status;

  const statusBg =
    status === 'CHECKED_IN' ? '#DCFCE7' :
    status === 'CONFIRMED' ? '#DBEAFE' :
    status === 'PENDING' ? '#FEF3C7' : '#F1F5F9';

  const statusColor =
    status === 'CHECKED_IN' ? '#166534' :
    status === 'CONFIRMED' ? '#1E40AF' :
    status === 'PENDING' ? '#92400E' : '#475569';

  const handleOpenDetails = () => {
    onClose();
    // Navigate to Receptionist Bookings page with bookingCode query parameter
    const query = encodeURIComponent(current.bookingCode || current.bookingId || '');
    navigate(`/receptionist/bookings?search=${query}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xem nhanh Booking" maxWidth="520px">
      <div className="quickview-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        
        {/* Header Summary Banner */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1rem 1.2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>
              <Hash size={14} /> Mã đơn đặt phòng
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F1E36', marginTop: '0.2rem' }}>
              {bookingCode}
            </div>
          </div>
          <span
            style={{
              background: statusBg,
              color: statusColor,
              padding: '0.35rem 0.8rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <CheckCircle2 size={14} />
            {statusLabel}
          </span>
        </div>

        {/* Room Info */}
        {(current.roomNumber || current.roomTypeName) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: '#FFFBEB',
              border: '1px solid #FEF3C7',
              borderRadius: '10px',
              fontSize: '0.88rem',
              color: '#92400E',
            }}
          >
            <Home size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Phòng {current.roomNumber}</strong>
              {current.roomTypeName && ` · ${current.roomTypeName}`}
              {current.floor && ` (Tầng ${current.floor})`}
            </div>
          </div>
        )}

        {/* Detail Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Customer Name */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <User size={13} /> Khách hàng
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F1E36', marginTop: '0.25rem' }}>
              {customerName}
            </div>
          </div>

          {/* Customer Phone */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Phone size={13} /> Số điện thoại
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F1E36', marginTop: '0.25rem' }}>
              {customerPhone}
            </div>
          </div>

          {/* Check-in Date */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Calendar size={13} /> Ngày Check-in
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F1E36', marginTop: '0.25rem' }}>
              {formatDateDisplay(checkIn)}
            </div>
          </div>

          {/* Check-out Date */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Calendar size={13} /> Ngày Check-out
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F1E36', marginTop: '0.25rem' }}>
              {formatDateDisplay(checkOut)}
            </div>
          </div>
        </div>

        {/* Financial info */}
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #DCFCE7',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontSize: '0.85rem', fontWeight: 700 }}>
            <DollarSign size={16} /> Tiền đặt cọc đã thanh toán
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803D' }}>
            {formatCurrency(deposit)}
          </div>
        </div>

        {current.totalPrice !== undefined && current.totalPrice !== null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748B', padding: '0 0.5rem' }}>
            <span>Tổng giá trị đơn:</span>
            <span style={{ fontWeight: 700, color: '#334155' }}>{formatCurrency(current.totalPrice)}</span>
          </div>
        )}

        {extraError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B91C1C', fontSize: '0.8rem', background: '#FEF2F2', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
            <AlertCircle size={14} /> {extraError}
          </div>
        )}

        {/* Modal Actions */}
        <div className="modal-actions" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ minWidth: '90px' }}
          >
            Đóng
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenDetails}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', minWidth: '130px' }}
          >
            <ExternalLink size={15} /> Mở booking
          </button>
        </div>
      </div>
    </Modal>
  );
}

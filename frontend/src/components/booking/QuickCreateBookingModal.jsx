import React, { useState, useEffect } from 'react';
import { Calendar, User, Phone, Mail, Home, CreditCard, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { bookingService } from '../../services/bookingService';
import { useToast } from '../../context/ToastContext';

// Helper to add 1 day to YYYY-MM-DD string
function addOneDay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  const nextD = String(date.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

export function QuickCreateBookingModal({ isOpen, onClose, room, initialDate, onSuccess }) {
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset or initialize values when modal opens
  useEffect(() => {
    if (isOpen && room) {
      const initCheckIn = initialDate || new Date().toISOString().slice(0, 10);
      setCheckIn(initCheckIn);
      setCheckOut(addOneDay(initCheckIn));
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setGuests(1);
      setPaymentMethod('CASH');
      setNote('');
      setErrorMessage('');
      setFieldErrors({});
    }
  }, [isOpen, room, initialDate]);

  if (!isOpen || !room) return null;

  const validateForm = () => {
    const errors = {};

    if (!customerName.trim()) {
      errors.customerName = 'Vui lòng nhập họ và tên khách hàng';
    } else if (customerName.trim().length < 2) {
      errors.customerName = 'Họ và tên tối thiểu 2 ký tự';
    }

    if (!customerPhone.trim()) {
      errors.customerPhone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9+\s-]{9,15}$/.test(customerPhone.trim())) {
      errors.customerPhone = 'Số điện thoại không hợp lệ (9 - 15 chữ số)';
    }

    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      errors.customerEmail = 'Email không đúng định dạng';
    }

    if (!checkIn) {
      errors.checkIn = 'Vui lòng chọn ngày nhận phòng';
    }

    if (!checkOut) {
      errors.checkOut = 'Vui lòng chọn ngày trả phòng';
    } else if (checkIn && checkOut <= checkIn) {
      errors.checkOut = 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm';
    }

    if (!guests || Number(guests) < 1) {
      errors.guests = 'Số lượng khách tối thiểu là 1';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      showToast('Vui lòng kiểm tra lại thông tin bị lỗi màu đỏ!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const created = await bookingService.createBooking({
        roomTypeId: room.roomTypeId,
        quantity: 1,
        guests: Number(guests),
        checkIn,
        checkOut,
        paymentMethod,
        note: note.trim() ? `[Phòng ${room.roomNumber}] ${note.trim()}` : `Phòng ${room.roomNumber}`,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
      });

      showToast(`Tạo booking thành công! Mã đơn: ${created.bookingCode}`, 'success');
      onClose();
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    } catch (err) {
      console.error('Lỗi khi tạo booking:', err);
      const msg = err.message || 'Lỗi hệ thống khi tạo đơn đặt phòng';
      // Retain entered user input and display backend error
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo Booking Nhanh" maxWidth="560px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        
        {/* Selected Room Banner */}
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#16A34A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.05rem',
              }}
            >
              {room.roomNumber}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#14532D', fontSize: '1rem' }}>
                Phòng {room.roomNumber} · Tầng {room.floor}
              </div>
              <div style={{ color: '#166534', fontSize: '0.82rem' }}>
                {room.roomTypeName || 'Phòng tiêu chuẩn'} · Mã phòng: #{room.id}
              </div>
            </div>
          </div>
          <span
            style={{
              background: '#DCFCE7',
              color: '#15803D',
              border: '1px solid #86EFAC',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            AVAILABLE
          </span>
        </div>

        {/* Backend Error Banner */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '0.75rem',
              color: '#991B1B',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Lỗi từ máy chủ:</strong> {errorMessage}
            </div>
          </div>
        )}

        {/* Customer Information */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          {/* Customer Name */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Họ và tên khách hàng <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (fieldErrors.customerName) setFieldErrors((p) => ({ ...p, customerName: null }));
                }}
                placeholder="Ví dụ: Nguyễn Văn Khách"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                  border: fieldErrors.customerName ? '1px solid #DC2626' : '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                }}
              />
              <User size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            </div>
            {fieldErrors.customerName && (
              <span style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                {fieldErrors.customerName}
              </span>
            )}
          </div>

          {/* Customer Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Số điện thoại <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  if (fieldErrors.customerPhone) setFieldErrors((p) => ({ ...p, customerPhone: null }));
                }}
                placeholder="0987654321"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                  border: fieldErrors.customerPhone ? '1px solid #DC2626' : '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                }}
              />
              <Phone size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            </div>
            {fieldErrors.customerPhone && (
              <span style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                {fieldErrors.customerPhone}
              </span>
            )}
          </div>

          {/* Customer Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Email khách hàng
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value);
                  if (fieldErrors.customerEmail) setFieldErrors((p) => ({ ...p, customerEmail: null }));
                }}
                placeholder="customer@gmail.com"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                  border: fieldErrors.customerEmail ? '1px solid #DC2626' : '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                }}
              />
              <Mail size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            </div>
            {fieldErrors.customerEmail && (
              <span style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                {fieldErrors.customerEmail}
              </span>
            )}
          </div>
        </div>

        {/* Booking Dates & Guests */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
          {/* Check-in Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Ngày nhận phòng <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (fieldErrors.checkIn) setFieldErrors((p) => ({ ...p, checkIn: null }));
                // Automatically adjust checkout if checkout <= checkin
                if (e.target.value && checkOut && checkOut <= e.target.value) {
                  setCheckOut(addOneDay(e.target.value));
                }
              }}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: fieldErrors.checkIn ? '1px solid #DC2626' : '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.88rem',
              }}
            />
            {fieldErrors.checkIn && (
              <span style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                {fieldErrors.checkIn}
              </span>
            )}
          </div>

          {/* Check-out Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Ngày trả phòng <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value);
                if (fieldErrors.checkOut) setFieldErrors((p) => ({ ...p, checkOut: null }));
              }}
              min={checkIn ? addOneDay(checkIn) : undefined}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: fieldErrors.checkOut ? '1px solid #DC2626' : '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.88rem',
              }}
            />
            {fieldErrors.checkOut && (
              <span style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                {fieldErrors.checkOut}
              </span>
            )}
          </div>

          {/* Guests */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Số lượng khách <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={guests}
              onChange={(e) => {
                setGuests(e.target.value);
                if (fieldErrors.guests) setFieldErrors((p) => ({ ...p, guests: null }));
              }}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: fieldErrors.guests ? '1px solid #DC2626' : '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.88rem',
              }}
            />
            {fieldErrors.guests && (
              <span style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                {fieldErrors.guests}
              </span>
            )}
          </div>
        </div>

        {/* Payment Method & Note */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Phương thức thanh toán <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                background: '#FFFFFF',
              }}
            >
              <option value="CASH">Tiền mặt tại quầy (CASH)</option>
              <option value="VNPAY">Cổng thanh toán điện tử VNPay (VNPAY)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Ghi chú thêm
            </label>
            <textarea
              rows="2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Yêu cầu đặc biệt của khách hàng (nếu có)..."
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                resize: 'none',
              }}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="modal-actions" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
            style={{ minWidth: '90px' }}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', minWidth: '140px' }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="tl-spin" /> Đang tạo...
              </>
            ) : (
              'Tạo Booking'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

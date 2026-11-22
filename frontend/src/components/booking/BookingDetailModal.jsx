import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Home,
  Utensils,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Printer,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { InvoicePrintModal } from './InvoicePrintModal';
import { BookingStatusBadge, PaymentStatusBadge } from '../common/Badge';
import { roomServiceOrderService } from '../../services/roomServiceOrderService';
import { bookingService } from '../../services/bookingService';
import { useToast } from '../../context/ToastContext';

function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '0 ₫';
  return `${Number(amount).toLocaleString('vi-VN')} ₫`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  const clean = String(dateStr).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

export function BookingDetailModal({ isOpen, onClose, booking, currentUser }) {
  const { showToast } = useToast();

  const [servicesData, setServicesData] = useState({
    allOrders: [],
    deliveredOrders: [],
    pendingConfirmationOrders: [],
    totalDeliveredAmount: 0,
    totalPendingAmount: 0,
  });
  const [loadingServices, setLoadingServices] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Load Room Service Orders for this booking
  const loadServices = useCallback(async () => {
    if (!booking) return;
    const bCode = booking.bookingCode || booking.code;
    const bId = booking.id || booking.bookingId;
    if (!bCode && !bId) return;

    setLoadingServices(true);
    try {
      const data = await roomServiceOrderService.getCustomerBookingServices(
        bCode,
        bId,
        booking.roomNumber || (booking.assignedRooms && booking.assignedRooms[0]?.roomNumber)
      );
      setServicesData(data);
    } catch (err) {
      console.warn('Lỗi tải dữ liệu dịch vụ phòng:', err);
    } finally {
      setLoadingServices(false);
    }
  }, [booking]);

  useEffect(() => {
    if (isOpen && booking) {
      loadServices();
    }
  }, [isOpen, booking, loadServices]);

  // Listen to sync events for live reload
  useEffect(() => {
    const handleSync = () => {
      if (isOpen && booking) {
        loadServices();
      }
    };
    window.addEventListener('room_service_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('room_service_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [isOpen, booking, loadServices]);

  const allOrderedItems = useMemo(() => {
    const list = [];
    (servicesData.allOrders || []).forEach((order) => {
      const orderDate = formatDateTime(order.createdAt);
      (order.items || []).forEach((it, idx) => {
        list.push({
          orderId: order.id,
          orderCode: order.orderCode || `#${order.id}`,
          status: order.status,
          customerConfirmed: order.customerConfirmed,
          customerRejected: order.customerRejected,
          cancelReason: order.cancelReason,
          name: it.name || it.itemName || `Món ăn #${idx + 1}`,
          quantity: it.quantity || 1,
          unit: it.unit || 'Phần',
          price: it.price || it.unitPrice || 0,
          lineTotal: it.lineTotal || it.subtotal || (it.price || 0) * (it.quantity || 1),
          note: it.note || order.note,
          orderDate,
        });
      });
    });
    return list;
  }, [servicesData.allOrders]);

  const totalPendingAmount = useMemo(() => {
    return (servicesData.allOrders || [])
      .filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [servicesData.allOrders]);

  const totalAllOrdersAmount = useMemo(() => {
    return (servicesData.allOrders || [])
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [servicesData.allOrders]);

  if (!isOpen || !booking) return null;

  // 1. Booking Information Calculation
  const bookingCode = booking.bookingCode || booking.code || (booking.id ? `#${booking.id}` : '—');
  const customerName = booking.customerName || currentUser?.fullName || 'Quý khách';
  const customerPhone = booking.customerPhone || currentUser?.phone || '—';
  const customerEmail = booking.customerEmail || currentUser?.email || '—';
  const roomTypeName = booking.roomTypeName || 'Phòng nghỉ Grand Aurora';
  const quantity = Number(booking.quantity || 1);
  const guests = Number(booking.guests || 2);
  const checkIn = booking.checkIn || '';
  const checkOut = booking.checkOut || '';

  // Calculate number of nights
  let numberOfNights = booking.numberOfNights;
  if (!numberOfNights && checkIn && checkOut) {
    try {
      const dIn = new Date(checkIn);
      const dOut = new Date(checkOut);
      const diffTime = dOut.getTime() - dIn.getTime();
      numberOfNights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    } catch {
      numberOfNights = 1;
    }
  }
  numberOfNights = numberOfNights || 1;

  // 2. Room Costs
  const totalRoomAmount = Number(booking.totalAmount || booking.totalPrice || 0);
  const pricePerNight = booking.unitPriceSnapshot || (numberOfNights > 0 && quantity > 0 ? Math.round(totalRoomAmount / (numberOfNights * quantity)) : 0);
  const depositPaid = Number(booking.depositAmount || Math.round(totalRoomAmount * 0.5));

  // 3. Room Service Costs & All Ordered Items
  const totalDeliveredAmount = Number(servicesData.totalDeliveredAmount || 0);
  const totalActiveOrdersAmount = (servicesData.allOrders || [])
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalServicesAmount = Number(
    servicesData.totalServicesAmount ||
    booking.totalServicesAmount ||
    (totalActiveOrdersAmount > 0 ? totalActiveOrdersAmount : totalDeliveredAmount)
  );

  // 4. Total Reconciliation
  const surcharge = 0; // Phụ thu hợp lệ (mặc định 0)
  const discount = 0;  // Giảm giá (mặc định 0)
  const totalCost = totalRoomAmount + totalServicesAmount + surcharge - discount;

  // Số tiền đã thanh toán thực tế
  const actualPaid = Number(
    booking.amountPaid !== undefined && booking.amountPaid !== null
      ? booking.amountPaid
      : booking.paymentStatus === 'FULLY_PAID'
      ? totalCost
      : depositPaid
  );

  // Số tiền còn lại phải trả và cờ tất toán
  const remainingToPay = Math.max(0, totalCost - actualPaid);
  const isFullyPaid = remainingToPay === 0 && (actualPaid > 0 || totalCost === 0);

  // Trạng thái thanh toán hiển thị nhất quán với số dư
  const effectivePaymentStatus =
    booking.bookingStatus === 'CANCELLED' || booking.paymentStatus === 'REFUND_PENDING' || booking.paymentStatus === 'REFUNDED'
      ? booking.paymentStatus
      : isFullyPaid
      ? 'FULLY_PAID'
      : actualPaid > 0
      ? 'PARTIALLY_PAID'
      : 'UNPAID';

  const handleCopy = (text, label) => {
    navigator.clipboard?.writeText(text);
    showToast(`Đã sao chép ${label}!`, 'info');
  };

  const handleDownloadInvoice = async () => {
    try {
      setDownloadingPdf(true);
      await bookingService.downloadInvoicePdf(booking.bookingCode || booking.id);
      showToast('Đã tải hóa đơn PDF thành công!', 'success');
    } catch (err) {
      showToast(err.message || 'Không thể tải hóa đơn PDF lúc này', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      setResendingEmail(true);
      await bookingService.sendInvoiceEmail(booking.bookingCode || booking.id, customerEmail);
      showToast(`Hóa đơn điện tử đã gửi tới ${customerEmail}!`, 'success');
    } catch (err) {
      showToast(err.message || 'Không thể gửi email lúc này', 'error');
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chi tiết đặt phòng & Hóa đơn · ${bookingCode}`} maxWidth="840px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '-0.5rem' }}>
        
        {/* Banner Tổng quan */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#F8FAFC',
            borderRadius: '12px',
            padding: '1.1rem 1.4rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Mã đặt phòng
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F1F5F9', fontFamily: 'monospace' }}>
                {bookingCode}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(bookingCode, 'Mã đặt phòng')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#CBD5E1',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Sao chép mã đặt phòng"
              >
                <Copy size={13} />
              </button>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#CBD5E1', marginTop: '0.35rem' }}>
              Lưu trú: <strong>{formatDateDisplay(checkIn)}</strong> → <strong>{formatDateDisplay(checkOut)}</strong> ({numberOfNights} đêm)
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <BookingStatusBadge status={booking.bookingStatus} />
              <PaymentStatusBadge status={effectivePaymentStatus} />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Phương thức: <strong>{booking.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Tiền mặt tại quầy'}</strong>
            </div>
          </div>
        </div>

        {/* PHẦN 4.1: THÔNG TIN ĐẶT PHÒNG */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.1rem',
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#0F1E36',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              marginBottom: '0.85rem',
              borderBottom: '1px solid #F1F5F9',
              paddingBottom: '0.5rem',
            }}
          >
            <User size={16} color="#B45309" /> 1. Thông Tin Khách Hàng & Đặt Phòng
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem 1.25rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.76rem' }}>Khách hàng:</span>
              <strong style={{ color: '#0F1E36' }}>{customerName}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.76rem' }}>Số điện thoại:</span>
              <strong style={{ color: '#0F1E36' }}>{customerPhone}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.76rem' }}>Email liên hệ:</span>
              <strong style={{ color: '#0F1E36' }}>{customerEmail}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.76rem' }}>Loại phòng & Số lượng:</span>
              <strong style={{ color: '#0F1E36' }}>{roomTypeName} ({quantity} phòng · {guests} khách)</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.76rem' }}>Phòng vật lý đã gán:</span>
              <strong style={{ color: '#0F1E36' }}>
                {booking.assignedRooms && booking.assignedRooms.length > 0
                  ? booking.assignedRooms.map((r) => `Phòng ${r.roomNumber || r.id}`).join(', ')
                  : 'Sẽ gán chìa khóa khi Check-in'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.76rem' }}>Thời gian nhận / trả:</span>
              <strong style={{ color: '#0F1E36' }}>Nhận 14:00 · Trả 12:00</strong>
            </div>
          </div>
        </div>

        {/* PHẦN 4.2: CHI TIẾT CHI PHÍ PHÒNG */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.1rem',
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#0F1E36',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              marginBottom: '0.85rem',
              borderBottom: '1px solid #F1F5F9',
              paddingBottom: '0.5rem',
            }}
          >
            <Home size={16} color="#B45309" /> 2. Chi Tiết Chi Phí Tiền Phòng
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.55rem 0.75rem' }}>Khoản mục</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>Số phòng</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>Số đêm</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>Đơn giá / đêm</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <strong>{roomTypeName}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {formatDateDisplay(checkIn)} → {formatDateDisplay(checkOut)}
                    </div>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{quantity}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{numberOfNights}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{formatCurrency(pricePerNight)}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0F1E36' }}>
                    {formatCurrency(totalRoomAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem', paddingRight: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem' }}>
              <span style={{ color: '#64748B' }}>Tổng tiền phòng: </span>
              <strong style={{ fontSize: '1rem', color: '#0F1E36' }}>{formatCurrency(totalRoomAmount)}</strong>
            </div>
          </div>
        </div>

        {/* PHẦN 4.3: CHI TIẾT CÁC MÓN ĐÃ GỌI (ROOM SERVICE 24/7) */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1.1rem',
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#0F1E36',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
              borderBottom: '1px solid #F1F5F9',
              paddingBottom: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Utensils size={16} color="#B45309" /> 3. Chi Tiết Dịch Vụ Ẩm Thực Tận Phòng (Room Service)
            </div>
            {loadingServices && (
              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Loader2 size={12} className="spin" /> Đang cập nhật...
              </span>
            )}
          </div>

          {/* Danh sách tất cả các món ăn đã gọi */}
          {allOrderedItems.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.84rem', background: '#F8FAFC', borderRadius: '8px' }}>
              Quý khách chưa sử dụng dịch vụ gọi món ăn uống trong lượt lưu trú này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#FEF3C7', color: '#92400E', textAlign: 'left', borderBottom: '2px solid #FCD34D' }}>
                      <th style={{ padding: '0.55rem 0.65rem', width: '35px' }}>STT</th>
                      <th style={{ padding: '0.55rem 0.75rem' }}>Tên món ăn / Đồ uống</th>
                      <th style={{ padding: '0.55rem 0.6rem', textAlign: 'center' }}>Số lượng</th>
                      <th style={{ padding: '0.55rem 0.6rem', textAlign: 'center' }}>Đơn vị</th>
                      <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>Thành tiền</th>
                      <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrderedItems.map((it, idx) => {
                      const isDelivered = it.status === 'DELIVERED';
                      const isCancelled = it.status === 'CANCELLED';
                      const isPreparing = it.status === 'PREPARING';

                      return (
                        <tr
                          key={`${it.orderId}-${idx}`}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: isCancelled ? '#FEF2F2' : isDelivered ? '#F0FDF4' : '#FFFFFF',
                          }}
                        >
                          <td style={{ padding: '0.55rem 0.65rem', color: '#64748B', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '0.55rem 0.75rem' }}>
                            <div style={{ fontWeight: 600, color: isCancelled ? '#991B1B' : '#0F1E36', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                              {it.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              Mã đơn: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{it.orderCode}</span> · {it.orderDate}
                              {it.note ? ` · Ghi chú: "${it.note}"` : ''}
                              {isCancelled && it.cancelReason ? ` · Lý do hủy: ${it.cancelReason}` : ''}
                            </div>
                          </td>
                          <td style={{ padding: '0.55rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>{it.quantity}</td>
                          <td style={{ padding: '0.55rem 0.6rem', textAlign: 'center', color: '#64748B' }}>{it.unit || 'Phần'}</td>
                          <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', color: '#475569' }}>
                            {formatCurrency(it.price)}
                          </td>
                          <td
                            style={{
                              padding: '0.55rem 0.75rem',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isCancelled ? '#9CA3AF' : isDelivered ? '#166534' : '#B45309',
                              textDecoration: isCancelled ? 'line-through' : 'none',
                            }}
                          >
                            {formatCurrency(it.lineTotal)}
                          </td>
                          <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                            {isDelivered && (
                              <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#DCFCE7', color: '#166534', fontSize: '0.74rem', fontWeight: 700 }}>
                                ✓ Đã giao (Tính phí)
                              </span>
                            )}
                            {isPreparing && (
                              <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#E0F2FE', color: '#0369A1', fontSize: '0.74rem', fontWeight: 700 }}>
                                🍳 Đang chuẩn bị
                              </span>
                            )}
                            {!isDelivered && !isPreparing && !isCancelled && (
                              <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#FEF3C7', color: '#92400E', fontSize: '0.74rem', fontWeight: 700 }}>
                                {it.customerConfirmed ? '✓ Khách đã duyệt' : '⏳ Chờ duyệt'}
                              </span>
                            )}
                            {isCancelled && (
                              <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#FEE2E2', color: '#991B1B', fontSize: '0.74rem', fontWeight: 700 }}>
                                ✕ Đã hủy
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bảng tổng kết tiền các món ăn */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
                  <span>✓ Tiền món ăn đã giao tới phòng (Đã tính vào hóa đơn):</span>
                  <strong style={{ fontSize: '0.92rem' }}>{formatCurrency(totalDeliveredAmount)}</strong>
                </div>
                {totalPendingAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#92400E' }}>
                    <span>⏳ Món đang chuẩn bị / Chờ phục vụ (Tạm tính):</span>
                    <strong style={{ fontSize: '0.92rem' }}>+{formatCurrency(totalPendingAmount)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '0.35rem', color: '#0F1E36', fontWeight: 700 }}>
                  <span>TỔNG CỘNG TIỀN TẤT CẢ MÓN ĐÃ GỌI:</span>
                  <strong style={{ fontSize: '1rem', color: '#B45309' }}>{formatCurrency(totalAllOrdersAmount)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PHẦN 4.4: TỔNG KẾT THANH TOÁN (FINANCIAL RECONCILIATION) */}
        <div
          style={{
            background: '#F8FAFC',
            border: '2px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#0F1E36',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              marginBottom: '1rem',
              borderBottom: '1px solid #CBD5E1',
              paddingBottom: '0.6rem',
            }}
          >
            <CreditCard size={18} color="#B45309" /> 4. Tổng Kết Chi Phí & Thanh Toán Tất Toán
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>1. Tổng tiền phòng ({numberOfNights} đêm × {quantity} phòng):</span>
              <strong style={{ color: '#0F1E36' }}>{formatCurrency(totalRoomAmount)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#475569' }}>
                2. Tổng tiền dịch vụ ăn uống (Room Service):
                {totalActiveOrdersAmount > 0 && (
                  <span style={{ fontSize: '0.78rem', color: '#B45309', marginLeft: '0.45rem', fontWeight: 600 }}>
                    ({servicesData.allOrders?.filter(o => o.status !== 'CANCELLED').length} đơn đã gọi)
                  </span>
                )}
              </span>
              <strong style={{ color: '#B45309', fontWeight: 700 }}>+{formatCurrency(totalServicesAmount)}</strong>
            </div>

            {surcharge > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>3. Phụ thu hợp lệ khác:</span>
                <strong style={{ color: '#0F1E36' }}>+{formatCurrency(surcharge)}</strong>
              </div>
            )}

            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>4. Ưu đãi / Giảm giá:</span>
                <strong style={{ color: '#166534' }}>-{formatCurrency(discount)}</strong>
              </div>
            )}

            <div style={{ height: '1px', background: '#CBD5E1', margin: '0.35rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.96rem' }}>
              <span style={{ fontWeight: 700, color: '#0F1E36' }}>TỔNG CHI PHÍ LƯU TRÚ:</span>
              <strong style={{ fontWeight: 800, color: '#0F1E36' }}>{formatCurrency(totalCost)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
              <span>Đã thanh toán (Cọc / Trực tuyến / Quầy):</span>
              <strong style={{ fontWeight: 700 }}>-{formatCurrency(actualPaid)}</strong>
            </div>

            <div style={{ height: '2px', background: '#0F172A', margin: '0.5rem 0 0.25rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.35rem' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: remainingToPay > 0 ? '#991B1B' : '#166534' }}>
                  {remainingToPay > 0 ? 'SỐ TIỀN CÒN PHẢI THANH TOÁN:' : 'TRẠNG THÁI THANH TOÁN:'}
                </div>
                {remainingToPay > 0 && (
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                    * Quý khách vui lòng thanh toán số tiền còn lại khi làm thủ tục Check-out tại quầy lễ tân.
                  </div>
                )}
              </div>

              <div>
                {remainingToPay > 0 ? (
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#B91C1C', fontFamily: 'monospace' }}>
                    {formatCurrency(remainingToPay)}
                  </span>
                ) : (
                  <span
                    style={{
                      background: '#DCFCE7',
                      color: '#166534',
                      padding: '0.4rem 0.95rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      border: '1px solid #BBF7D0',
                    }}
                  >
                    <CheckCircle2 size={16} /> ĐÃ THANH TOÁN ĐỦ (0 ₫)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                border: '1px solid #D4AF37',
                background: '#FEF9C3',
                color: '#92400E',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              <Printer size={15} />
              <span>🖨️ In Hóa đơn A4 (Đầy đủ món)</span>
            </button>

            <button
              type="button"
              disabled={downloadingPdf}
              onClick={handleDownloadInvoice}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F1E36',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: downloadingPdf ? 'not-allowed' : 'pointer',
              }}
            >
              {downloadingPdf ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              <span>Tải PDF Server</span>
            </button>

            <button
              type="button"
              disabled={resendingEmail}
              onClick={handleSendEmail}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F1E36',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: resendingEmail ? 'not-allowed' : 'pointer',
              }}
            >
              {resendingEmail ? <Loader2 size={14} className="spin" /> : <Mail size={14} />}
              <span>Gửi email</span>
            </button>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '0.55rem 1.25rem' }}
          >
            Đóng
          </button>
        </div>

      </div>

      {showPrintModal && (
        <InvoicePrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          booking={booking}
          initialServicesData={servicesData}
        />
      )}
    </Modal>
  );
}

export default BookingDetailModal;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Printer,
  Download,
  X,
  Loader2,
  Building2,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Calendar,
  Utensils,
  Receipt,
  AlertCircle,
  FileText,
} from 'lucide-react';
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

function formatDateTimeDisplay(isoStr) {
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

export function InvoicePrintModal({ isOpen, onClose, booking, initialServicesData }) {
  const { showToast } = useToast();
  const [servicesData, setServicesData] = useState(
    initialServicesData || {
      allOrders: [],
      deliveredOrders: [],
      totalDeliveredAmount: 0,
    }
  );
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Load latest room service orders for this booking
  const loadServices = useCallback(async () => {
    if (!booking) return;
    const bCode = booking.bookingCode || booking.code;
    const bId = booking.id || booking.bookingId;
    if (!bCode && !bId) return;

    setLoading(true);
    try {
      const data = await roomServiceOrderService.getCustomerBookingServices(
        bCode,
        bId,
        booking.roomNumber || (booking.assignedRooms && booking.assignedRooms[0]?.roomNumber)
      );
      setServicesData(data);
    } catch (err) {
      console.warn('Lỗi tải dữ liệu dịch vụ phòng cho hóa đơn:', err);
    } finally {
      setLoading(false);
    }
  }, [booking]);

  useEffect(() => {
    if (isOpen && booking) {
      if (initialServicesData && initialServicesData.deliveredOrders) {
        setServicesData(initialServicesData);
      } else {
        loadServices();
      }
    }
  }, [isOpen, booking, initialServicesData, loadServices]);

  // Aggregate items from all room service orders (delivered and active)
  const allOrderedItems = useMemo(() => {
    const items = [];
    const sourceOrders =
      servicesData.allOrders && servicesData.allOrders.length > 0
        ? servicesData.allOrders
        : servicesData.deliveredOrders || [];

    sourceOrders.forEach((order) => {
      const orderDate = formatDateTimeDisplay(order.deliveredAt || order.createdAt);
      const isDelivered = order.status === 'DELIVERED';
      const isCancelled = order.status === 'CANCELLED';
      const isPreparing = order.status === 'PREPARING';

      let statusLabel = 'Đã giao (Tính phí)';
      let statusColor = '#166534';
      let statusBg = '#DCFCE7';

      if (isCancelled) {
        statusLabel = 'Đã hủy';
        statusColor = '#991B1B';
        statusBg = '#FEE2E2';
      } else if (isPreparing) {
        statusLabel = 'Đang chuẩn bị';
        statusColor = '#0369A1';
        statusBg = '#E0F2FE';
      } else if (order.status === 'PENDING') {
        statusLabel = order.customerConfirmed ? 'Khách đã duyệt' : 'Chờ khách duyệt';
        statusColor = '#92400E';
        statusBg = '#FEF3C7';
      }

      (order.items || []).forEach((item, idx) => {
        const itemName = item.itemName || item.name || `Món ăn #${idx + 1}`;
        const quantity = item.quantity || 1;
        const price = item.price || item.unitPrice || 0;
        const subtotal = item.subtotal || item.lineTotal || item.totalPrice || price * quantity;
        items.push({
          orderId: order.id,
          orderCode: order.orderCode || `#${order.id}`,
          itemName,
          quantity,
          unit: item.unit || 'Phần',
          price,
          subtotal,
          deliveredAt: orderDate,
          status: order.status,
          isDelivered,
          isCancelled,
          statusLabel,
          statusColor,
          statusBg,
        });
      });
    });
    return items;
  }, [servicesData]);

  if (!isOpen || !booking) return null;

  // Calculation parameters matching screen rules
  const nights = Math.max(1, booking.totalNights || booking.nights || 1);
  const totalRoomAmount = Number(booking.totalAmount || booking.totalPrice || 0);
  const pricePerNight = nights > 0 ? Math.round(totalRoomAmount / nights) : totalRoomAmount;

  const deliveredFoodAmount = Number(servicesData.totalDeliveredAmount || 0);
  const totalActiveOrdersAmount = (servicesData.allOrders || [])
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Phí thức ăn đã gọi được tính trọn vẹn vào hóa đơn
  const totalFoodServiceAmount = Number(
    servicesData.totalServicesAmount ||
    (totalActiveOrdersAmount > 0 ? totalActiveOrdersAmount : deliveredFoodAmount)
  );
  const otherServiceAmount = Number(booking.otherServiceAmount || 0);
  const surcharge = Number(booking.surcharge || 0);
  const discount = Number(booking.discountAmount || booking.discount || 0);

  // Total Stay Cost = Room + Food + Other + Surcharge - Discount
  const totalStayCost = totalRoomAmount + totalFoodServiceAmount + otherServiceAmount + surcharge - discount;
  const depositPaid = Number(booking.depositAmount || booking.amountPaid || 0);
  const extraPaid = Number(booking.extraPaid || 0);
  const totalPaid = depositPaid + extraPaid;
  const remainingBalance = Math.max(0, totalStayCost - totalPaid);

  const roomTypeName =
    booking.roomTypeName ||
    booking.roomType?.name ||
    (booking.assignedRooms && booking.assignedRooms[0]?.roomTypeName) ||
    'Phòng Tiêu Chuẩn';

  const roomNumbers =
    booking.assignedRooms && booking.assignedRooms.length > 0
      ? booking.assignedRooms.map((r) => r.roomNumber || r.name).join(', ')
      : booking.roomNumber || 'Chưa gán';

  const invoiceNumber = `INV-${booking.bookingCode || booking.code || booking.id}`;
  const invoiceDate = formatDateTimeDisplay(new Date().toISOString());

  // Handle browser standard print (which also allows "Save to PDF")
  const handlePrint = () => {
    window.print();
  };

  // Handle server-generated PDF download
  const handleDownloadServerPdf = async () => {
    try {
      setDownloadingPdf(true);
      await bookingService.downloadInvoicePdf(booking.bookingCode || booking.id);
      showToast('Đã tải hóa đơn PDF từ máy chủ!', 'success');
    } catch (err) {
      showToast(err.message || 'Không thể tải hóa đơn PDF từ máy chủ', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="invoice-modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      overflowY: 'auto',
    }}>
      {/* Container hóa đơn in ấn */}
      <div
        className="invoice-modal-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Thanh công cụ Modal (Sẽ bị ẩn khi in ra giấy/PDF) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.5rem',
            backgroundColor: '#0F1E36',
            color: '#FFFFFF',
            borderBottom: '1px solid #1E293B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Receipt size={20} style={{ color: '#D4AF37' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em' }}>
              XEM & IN HÓA ĐƠN CHI TIẾT (CHUẨN A4)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#D4AF37',
                color: '#0F1E36',
                border: 'none',
                borderRadius: '6px',
                padding: '0.45rem 0.9rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Printer size={15} />
              <span>In hóa đơn / Lưu PDF</span>
            </button>

            <button
              type="button"
              disabled={downloadingPdf}
              onClick={handleDownloadServerPdf}
              title="Tải bản PDF nguyên bản từ máy chủ Backend"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                padding: '0.45rem 0.85rem',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: downloadingPdf ? 'not-allowed' : 'pointer',
              }}
            >
              {downloadingPdf ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              <span>PDF Máy chủ</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '0.3rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Nội dung hóa đơn in A4 (Cuộn được khi xem trên màn hình) */}
        <div
          id="printable-invoice-content"
          style={{
            padding: '2.5rem',
            overflowY: 'auto',
            color: '#1E293B',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Header thương hiệu Grand Aurora */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F1E36', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Building2 size={28} style={{ color: '#0F1E36' }} />
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F1E36', letterSpacing: '0.04em' }}>
                  GRAND AURORA LUXURY HOTEL
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0 0', color: '#64748B', fontSize: '0.82rem' }}>
                Địa chỉ: 123 Đại lộ Hoàng Gia, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh
              </p>
              <p style={{ margin: '0.15rem 0 0 0', color: '#64748B', fontSize: '0.82rem' }}>
                Hotline: 1900 8888 | Email: contact@grandaurora.com | Website: grandaurora.com
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase' }}>
                HÓA ĐƠN THANH TOÁN
              </h2>
              <p style={{ margin: '0.3rem 0 0 0', fontWeight: 700, fontSize: '0.95rem', color: '#0F1E36' }}>
                Số: {invoiceNumber}
              </p>
              <p style={{ margin: '0.15rem 0 0 0', color: '#64748B', fontSize: '0.8rem' }}>
                Ngày in: {invoiceDate}
              </p>
            </div>
          </div>

          {/* KHỐI A: THÔNG TIN KHÁCH HÀNG VÀ ĐẶT PHÒNG */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0F1E36', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              A. THÔNG TIN KHÁCH HÀNG & LƯU TRÚ
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem 1.5rem', fontSize: '0.86rem' }}>
              <div>
                <span style={{ color: '#64748B' }}>Tên khách hàng: </span>
                <strong style={{ color: '#0F1E36' }}>{booking.customerName || 'Khách vãng lai'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Mã đặt phòng: </span>
                <strong style={{ color: '#0F1E36' }}>{booking.bookingCode || booking.code || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Số điện thoại: </span>
                <strong style={{ color: '#0F1E36' }}>{booking.customerPhone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Phòng lưu trú: </span>
                <strong style={{ color: '#0F1E36', color: '#0369A1' }}>Phòng {roomNumbers}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Hạng phòng: </span>
                <strong style={{ color: '#0F1E36' }}>{roomTypeName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Thời gian lưu trú: </span>
                <strong style={{ color: '#0F1E36' }}>
                  {formatDateDisplay(booking.checkInDate)} → {formatDateDisplay(booking.checkOutDate)} ({nights} đêm)
                </strong>
              </div>
            </div>
          </div>

          {/* KHỐI B: BẢNG CHI TIẾT TIỀN PHÒNG */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0F1E36', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              B. CHI TIẾT TIỀN PHÒNG
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#334155' }}>Nội dung</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#334155', textAlign: 'center' }}>Số lượng</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#334155', textAlign: 'right' }}>Đơn giá / Đêm</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#334155', textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <strong>{roomTypeName}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Phòng: {roomNumbers} | {formatDateDisplay(booking.checkInDate)} - {formatDateDisplay(booking.checkOutDate)}
                    </div>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{nights} đêm</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>{formatCurrency(pricePerNight)}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0F1E36' }}>
                    {formatCurrency(totalRoomAmount)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#F8FAFC' }}>
                  <td colSpan={3} style={{ padding: '0.6rem 0.75rem', fontWeight: 700, textAlign: 'right', color: '#475569' }}>
                    Cộng tiền phòng:
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, textAlign: 'right', color: '#0F1E36' }}>
                    {formatCurrency(totalRoomAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* KHỐI C: BẢNG CHI TIẾT DỊCH VỤ ĂN UỐNG (ROOM SERVICE 24/7) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0F1E36', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                C. CHI TIẾT DỊCH VỤ ĂN UỐNG (ROOM SERVICE 24/7)
              </h4>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>
                {allOrderedItems.length > 0 ? `${allOrderedItems.length} món ăn/đồ uống đã gọi` : 'Không có dịch vụ ăn uống'}
              </span>
            </div>

            {allOrderedItems.length === 0 ? (
              <div style={{ padding: '0.85rem', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '6px', textAlign: 'center', color: '#64748B', fontSize: '0.84rem' }}>
                Quý khách không sử dụng dịch vụ ăn uống hoặc chưa có đơn nào được gọi trong lượt lưu trú này.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FEF3C7', borderBottom: '2px solid #FCD34D' }}>
                    <th style={{ padding: '0.6rem 0.65rem', fontWeight: 700, color: '#92400E', width: '35px' }}>STT</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#92400E' }}>Tên món ăn / Đồ uống</th>
                    <th style={{ padding: '0.6rem 0.6rem', fontWeight: 700, color: '#92400E', textAlign: 'center' }}>Số lượng</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#92400E', textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#92400E', textAlign: 'right' }}>Thành tiền</th>
                    <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#92400E', textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrderedItems.map((item, idx) => (
                    <tr
                      key={`${item.orderId}-${idx}`}
                      style={{
                        borderBottom: '1px solid #E2E8F0',
                        background: item.isCancelled ? '#FEF2F2' : item.isDelivered ? '#F0FDF4' : '#FFFFFF',
                      }}
                    >
                      <td style={{ padding: '0.55rem 0.65rem', color: '#64748B', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, color: item.isCancelled ? '#991B1B' : '#0F1E36', textDecoration: item.isCancelled ? 'line-through' : 'none' }}>
                          {item.itemName}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#64748B' }}>
                          Mã đơn: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.orderCode}</span> • Thời gian: {item.deliveredAt}
                        </div>
                      </td>
                      <td style={{ padding: '0.55rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>
                        {item.quantity} {item.unit}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', color: '#475569' }}>
                        {formatCurrency(item.price)}
                      </td>
                      <td
                        style={{
                          padding: '0.55rem 0.75rem',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: item.isCancelled ? '#9CA3AF' : item.isDelivered ? '#166534' : '#B45309',
                          textDecoration: item.isCancelled ? 'line-through' : 'none',
                        }}
                      >
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: item.statusBg,
                            color: item.statusColor,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          {item.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {deliveredFoodAmount > 0 && pendingFoodAmount > 0 && (
                    <>
                      <tr style={{ backgroundColor: '#F0FDF4', color: '#166534', fontSize: '0.82rem' }}>
                        <td colSpan={4} style={{ padding: '0.45rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>
                          Tiền món đã giao (tính vào thanh toán):
                        </td>
                        <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>
                          {formatCurrency(deliveredFoodAmount)}
                        </td>
                        <td></td>
                      </tr>
                      <tr style={{ backgroundColor: '#FFFBEB', color: '#92400E', fontSize: '0.82rem' }}>
                        <td colSpan={4} style={{ padding: '0.45rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>
                          Món đang chuẩn bị / chờ phục vụ (tạm tính):
                        </td>
                        <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>
                          +{formatCurrency(pendingFoodAmount)}
                        </td>
                        <td></td>
                      </tr>
                    </>
                  )}
                  <tr style={{ backgroundColor: '#FFFBEB' }}>
                    <td colSpan={4} style={{ padding: '0.6rem 0.75rem', fontWeight: 700, textAlign: 'right', color: '#92400E' }}>
                      Tổng tiền dịch vụ ăn uống:
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, textAlign: 'right', color: '#B45309' }}>
                      {formatCurrency(totalFoodServiceAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* KHỐI D: BẢNG TỔNG KẾT THANH TOÁN (FINANCIAL SUMMARY) */}
          <div style={{ border: '2px solid #0F1E36', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#F8FAFC', marginBottom: '1.75rem' }}>
            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#0F1E36', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #CBD5E1', paddingBottom: '0.45rem' }}>
              D. BẢNG TỔNG KẾT THANH TOÁN
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem 2rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '0.35rem' }}>
                <span style={{ color: '#475569' }}>1. Tổng tiền phòng ({nights} đêm):</span>
                <span style={{ fontWeight: 600, color: '#0F1E36' }}>{formatCurrency(totalRoomAmount)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '0.35rem' }}>
                <span style={{ color: '#475569' }}>2. Tiền dịch vụ ăn uống:</span>
                <span style={{ fontWeight: 700, color: '#B45309' }}>+{formatCurrency(totalFoodServiceAmount)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '0.35rem' }}>
                <span style={{ color: '#475569' }}>3. Tiền dịch vụ khác:</span>
                <span style={{ fontWeight: 600, color: '#0F1E36' }}>+{formatCurrency(otherServiceAmount)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '0.35rem' }}>
                <span style={{ color: '#475569' }}>4. Phụ thu hợp lệ:</span>
                <span style={{ fontWeight: 600, color: '#0F1E36' }}>+{formatCurrency(surcharge)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '0.35rem' }}>
                <span style={{ color: '#475569' }}>5. Giảm giá / Khuyến mãi:</span>
                <span style={{ fontWeight: 600, color: '#16A34A' }}>-{formatCurrency(discount)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '0.35rem' }}>
                <span style={{ color: '#475569' }}>6. Tiền cọc đã thanh toán:</span>
                <span style={{ fontWeight: 700, color: '#16A34A' }}>-{formatCurrency(depositPaid)}</span>
              </div>
            </div>

            {/* Dòng tổng kết lớn */}
            <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '2px solid #CBD5E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                  TỔNG CHI PHÍ LƯU TRÚ (PHÒNG + DỊCH VỤ)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F1E36' }}>
                  {formatCurrency(totalStayCost)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: remainingBalance > 0 ? '#DC2626' : '#16A34A', textTransform: 'uppercase', fontWeight: 700 }}>
                  {remainingBalance > 0 ? 'SỐ TIỀN CÒN PHẢI THANH TOÁN' : 'TRẠNG THÁI THANH TOÁN'}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: remainingBalance > 0 ? '#DC2626' : '#16A34A' }}>
                  {remainingBalance > 0 ? formatCurrency(remainingBalance) : 'ĐÃ TẤT TOÁN 100%'}
                </div>
              </div>
            </div>
          </div>

          {/* KHỐI E: CHỮ KÝ XÁC NHẬN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', textAlign: 'center', marginTop: '2rem', paddingTop: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#0F1E36', textTransform: 'uppercase', fontSize: '0.86rem' }}>
                KHÁCH HÀNG
              </p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
                (Ký và ghi rõ họ tên)
              </p>
              <div style={{ height: '70px' }}></div>
              <p style={{ margin: 0, fontWeight: 600, color: '#334155', fontSize: '0.88rem' }}>
                {booking.customerName || '...........................................'}
              </p>
            </div>

            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#0F1E36', textTransform: 'uppercase', fontSize: '0.86rem' }}>
                ĐẠI DIỆN KHÁCH SẠN / LỄ TÂN
              </p>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
                (Ký, đóng dấu và ghi rõ họ tên)
              </p>
              <div style={{ height: '70px' }}></div>
              <p style={{ margin: 0, fontWeight: 600, color: '#334155', fontSize: '0.88rem' }}>
                Bộ phận Lễ tân & Thu ngân
              </p>
            </div>
          </div>

          {/* Ghi chú footer */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: '#94A3B8' }}>
            Cảm ơn Quý khách đã lựa chọn Grand Aurora Luxury Hotel. Chúc Quý khách một chuyến đi vui vẻ & bình an!
          </div>
        </div>
      </div>

      {/* Global Style Print CSS chuyên dụng cho trang in và lưu PDF A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          .invoice-modal-overlay {
            position: absolute !important;
            inset: 0 !important;
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .invoice-modal-card {
            box-shadow: none !important;
            max-width: 100% !important;
            max-height: none !important;
            width: 100% !important;
            border-radius: 0 !important;
          }
          #printable-invoice-content, #printable-invoice-content * {
            visibility: visible !important;
          }
          #printable-invoice-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20mm 15mm !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default InvoicePrintModal;

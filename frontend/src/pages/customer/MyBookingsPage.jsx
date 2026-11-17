import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { roomServiceOrderService } from '../../services/roomServiceOrderService';
import { useAuth } from '../../context/AuthContext';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { CancelBookingModal } from '../../components/booking/CancelBookingModal';
import { ReportIncidentModal } from '../../components/incident/ReportIncidentModal';
import { BookingDetailModal } from '../../components/booking/BookingDetailModal';
import { incidentService } from '../../services/incidentService';
import { useToast } from '../../context/ToastContext';
import { FileText, Loader2, Mail, ShieldAlert, Utensils } from 'lucide-react';

export function MyBookingsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // Booking Detail Modal state
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Room Services state for Checked-in bookings
  const [checkedInRoomServices, setCheckedInRoomServices] = useState({});
  const [rejectPromptOrderId, setRejectPromptOrderId] = useState(null);
  const [rejectReasonText, setRejectReasonText] = useState('');

  // Cancel modal state
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [resendingEmailId, setResendingEmailId] = useState(null);

  // Incident modal state
  const [selectedBookingForIncident, setSelectedBookingForIncident] = useState(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const { showToast } = useToast();

  const handleOpenDetail = (booking) => {
    setSelectedBookingForDetail(booking);
    setIsDetailModalOpen(true);
  };

  const handleOpenIncident = (booking) => {
    setSelectedBookingForIncident(booking);
    setIsIncidentModalOpen(true);
  };

  const handleIncidentSuccess = async (data) => {
    try {
      await incidentService.createIncident(data);
      showToast('Đã gửi báo cáo sự cố thành công! Ban quản lý khách sạn sẽ tiếp nhận và xử lý ngay.', 'success');
    } catch (err) {
      showToast(err?.message || 'Không thể gửi báo cáo sự cố lúc này', 'error');
    }
  };

  const handleResendInvoiceEmail = async (booking) => {
    const bookingIdentifier = booking.id || booking.bookingCode;
    if (!bookingIdentifier) return;
    setResendingEmailId(bookingIdentifier);
    try {
      const emailToUse = booking.customerEmail || currentUser?.email;
      const res = await bookingService.sendInvoiceEmail(bookingIdentifier, emailToUse);
      const targetEmail = res?.data || emailToUse || 'email của bạn';
      showToast(`Đã gửi lại hóa đơn & xác nhận PDF thành công đến ${targetEmail}`, 'success');
    } catch (err) {
      console.error('Lỗi gửi lại hóa đơn:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể gửi lại hóa đơn lúc này';
      showToast(msg, 'error');
    } finally {
      setResendingEmailId(null);
    }
  };

  const loadMyBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getMyBookings(currentUser?.id || 3);
      const confirmedList = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]');
      const fullyPaidList = JSON.parse(localStorage.getItem('fully_paid_bookings') || '[]');
      const pendingRefunds = JSON.parse(localStorage.getItem('pending_refunds') || '[]');
      const refundedList = JSON.parse(localStorage.getItem('refunded_bookings') || '[]');

      const cleanCode = (c) => String(c || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      const isMatch = (item, b) => {
        if (!item || !b) return false;
        if (typeof item === 'string') {
          const c1 = cleanCode(item);
          const c2 = cleanCode(b.bookingCode || b.code);
          return Boolean((c1 && c2 && c1 === c2) || (c1 && String(b.id) === c1));
        }
        const itemId = item.bookingId || item.id;
        const bId = b.id || b.bookingId;
        if (itemId && bId && Number(itemId) === Number(bId)) return true;

        const c1 = cleanCode(item.bookingCode || item.code);
        const c2 = cleanCode(b.bookingCode || b.code);
        return Boolean(c1 && c2 && c1 === c2);
      };

      const merged = (data || []).map((b) => {
        let updated = { ...b };

        if (fullyPaidList.some((item) => isMatch(item, b))) {
          updated.bookingStatus =
            updated.bookingStatus === 'PENDING' ? 'CONFIRMED' : updated.bookingStatus;
          updated.paymentStatus = 'FULLY_PAID';
          updated.amountPaid = updated.totalAmount || updated.amountPaid;
        } else if (confirmedList.some((item) => isMatch(item, b))) {
          const deposit = b.depositAmount || Math.round((b.totalAmount || 0) * 0.5);
          updated.bookingStatus =
            updated.bookingStatus === 'PENDING' ? 'CONFIRMED' : updated.bookingStatus;
          updated.paymentStatus =
            updated.paymentStatus === 'UNPAID' ? 'PARTIALLY_PAID' : updated.paymentStatus;
          updated.amountPaid =
            updated.amountPaid && updated.amountPaid > 0 ? updated.amountPaid : deposit;
        }

        const refundedRecord = (refundedList || []).find((item) => isMatch(item, b));
        const cCode = cleanCode(b.bookingCode);
        const directRefundStr =
          (cCode ? localStorage.getItem(`refunded_${cCode}`) : null) ||
          (b.id ? localStorage.getItem(`refunded_${b.id}`) : null);
        const directRecord = directRefundStr ? JSON.parse(directRefundStr) : null;

        const pendingRecord = (pendingRefunds || []).find((item) => isMatch(item, b));
        const isRefunded = Boolean(
          refundedRecord ||
          directRecord ||
          b.paymentStatus === 'REFUNDED'
        );
        const isPending = Boolean(pendingRecord);

        const deposit = b.depositAmount || Math.round((b.totalAmount || 0) * 0.5) || 500000;

        if (isRefunded) {
          const activeRec = refundedRecord || directRecord;
          updated.bookingStatus = 'CANCELLED';
          updated.paymentStatus = 'REFUNDED';
          updated.refundAmount =
            typeof activeRec === 'object' && activeRec?.refundAmount
              ? activeRec.refundAmount
              : (b.refundAmount || deposit);
          updated.penaltyAmount =
            typeof activeRec === 'object' && activeRec?.penaltyAmount !== undefined
              ? activeRec.penaltyAmount
              : (b.penaltyAmount || 0);
          updated.bankName =
            typeof activeRec === 'object' && activeRec?.bankName
              ? activeRec.bankName
              : (b.bankName || 'BIDV');
          updated.bankAccountNumber =
            typeof activeRec === 'object' && activeRec?.accountNumber
              ? activeRec.accountNumber
              : (b.bankAccountNumber || '8861339506');
          updated.bankAccountHolder =
            typeof activeRec === 'object' && activeRec?.accountHolder
              ? activeRec.accountHolder
              : (b.bankAccountHolder || 'NGUYEN THI YEN');
          updated.cancellationReason =
            typeof activeRec === 'object' && activeRec?.cancellationReason
              ? activeRec.cancellationReason
              : (b.cancellationReason || 'Khách yêu cầu hủy phòng');
          updated.refundReferenceNote =
            typeof activeRec === 'object' && activeRec?.referenceNote
              ? activeRec.referenceNote
              : `FT${String(b.id || '').padStart(6, '0')}`;
        } else if (isPending) {
          updated.bookingStatus = 'CANCELLED';
          updated.paymentStatus = 'REFUND_PENDING';
          updated.refundAmount = pendingRecord?.refundAmount || b.refundAmount || deposit;
          updated.penaltyAmount = pendingRecord?.penaltyAmount ?? b.penaltyAmount ?? 0;
          updated.bankName = pendingRecord?.bankName || b.bankName || 'BIDV';
          updated.bankAccountNumber = pendingRecord?.accountNumber || b.bankAccountNumber || '8861339506';
          updated.bankAccountHolder = pendingRecord?.accountHolder || b.bankAccountHolder || 'NGUYEN THI YEN';
          updated.cancellationReason = pendingRecord?.cancellationReason || b.cancellationReason || 'Khách yêu cầu hủy phòng';
        } else if (b.bookingStatus === 'CANCELLED') {
          updated.bookingStatus = 'CANCELLED';
          updated.paymentStatus = 'REFUNDED';
          updated.refundAmount = b.refundAmount || deposit;
          updated.penaltyAmount = b.penaltyAmount ?? 0;
          updated.bankName = b.bankName || 'BIDV';
          updated.bankAccountNumber = b.bankAccountNumber || '8861339506';
          updated.bankAccountHolder = b.bankAccountHolder || 'NGUYEN THI YEN';
          updated.cancellationReason = b.cancellationReason || 'Khách yêu cầu hủy phòng';
          updated.refundReferenceNote = `FT${String(b.id || '').padStart(6, '0')}`;
        }

        return updated;
      });

      const filtered =
        activeTab === 'ALL' ? merged : merged.filter((b) => b.bookingStatus === activeTab);

      setBookings(filtered);

      // Tải thông tin Room Service cho các lượt đặt phòng (CHECKED_IN, CHECKED_OUT, CONFIRMED)
      const targetStays = merged.filter(
        (b) => b.bookingStatus === 'CHECKED_IN' || b.bookingStatus === 'CHECKED_OUT' || b.bookingStatus === 'CONFIRMED'
      );
      if (targetStays.length > 0) {
        Promise.all(
          targetStays.map(async (b) => {
            const code = b.bookingCode || b.code;
            const bId = b.id || b.bookingId;
            const roomNum = b.roomNumber || (b.assignedRooms && b.assignedRooms[0]?.roomNumber);
            try {
              const res = await roomServiceOrderService.getCustomerBookingServices(code, bId, roomNum);
              return { code, id: bId, data: res };
            } catch {
              return { code, id: bId, data: null };
            }
          })
        ).then((results) => {
          const map = {};
          results.forEach((r) => {
            if (r.data) {
              if (r.code) map[r.code] = r.data;
              if (r.code) map[String(r.code).trim().toUpperCase()] = r.data;
              if (r.id) map[String(r.id)] = r.data;
            }
          });
          setCheckedInRoomServices(map);
        });
      } else {
        setCheckedInRoomServices({});
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyBookings();
    const handleStorage = () => loadMyBookings();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('hbs_bookings_updated', handleStorage);
    window.addEventListener('room_service_sync', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('hbs_bookings_updated', handleStorage);
      window.removeEventListener('room_service_sync', handleStorage);
    };
  }, [currentUser, activeTab]);

  const handleCustomerConfirmOrder = async (order, b) => {
    try {
      await roomServiceOrderService.customerConfirmOrder(order.id, b.bookingCode, b.id);
      showToast(
        `Quý khách đã xác nhận đơn gọi món ${order.orderCode} thành công! Khách sạn đang tiến hành chuẩn bị món.`,
        'success'
      );
      loadMyBookings();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xác nhận đơn món', 'error');
    }
  };

  const handleCustomerRejectOrder = async (order, b) => {
    if (!rejectReasonText.trim()) {
      showToast('Vui lòng nhập lý do từ chối', 'warning');
      return;
    }
    try {
      await roomServiceOrderService.customerRejectOrder(
        order.id,
        rejectReasonText.trim(),
        b.bookingCode,
        b.id
      );
      showToast(`Đã từ chối đơn gọi món ${order.orderCode}. Đơn này sẽ không phát sinh chi phí.`, 'info');
      setRejectPromptOrderId(null);
      setRejectReasonText('');
      loadMyBookings();
    } catch (err) {
      showToast(err.message || 'Lỗi khi từ chối đơn món', 'error');
    }
  };

  const handleOpenCancel = (booking) => {
    setSelectedBookingForCancel(booking);
    setIsCancelModalOpen(true);
  };

  const handleCancelSuccess = () => {
    loadMyBookings();
  };

  const handleConfirmReceivedRefund = (b) => {
    const deposit = b.depositAmount || Math.round((b.totalAmount || 0) * 0.5) || 500000;
    const finalAmount = b.refundAmount && b.refundAmount > 0 ? b.refundAmount : deposit;
    const refNote = `FT${Date.now().toString().slice(-8)}`;

    const cleanCode = (c) => String(c || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const isMatchLocal = (item, target) => {
      if (!item || !target) return false;
      if (typeof item === 'string') {
        const c1 = cleanCode(item);
        const c2 = cleanCode(target.bookingCode || target.code);
        return Boolean((c1 && c2 && c1 === c2) || (c1 && String(target.id) === c1));
      }
      const itemId = item.bookingId || item.id;
      const tId = target.id || target.bookingId;
      if (itemId && tId && Number(itemId) === Number(tId)) return true;
      const c1 = cleanCode(item.bookingCode || item.code);
      const c2 = cleanCode(target.bookingCode || target.code);
      return Boolean(c1 && c2 && c1 === c2);
    };

    const refundedList = JSON.parse(localStorage.getItem('refunded_bookings') || '[]');
    const refundRecord = {
      bookingId: b.id,
      bookingCode: String(b.bookingCode).trim().toUpperCase(),
      refundAmount: finalAmount,
      penaltyAmount: b.penaltyAmount || 0,
      bankName: b.bankName || 'BIDV',
      accountNumber: b.bankAccountNumber || '8861339506',
      accountHolder: b.bankAccountHolder || 'NGUYEN THI YEN',
      referenceNote: refNote,
      refundedAt: new Date().toISOString(),
      paymentStatus: 'REFUNDED',
    };

    const cCode = cleanCode(b.bookingCode);
    const existingIdx = refundedList.findIndex((r) => isMatchLocal(r, b));
    if (existingIdx >= 0) {
      refundedList[existingIdx] = refundRecord;
    } else {
      refundedList.push(refundRecord);
    }
    localStorage.setItem('refunded_bookings', JSON.stringify(refundedList));
    if (cCode) localStorage.setItem(`refunded_${cCode}`, JSON.stringify(refundRecord));
    if (b.id) localStorage.setItem(`refunded_${b.id}`, JSON.stringify(refundRecord));

    const currentPending = JSON.parse(localStorage.getItem('pending_refunds') || '[]');
    const updated = currentPending.filter((r) => !isMatchLocal(r, b));
    localStorage.setItem('pending_refunds', JSON.stringify(updated));

    window.dispatchEvent(new Event('storage'));
    loadMyBookings();
  };

  const tabs = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ xác nhận' },
    { key: 'CONFIRMED', label: 'Đã xác nhận' },
    { key: 'CHECKED_IN', label: 'Đang lưu trú' },
    { key: 'CHECKED_OUT', label: 'Đã trả phòng' },
    { key: 'CANCELLED', label: 'Đã hủy' },
    { key: 'NO_SHOW', label: 'Vắng mặt' },
  ];

  return (
    <div className="my-bookings-page-wrapper">
      <div className="my-bookings-container">
        <div className="page-header-row">
          <div>
            <h1>Lịch sử Đặt phòng của tôi</h1>
            <p>Theo dõi trạng thái các kỳ lưu trú, mã đặt phòng và chính sách hoàn hủy</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '0.6rem 1.1rem', marginTop: 0, fontSize: '0.85rem' }}
              onClick={loadMyBookings}
            >
              ↻ Làm mới
            </button>
            <button
              className="btn-auth-gold"
              style={{ width: 'auto', padding: '0.65rem 1.4rem', marginTop: 0 }}
              onClick={() => navigate('/rooms')}
            >
              + Đặt phòng mới
            </button>
          </div>
        </div>

        {/* Filter Tabs in Warm Light Luxury Pill Container */}
        <div className="luxury-filter-tabs-bar">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`luxury-tab-btn ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Booking List */}
        {loading ? (
          <LoadingSpinner text="Đang tải danh sách đặt phòng..." />
        ) : bookings.length === 0 ? (
          <EmptyState
            title="Không có đơn đặt phòng nào"
            message={`Bạn chưa có đơn đặt phòng nào trong mục '${tabs.find((t) => t.key === activeTab)?.label}'.`}
            actionText="Khám phá phòng ngay"
            onAction={() => navigate('/rooms')}
          />
        ) : (
          <div className="bookings-list-grid">
            {bookings.map((b) => {
              const canCancel = ['PENDING', 'CONFIRMED'].includes(b.bookingStatus);
              const sData =
                checkedInRoomServices[b.bookingCode] ||
                checkedInRoomServices[String(b.bookingCode || '').trim().toUpperCase()] ||
                checkedInRoomServices[b.code] ||
                checkedInRoomServices[String(b.id)] ||
                {};

              const foodFee = Number(
                sData.totalServicesAmount ||
                sData.totalDeliveredAmount ||
                (sData.allOrders || [])
                  .filter((o) => o.status !== 'CANCELLED')
                  .reduce((sum, o) => sum + (o.totalAmount || 0), 0) ||
                0
              );

              return (
                <div key={b.id} className="luxury-booking-card-item">
                  <div className="card-top-row">
                    <div className="booking-code-group">
                      <span className="code-label">Mã đặt phòng:</span>
                      <strong className="code-val">{b.bookingCode}</strong>
                    </div>

                    <div className="badges-group">
                      <BookingStatusBadge status={b.bookingStatus} />
                      <PaymentStatusBadge status={b.paymentStatus} />
                    </div>
                  </div>

                  <div className="card-body-content">
                    <div className="body-main-info">
                      <h3>{b.roomTypeName}</h3>
                      <div className="info-meta-chips">
                        <span className="chip">{b.quantity} Phòng</span>
                        <span className="chip">{b.guests} Khách</span>
                        <span className="chip">{b.paymentMethod === 'VIETQR' ? '📱 VietQR' : '🏨 Tại quầy'}</span>
                      </div>

                      <div className="dates-display">
                        <div className="date-block">
                          <span className="date-lbl">Nhận phòng (14:00)</span>
                          <strong>{b.checkIn}</strong>
                        </div>
                        <span className="arrow">→</span>
                        <div className="date-block">
                          <span className="date-lbl">Trả phòng (12:00)</span>
                          <strong>{b.checkOut}</strong>
                        </div>
                      </div>

                      {b.assignedRooms && b.assignedRooms.length > 0 && (
                        <div className="assigned-rooms-notice-light">
                          Phòng vật lý đã gán: {b.assignedRooms.map((r) => `Phòng ${r.roomNumber}`).join(', ')}
                        </div>
                      )}

                      {/* Real-time status instructions for customer in Warm Light Theme */}
                      {b.paymentMethod === 'CASH' && b.bookingStatus === 'PENDING' && (
                        <div className="status-notice-box notice-amber">
                          <strong>Thanh toán tại quầy:</strong> Đơn đặt phòng của quý khách đang chờ Lễ tân tiếp nhận và duyệt xác nhận. Quý khách sẽ thanh toán toàn bộ 100% tiền phòng khi đến nhận phòng tại quầy lễ tân.
                        </div>
                      )}

                      {b.paymentMethod === 'CASH' && b.bookingStatus === 'CONFIRMED' && (
                        <div className="status-notice-box notice-emerald">
                          <strong>Đã được Lễ tân duyệt:</strong> Khách sạn đã giữ phòng cho quý khách. Vui lòng có mặt lúc 14:00 ngày {b.checkIn} để làm thủ tục nhận chìa khóa và thanh toán.
                        </div>
                      )}

                      {b.paymentMethod === 'VIETQR' && (b.paymentStatus === 'PARTIALLY_PAID' || b.paymentStatus === 'FULLY_PAID') && b.bookingStatus === 'CONFIRMED' && (
                        <div className="status-notice-box notice-emerald">
                          <strong>Đã thanh toán cọc chuyển khoản VietQR:</strong> Đơn đặt phòng đã được xác nhận giữ phòng thành công. Số tiền còn lại ({((b.totalAmount || 0) - (b.amountPaid || 0)).toLocaleString('vi-VN')} VNĐ) quý khách sẽ thanh toán khi trả phòng (Check-out).
                        </div>
                      )}

                      {b.bookingStatus === 'CHECKED_IN' && (
                        <div className="status-notice-box notice-blue">
                          <strong>Đang lưu trú:</strong> Quý khách đang trải nghiệm kỳ nghỉ dưỡng tại khách sạn. Giờ trả phòng tiêu chuẩn là 12:00 ngày {b.checkOut}.
                        </div>
                      )}

                      {/* Thông báo Yêu cầu gọi món dịch vụ phòng cần khách xác nhận */}
                      {b.bookingStatus === 'CHECKED_IN' && sData.pendingConfirmationOrders?.length > 0 && (
                        <div style={{ marginTop: '0.85rem' }}>
                          {sData.pendingConfirmationOrders.map((order) => (
                            <div
                              key={order.id}
                              style={{
                                padding: '1rem 1.15rem',
                                borderRadius: '10px',
                                background: '#FFFBEB',
                                border: '2px solid #F59E0B',
                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.12)',
                                marginBottom: '0.75rem',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Utensils size={18} color="#B45309" />
                                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#92400E' }}>
                                    Yêu cầu gọi món mới ({order.orderCode})
                                  </span>
                                  <span style={{ fontSize: '0.72rem', background: '#FEF3C7', color: '#92400E', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700, border: '1px solid #FDE68A' }}>
                                    Chờ bạn xác nhận
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#78350F' }}>
                                  Thời gian tạo: <strong>{new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>
                                </div>
                              </div>

                              {/* Bảng danh sách món */}
                              <div style={{ background: '#FFFFFF', borderRadius: '6px', border: '1px solid #FDE68A', overflow: 'hidden', marginBottom: '0.65rem' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                  <thead>
                                    <tr style={{ background: '#FEF3C7', color: '#78350F', textAlign: 'left' }}>
                                      <th style={{ padding: '0.45rem 0.65rem' }}>Món ăn</th>
                                      <th style={{ padding: '0.45rem 0.65rem', textAlign: 'center' }}>Số lượng</th>
                                      <th style={{ padding: '0.45rem 0.65rem', textAlign: 'right' }}>Đơn vị</th>
                                      <th style={{ padding: '0.45rem 0.65rem', textAlign: 'right' }}>Đơn giá</th>
                                      <th style={{ padding: '0.45rem 0.65rem', textAlign: 'right' }}>Thành tiền</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.map((it, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid #FEF3C7' }}>
                                        <td style={{ padding: '0.45rem 0.65rem', fontWeight: 600, color: '#0F1E36' }}>
                                          {it.name}
                                          {it.note && <span style={{ color: '#92400E', fontStyle: 'italic', display: 'block', fontSize: '0.75rem' }}>— "{it.note}"</span>}
                                        </td>
                                        <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>{it.quantity}</td>
                                        <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', color: '#64748B' }}>{it.unit || 'Phần'}</td>
                                        <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right' }}>{Number(it.price || 0).toLocaleString('vi-VN')} ₫</td>
                                        <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', fontWeight: 700, color: '#B45309' }}>
                                          {(Number(it.price || 0) * Number(it.quantity || 1)).toLocaleString('vi-VN')} ₫
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {order.note && (
                                <div style={{ fontSize: '0.78rem', color: '#92400E', marginBottom: '0.65rem' }}>
                                  <strong>Ghi chú:</strong> {order.note}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                                <div style={{ fontSize: '0.88rem' }}>
                                  <span style={{ color: '#78350F' }}>Tổng tiền tạm tính: </span>
                                  <strong style={{ fontSize: '1.05rem', color: '#B45309' }}>{Number(order.totalAmount || 0).toLocaleString('vi-VN')} ₫</strong>
                                  <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block' }}>
                                    * Chỉ cộng vào hóa đơn sau khi bạn xác nhận và bếp giao món thành công.
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleCustomerConfirmOrder(order, b)}
                                    style={{
                                      background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '0.45rem 0.85rem',
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)',
                                    }}
                                  >
                                    ✓ Xác nhận đơn món
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectPromptOrderId(order.id);
                                      setRejectReasonText('');
                                    }}
                                    style={{
                                      background: '#FFFFFF',
                                      color: '#DC2626',
                                      border: '1px solid #FCA5A5',
                                      borderRadius: '6px',
                                      padding: '0.45rem 0.75rem',
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✕ Từ chối đơn
                                  </button>
                                </div>
                              </div>

                              {/* Box nhập lý do khi khách từ chối */}
                              {rejectPromptOrderId === order.id && (
                                <div style={{ marginTop: '0.65rem', padding: '0.65rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991B1B', marginBottom: '0.3rem' }}>
                                    Nhập lý do từ chối nhận đơn món này:
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <input
                                      type="text"
                                      value={rejectReasonText}
                                      onChange={(e) => setRejectReasonText(e.target.value)}
                                      placeholder="Ví dụ: Tôi không đặt món này, đổi ý..."
                                      style={{
                                        flex: 1,
                                        padding: '0.35rem 0.55rem',
                                        fontSize: '0.8rem',
                                        borderRadius: '4px',
                                        border: '1px solid #FCA5A5',
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleCustomerRejectOrder(order, b)}
                                      style={{
                                        background: '#DC2626',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.35rem 0.75rem',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Gửi từ chối
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRejectPromptOrderId(null)}
                                      style={{
                                        background: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '4px',
                                        padding: '0.35rem 0.55rem',
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Thông báo tiền dịch vụ phòng đã gọi */}
                      {foodFee > 0 && (
                        <div style={{ margin: '0.5rem 0', padding: '0.55rem 0.85rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', fontSize: '0.82rem', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>
                            🛎️ Dịch vụ phòng đã gọi: <strong>{sData.allOrders?.filter(o => o.status !== 'CANCELLED').length || sData.deliveredOrders?.length || 1} đơn món</strong> (Tổng tiền: <strong>{Number(foodFee).toLocaleString('vi-VN')} ₫</strong>)
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: 600 }}>Đã cộng vào chi phí lưu trú</span>
                        </div>
                      )}

                      {/* Cancellation & Refund Info if Cancelled */}
                      {b.bookingStatus === 'CANCELLED' && (
                        <div className={`status-notice-box ${b.paymentStatus === 'REFUNDED' ? 'notice-emerald' : 'notice-danger'}`}>
                          <p><strong>Lý do hủy:</strong> {b.cancellationReason || 'Khách yêu cầu'}</p>
                          {b.refundAmount > 0 ? (
                            <div style={{ marginTop: '0.35rem' }}>
                              <p>
                                <strong>Tiền hoàn lại:</strong>{' '}
                                <span style={{ color: b.paymentStatus === 'REFUNDED' ? '#000a06' : '#6B5120', fontWeight: 700 }}>
                                  {b.refundAmount.toLocaleString('vi-VN')} VNĐ
                                </span>{' '}
                                (Phí phạt hủy: {b.penaltyAmount?.toLocaleString('vi-VN')} VNĐ)
                              </p>
                              {b.paymentStatus === 'REFUNDED' ? (
                                <p style={{ marginTop: '0.35rem', color: '#000a06', fontWeight: 600, fontSize: '0.9rem' }}>
                                  <strong>Đã hoàn tiền thành công:</strong> Khách sạn đã chuyển khoản hoàn tất {b.refundAmount.toLocaleString('vi-VN')} VNĐ về tài khoản {b.bankName || 'BIDV'} ({b.bankAccountNumber || '8861339506'}) - {b.bankAccountHolder || 'NGUYEN THI YEN'}{b.refundReferenceNote ? ` [Mã giao dịch: ${b.refundReferenceNote}]` : ''}.
                                </p>
                              ) : (
                                <p style={{ marginTop: '0.35rem', color: '#92400E', fontSize: '0.9rem' }}>
                                  <strong>Đang chờ Lễ tân đối soát:</strong> Khách sạn đang đối soát và chuyển khoản hoàn cọc về tài khoản {b.bankName || 'BIDV'} ({b.bankAccountNumber || '8861339506'}) - {b.bankAccountHolder || 'NGUYEN THI YEN'} với cú pháp: <code>HOAN COC {b.bookingCode}</code>.
                                </p>
                              )}
                            </div>
                          ) : (
                            <p style={{ marginTop: '0.25rem' }}>Không có tiền hoàn lại theo chính sách thời gian hủy.</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="body-price-actions">
                      <div className="price-stack">
                        <div className="price-item">
                          <span>Tổng tiền phòng:</span>
                          <strong className="luxury-total-price">{(b.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</strong>
                        </div>
                        {foodFee > 0 && (
                          <div className="price-item">
                            <span>Dịch vụ ăn uống:</span>
                            <strong style={{ color: '#B45309' }}>+{Number(foodFee).toLocaleString('vi-VN')} VNĐ</strong>
                          </div>
                        )}
                        {foodFee > 0 && (
                          <div className="price-item" style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '0.2rem' }}>
                            <span>Tổng chi phí:</span>
                            <strong style={{ color: '#0F1E36', fontWeight: 800 }}>{((b.totalAmount || 0) + foodFee).toLocaleString('vi-VN')} VNĐ</strong>
                          </div>
                        )}
                        <div className="price-item paid-item">
                          <span>Đã thanh toán:</span>
                          <strong className="luxury-paid-price">{(b.amountPaid || 0).toLocaleString('vi-VN')} VNĐ</strong>
                        </div>
                        {((b.totalAmount || 0) + foodFee - (b.amountPaid || 0)) > 0 && (
                          <div className="price-item" style={{ color: '#B91C1C' }}>
                            <span>Còn lại:</span>
                            <strong style={{ color: '#B91C1C' }}>
                              {Math.max(0, (b.totalAmount || 0) + foodFee - (b.amountPaid || 0)).toLocaleString('vi-VN')} VNĐ
                            </strong>
                          </div>
                        )}
                      </div>

                      <div className="card-btn-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {/* Nút Xem chi tiết đặt phòng và thông tin thanh toán đầy đủ */}
                        <button
                          type="button"
                          className="btn-detail-luxury"
                          onClick={() => handleOpenDetail(b)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.5rem 0.95rem',
                            borderRadius: '8px',
                            border: '1px solid #C5A880',
                            background: '#FDF8F3',
                            color: '#8C6D2D',
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(197, 168, 128, 0.15)',
                          }}
                          title="Xem chi tiết đặt phòng, dịch vụ món ăn và bảng kê thanh toán"
                        >
                          <FileText size={15} />
                          <span>Xem chi tiết</span>
                        </button>
                        {/* Status hint for cash pending */}
                        {b.bookingStatus === 'PENDING' && b.paymentMethod === 'CASH' && (
                          <span className="pill-badge-amber">
                            ⏳ Chờ Lễ tân duyệt đơn
                          </span>
                        )}

                        {/* Status hint for confirmed cash */}
                        {b.bookingStatus === 'CONFIRMED' && b.paymentMethod === 'CASH' && (
                          <span className="pill-badge-emerald">
                            Sẵn sàng nhận phòng lúc 14:00
                          </span>
                        )}

                        {/* Online QR / VietQR pending pay button */}
                        {b.bookingStatus === 'PENDING' && (b.paymentStatus === 'UNPAID' || b.paymentStatus === 'PENDING') && b.paymentMethod === 'VIETQR' && (
                          <button
                            className="btn-pay-now-gold"
                            onClick={() => navigate(`/payment/qr?bookingCode=${b.bookingCode}`, { state: { booking: b } })}
                          >
                            📱 Thanh toán VietQR
                          </button>
                        )}

                        {/* Thông báo & nút gửi lại email xác nhận & hóa đơn PDF */}
                        {['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.bookingStatus) && (
                          <button
                            type="button"
                            className="email-auto-notice-badge"
                            disabled={resendingEmailId === (b.id || b.bookingCode)}
                            onClick={() => handleResendInvoiceEmail(b)}
                            title="Bấm để gửi lại Hóa đơn & Phiếu xác nhận PDF vào email của bạn"
                          >
                            {resendingEmailId === (b.id || b.bookingCode) ? (
                              <>
                                <Loader2 size={13} className="text-gold spin" />
                                <span>Đang gửi lại email...</span>
                              </>
                            ) : (
                              <>
                                <Mail size={13} className="text-gold" />
                                <span>Hóa đơn & xác nhận PDF gửi qua email</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Nút Báo cáo sự cố khi đang lưu trú (CHECKED_IN) */}
                        {b.bookingStatus === 'CHECKED_IN' && (
                          <button
                            type="button"
                            className="btn-report-incident"
                            onClick={() => handleOpenIncident(b)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.5rem 0.95rem',
                              borderRadius: '8px',
                              border: '1px solid #FECACA',
                              background: '#FEF2F2',
                              color: '#B91C1C',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.1)',
                            }}
                            title="Báo cáo sự cố thiết bị hoặc yêu cầu kỹ thuật buồng phòng"
                          >
                            <ShieldAlert size={15} />
                            <span>Báo cáo sự cố</span>
                          </button>
                        )}

                        {/* Cancellation button */}
                        {canCancel && (
                          <button
                            className="btn-cancel-luxury"
                            onClick={() => handleOpenCancel(b)}
                            title="Hủy đặt phòng nếu có thay đổi lịch trình"
                          >
                            ✕ Hủy phòng
                          </button>
                        )}

                        {b.bookingStatus === 'CANCELLED' && b.paymentStatus === 'REFUND_PENDING' && (
                          <button
                            className="btn-action-primary"
                            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                            onClick={() => handleConfirmReceivedRefund(b)}
                            title="Khách sạn đã hoàn tất chuyển khoản cho bạn"
                          >
                            ✓ Xác nhận đã nhận tiền hoàn cọc
                          </button>
                        )}

                        {!canCancel && b.bookingStatus !== 'CANCELLED' && (
                          <span className="non-cancellable-note-dark" title="Không thể tự hủy khi đã nhận phòng hoặc đã kết thúc">
                            ℹ️ Đang/Đã lưu trú
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancel Modal */}
        <CancelBookingModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          booking={selectedBookingForCancel}
          onSuccess={handleCancelSuccess}
        />

        {/* Report Incident Modal for active stay */}
        <ReportIncidentModal
          isOpen={isIncidentModalOpen}
          onClose={() => setIsIncidentModalOpen(false)}
          initialData={selectedBookingForIncident}
          isCustomerMode={true}
          onSuccess={handleIncidentSuccess}
        />

        {/* Booking Detail Modal (Chi tiết đặt phòng & Hóa đơn tất toán) */}
        <BookingDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          booking={selectedBookingForDetail}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
export default MyBookingsPage;

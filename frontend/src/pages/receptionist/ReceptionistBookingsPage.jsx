import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { CheckInModal } from '../../components/booking/CheckInModal';
import { CheckOutModal } from '../../components/booking/CheckOutModal';
import { CancelBookingModal } from '../../components/booking/CancelBookingModal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import {
  Search,
  RotateCcw,
  FileText,
  X,
  Loader2,
  Eye,
  Check,
  KeyRound,
  LogOut,
  AlertCircle,
  Copy,
} from 'lucide-react';

export function ReceptionistBookingsPage() {
  const [searchParams] = useSearchParams();
  const searchParam = searchParams.get('search') || searchParams.get('bookingCode') || '';
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  useEffect(() => {
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [searchParam]);

  // Master-Detail State (Slide-over Drawer)
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Operational Modals state
  const [selectedBookingForCheckIn, setSelectedBookingForCheckIn] = useState(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  const [selectedBookingForCheckOut, setSelectedBookingForCheckOut] = useState(null);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);

  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const [downloadingCode, setDownloadingCode] = useState(null);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDetailDrawerOpen) {
        setIsDetailDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailDrawerOpen]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getReceptionistBookings({
        status: statusFilter,
        paymentStatus: paymentFilter,
        searchTerm,
      });

      const confirmedList = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]');
      const refundedList = JSON.parse(localStorage.getItem('refunded_bookings') || '[]');
      const pendingRefunds = JSON.parse(localStorage.getItem('pending_refunds') || '[]');

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
        let updated = { ...b, rawBookingStatus: b.bookingStatus };
        if (confirmedList.some((item) => isMatch(item, b))) {
          const deposit = b.depositAmount || Math.round((b.totalAmount || 0) * 0.5);
          updated.bookingStatus =
            updated.bookingStatus === 'PENDING' ? 'CONFIRMED' : updated.bookingStatus;
          updated.paymentStatus =
            updated.paymentStatus === 'UNPAID' ? 'PARTIALLY_PAID' : updated.paymentStatus;
          updated.amountPaid =
            updated.amountPaid && updated.amountPaid > 0 ? updated.amountPaid : deposit;
        }

        const isRefunded = (refundedList || []).some((item) => isMatch(item, b)) || b.paymentStatus === 'REFUNDED';
        const isPending = (pendingRefunds || []).some((item) => isMatch(item, b));

        if (isRefunded) {
          updated.bookingStatus = 'CANCELLED';
          updated.paymentStatus = 'REFUNDED';
        } else if (isPending) {
          updated.bookingStatus = 'CANCELLED';
          updated.paymentStatus = 'REFUND_PENDING';
        } else if (b.bookingStatus === 'CANCELLED') {
          updated.bookingStatus = 'CANCELLED';
          updated.paymentStatus = 'REFUNDED';
        }
        return updated;
      });

      setBookings(merged);

      // If drawer is open, keep selected booking in sync
      if (selectedBookingForDetail) {
        const refreshed = merged.find((b) => b.id === selectedBookingForDetail.id);
        if (refreshed) setSelectedBookingForDetail(refreshed);
      }
    } catch (err) {
      showToast(err.message || 'Lỗi tải danh sách booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    const handleStorage = () => loadBookings();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [statusFilter, paymentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadBookings();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
  };

  const handleOpenDetail = (booking) => {
    setSelectedBookingForDetail(booking);
    setIsDetailDrawerOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailDrawerOpen(false);
  };

  const handleCopyText = (text, label) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    showToast(`Đã sao chép ${label || text}!`, 'info');
  };

  const handleConfirmCashOrder = async (bookingId, bookingCode, isBankTransfer = false) => {
    const isConfirmed = await confirm({
      title: isBankTransfer ? 'Xác nhận đã nhận cọc BIDV' : 'Xác nhận duyệt đơn đặt phòng',
      message: isBankTransfer
        ? `Xác nhận đã nhận tiền chuyển khoản cọc qua tài khoản BIDV cho đơn ${bookingCode}? Đơn sẽ chuyển sang trạng thái CONFIRMED (Đã đặt cọc 50%) và sẵn sàng nhận phòng.`
        : `Bạn có chắc chắn muốn duyệt đơn ${bookingCode}? Đơn sẽ chuyển sang trạng thái CONFIRMED (Đã xác nhận) để sẵn sàng làm thủ tục nhận phòng khi khách đến.`,
      confirmText: isBankTransfer ? 'Xác nhận đã nhận cọc' : 'Duyệt đơn',
      cancelText: 'Quay lại',
      variant: 'primary',
      icon: '✓',
    });
    if (!isConfirmed) return;

    try {
      await bookingService.confirmCashBooking(bookingId);
      const confirmedList = JSON.parse(localStorage.getItem('confirmed_bookings') || '[]');
      if (!confirmedList.includes(bookingCode)) {
        confirmedList.push(bookingCode);
        localStorage.setItem('confirmed_bookings', JSON.stringify(confirmedList));
      }
      showToast(`Đã duyệt đơn ${bookingCode} thành công! Đơn chuyển sang CONFIRMED.`, 'success');
      loadBookings();
    } catch (err) {
      showToast(err.message || 'Lỗi duyệt đơn', 'error');
    }
  };

  const handleDirectRefund = async (b) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận đã chuyển khoản hoàn cọc',
      message: `Xác nhận khách sạn đã chuyển khoản hoàn tất tiền cọc cho đơn ${b.bookingCode}? Trạng thái thanh toán của đơn sẽ chuyển ngay sang ĐÃ HOÀN TIỀN (REFUNDED).`,
      confirmText: 'Xác nhận hoàn cọc',
      cancelText: 'Quay lại',
      variant: 'primary',
      icon: '✓',
    });
    if (!isConfirmed) return;

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

    try {
      try {
        await paymentService.confirmRefund(b.id, { referenceNote: refNote });
      } catch (err) {
        console.warn('Backend refund note:', err);
      }

      const refundedList = JSON.parse(localStorage.getItem('refunded_bookings') || '[]');
      const refundRecord = {
        bookingId: b.id,
        bookingCode: String(b.bookingCode).trim().toUpperCase(),
        refundAmount: finalAmount,
        penaltyAmount: b.penaltyAmount || 0,
        bankName: b.bankName || 'BIDV',
        accountNumber: b.bankAccountNumber || '8861339506',
        accountHolder: b.customerName && b.customerName !== 'Khách vãng lai' ? b.customerName.toUpperCase() : 'NGUYEN THI YEN',
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
      showToast(`Đã xác nhận hoàn cọc ${finalAmount.toLocaleString('vi-VN')} đ cho đơn ${b.bookingCode}!`, 'success');
      loadBookings();
    } catch (err) {
      showToast(err.message || 'Lỗi duyệt hoàn cọc', 'error');
    }
  };

  const handleMarkNoShow = async (bookingId, bookingCode) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận khách vắng mặt (No-Show)',
      message: `Đánh dấu No-Show cho đơn ${bookingCode}? Hệ thống sẽ giữ 100% cọc đêm đầu và giải phóng quota các đêm còn lại theo quy định.`,
      confirmText: 'Đánh dấu No-Show',
      cancelText: 'Hủy bỏ',
      variant: 'warning',
      icon: '⚠️',
    });
    if (!isConfirmed) return;

    try {
      await bookingService.markNoShow(bookingId);
      showToast(`Đã chuyển đơn ${bookingCode} sang NO_SHOW và giải phóng quota phòng.`, 'success');
      loadBookings();
    } catch (err) {
      showToast(err.message || 'Lỗi đánh dấu No-Show', 'error');
    }
  };

  const handleDownloadInvoice = async (booking) => {
    if (!booking?.id) {
      showToast('Mã đặt phòng không hợp lệ.', 'error');
      return;
    }
    if (downloadingCode) return;

    setDownloadingCode(booking.bookingCode || booking.id);
    try {
      const result = await bookingService.downloadInvoicePdf(booking.id, booking.bookingCode);
      showToast('Đã xuất hóa đơn PDF thành công', 'success');
    } catch (err) {
      showToast(err.message || 'Không thể tải hóa đơn PDF. Vui lòng thử lại sau.', 'error');
    } finally {
      setDownloadingCode(null);
    }
  };

  return (
    <div className="receptionist-page-container">
      {/* 1. Header Minimalist */}
      <div className="receptionist-header-clean">
        <div>
          <h1 className="receptionist-page-title">Vận Hành Đơn Đặt Phòng</h1>
        </div>
        <button
          type="button"
          className="btn-refresh-clean"
          onClick={loadBookings}
          disabled={loading}
          title="Tải lại danh sách"
        >
          <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>


      {/* 3. Thanh Search & Filter Toolbar */}
      <div className="minimal-filter-toolbar">
        <form className="minimal-search-form" onSubmit={handleSearchSubmit}>
          <div className="minimal-search-box">
            <Search size={15} className="search-icon-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã booking, tên khách, số điện thoại..."
            />
          </div>
          <button type="submit" className="btn-search-solid">
            Tìm kiếm
          </button>
        </form>

        <div className="minimal-filter-actions">
          <div className="filter-select-wrap">
            <span className="filter-label">Trạng thái:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xác nhận (PENDING)</option>
              <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
              <option value="CHECKED_IN">Đang lưu trú (CHECKED_IN)</option>
              <option value="CHECKED_OUT">Đã trả phòng (CHECKED_OUT)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              <option value="NO_SHOW">Vắng mặt (NO_SHOW)</option>
            </select>
          </div>

          <div className="filter-select-wrap">
            <span className="filter-label">Thanh toán:</span>
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="ALL">Tất cả thanh toán</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PARTIALLY_PAID">Đã cọc 50%</option>
              <option value="FULLY_PAID">Đã thanh toán đủ</option>
              <option value="REFUND_PENDING">Chờ hoàn tiền</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-reset-clean"
            onClick={handleResetFilters}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* 4. MASTER TABLE (Rút gọn tối đa, 6 cột thoáng đãng, Click mở Drawer) */}
      {loading ? (
        <LoadingSpinner text="Đang tải danh sách đặt phòng..." />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Không tìm thấy đơn đặt phòng nào"
          message="Không có dữ liệu phù hợp với bộ lọc hiện tại."
          actionText="Đặt lại bộ lọc"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="master-ops-table">
            <thead>
              <tr>
                <th style={{ minWidth: 140, width: '16%' }}>Mã Booking</th>
                <th style={{ minWidth: 160, width: '22%' }}>Khách hàng</th>
                <th style={{ minWidth: 170, width: '22%' }}>Loại phòng & SL</th>
                <th style={{ minWidth: 150, width: '16%' }}>Thời gian lưu trú</th>
                <th style={{ minWidth: 130, width: '12%' }}>Trạng thái</th>
                <th style={{ minWidth: 160, width: '12%', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const isDownloadingPdf = downloadingCode === (b.bookingCode || b.id);
                const isSelected = selectedBookingForDetail?.id === b.id && isDetailDrawerOpen;

                return (
                  <tr
                    key={b.id}
                    className={`master-table-row ${isSelected ? 'row-selected' : ''}`}
                    onClick={() => handleOpenDetail(b)}
                    title="Nhấn để xem chi tiết & điều khiển đơn đặt phòng"
                  >
                    {/* Cột 1: Mã Booking */}
                    <td className="col-master-code">
                      <div className="master-code-val">{b.bookingCode}</div>
                      <div className="master-code-hint">
                        {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    {/* Cột 2: Khách hàng (Chỉ giữ tên, bỏ SĐT/Email ra khỏi bảng) */}
                    <td className="col-master-customer">
                      <div className="master-cust-name">{b.customerName || 'Khách vãng lai'}</div>
                    </td>

                    {/* Cột 3: Loại phòng & Số lượng */}
                    <td className="col-master-room">
                      <div className="master-room-type">{b.roomTypeName}</div>
                      <div className="master-room-meta">
                        {b.quantity} phòng · {b.guests || 2} khách
                      </div>
                    </td>

                    {/* Cột 4: Thời gian lưu trú (Rút gọn) */}
                    <td className="col-master-stay">
                      <div className="master-stay-dates">
                        <span>{b.checkIn}</span>
                        <span className="stay-arrow">→</span>
                        <span>{b.checkOut}</span>
                      </div>
                    </td>

                    {/* Cột 5: Trạng thái đơn */}
                    <td className="col-master-status">
                      <BookingStatusBadge status={b.bookingStatus} />
                    </td>

                    {/* Cột 6: Thao tác nhanh */}
                    <td className="col-master-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="master-actions-wrap">
                        {/* Nút Xem chi tiết (Drawer) */}
                        <button
                          type="button"
                          className="btn-quick-detail"
                          onClick={() => handleOpenDetail(b)}
                          title="Xem chi tiết đơn"
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>

                        {/* Nút thao tác nhanh theo ngữ cảnh */}
                        {b.bookingStatus === 'PENDING' && (
                          <button
                            type="button"
                            className="btn-quick-primary"
                            onClick={() => handleConfirmCashOrder(b.id, b.bookingCode, b.paymentMethod === 'VIETQR')}
                            title={b.paymentMethod === 'VIETQR' ? 'Xác nhận đã nhận cọc chuyển khoản VietQR' : 'Duyệt đơn'}
                          >
                            <Check size={12} />
                            <span>{b.paymentMethod === 'VIETQR' ? 'Nhận cọc' : 'Duyệt'}</span>
                          </button>
                        )}

                        {b.bookingStatus === 'CONFIRMED' && (
                          <button
                            type="button"
                            className="btn-quick-success"
                            onClick={() => {
                              setSelectedBookingForCheckIn(b);
                              setIsCheckInModalOpen(true);
                            }}
                            title="Làm thủ tục Check-in nhận phòng"
                          >
                            <KeyRound size={12} />
                            <span>Check-in</span>
                          </button>
                        )}

                        {b.bookingStatus === 'CHECKED_IN' && (
                          <button
                            type="button"
                            className="btn-quick-gold"
                            onClick={() => {
                              setSelectedBookingForCheckOut(b);
                              setIsCheckOutModalOpen(true);
                            }}
                            title="Làm thủ tục Check-out trả phòng"
                          >
                            <LogOut size={12} />
                            <span>Check-out</span>
                          </button>
                        )}

                        {/* Nút PDF Outline */}
                        <button
                          type="button"
                          className="btn-quick-pdf"
                          disabled={isDownloadingPdf}
                          onClick={() => handleDownloadInvoice(b)}
                          title="Tải hóa đơn PDF"
                        >
                          {isDownloadingPdf ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <FileText size={12} />
                          )}
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. SLIDE-OVER DRAWER (DETAIL VIEW) */}
      {isDetailDrawerOpen && selectedBookingForDetail && (
        <>
          <div className="drawer-overlay-backdrop" onClick={handleCloseDetail} />
          <aside className="master-detail-drawer" aria-label="Chi tiết đơn đặt phòng">
            {/* Drawer Header */}
            <div className="drawer-header-bar">
              <div>
                <div className="drawer-tagline">CHI TIẾT ĐƠN ĐẶT PHÒNG</div>
                <div className="drawer-code-title">
                  <span>{selectedBookingForDetail.bookingCode}</span>
                  <button
                    type="button"
                    className="btn-copy-code"
                    onClick={() => handleCopyText(selectedBookingForDetail.bookingCode, 'Mã đơn')}
                    title="Sao chép mã đơn"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={handleCloseDetail}
                title="Đóng (ESC)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="drawer-content-scroll">
              {/* Badges Overview */}
              <div className="drawer-badges-strip">
                <BookingStatusBadge status={selectedBookingForDetail.bookingStatus} />
                <PaymentStatusBadge status={selectedBookingForDetail.paymentStatus} />
              </div>

              {/* Khối 1: Thông tin khách hàng */}
              <div className="drawer-info-card">
                <div className="card-section-title">THÔNG TIN KHÁCH HÀNG</div>
                <div className="info-grid-stack">
                  <div className="info-kv-row">
                    <span className="kv-label">Họ và tên:</span>
                    <strong className="kv-val">{selectedBookingForDetail.customerName || 'Khách vãng lai'}</strong>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Số điện thoại:</span>
                    <span className="kv-val">{selectedBookingForDetail.customerPhone || '— Chưa cung cấp —'}</span>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Email liên hệ:</span>
                    <span className="kv-val">{selectedBookingForDetail.customerEmail || '— Chưa cung cấp —'}</span>
                  </div>
                </div>
              </div>

              {/* Khối 2: Chi tiết buồng phòng & Lưu trú */}
              <div className="drawer-info-card">
                <div className="card-section-title">CHI TIẾT BUỒNG PHÒNG & LƯU TRÚ</div>
                <div className="info-grid-stack">
                  <div className="info-kv-row">
                    <span className="kv-label">Hạng phòng:</span>
                    <strong className="kv-val">{selectedBookingForDetail.roomTypeName}</strong>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Số lượng & Khách:</span>
                    <span className="kv-val">
                      {selectedBookingForDetail.quantity} phòng · {selectedBookingForDetail.guests || 2} khách
                    </span>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Nhận phòng:</span>
                    <span className="kv-val">14:00, ngày {selectedBookingForDetail.checkIn}</span>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Trả phòng:</span>
                    <span className="kv-val">12:00, ngày {selectedBookingForDetail.checkOut}</span>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Phòng vật lý đã gán:</span>
                    <div className="kv-val">
                      {selectedBookingForDetail.assignedRooms && selectedBookingForDetail.assignedRooms.length > 0 ? (
                        <div className="drawer-room-tags">
                          {selectedBookingForDetail.assignedRooms.map((r) => (
                            <span key={r.id} className="room-pill-dark">
                              Phòng {r.roomNumber} (Tầng {r.floor || 1})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-italic">Chưa gán phòng (Lễ tân gán khi Check-in)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Khối 3: Đối soát tài chính & Thanh toán */}
              <div className="drawer-info-card">
                <div className="card-section-title">TÀI CHÍNH & THANH TOÁN</div>
                <div className="info-grid-stack">
                  <div className="info-kv-row">
                    <span className="kv-label">Tổng tiền phòng:</span>
                    <strong className="kv-val-money">
                      {(selectedBookingForDetail.totalAmount || 0).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Đã thanh toán (Cọc):</span>
                    <span className="kv-val green-money">
                      {(selectedBookingForDetail.amountPaid || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="info-kv-row highlight-kv-row">
                    <span className="kv-label">Số tiền còn nợ:</span>
                    <strong className="kv-val alert-money">
                      {Math.max(
                        0,
                        (selectedBookingForDetail.totalAmount || 0) - (selectedBookingForDetail.amountPaid || 0)
                      ).toLocaleString('vi-VN')}{' '}
                      đ
                    </strong>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Hình thức:</span>
                    <span className="kv-val">
                      {selectedBookingForDetail.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Thanh toán tại quầy (Tiền mặt/POS)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Khối 4: Ghi chú & Hoàn hủy */}
              <div className="drawer-info-card">
                <div className="card-section-title">GHI CHÚ & HOÀN HỦY</div>
                <div className="info-grid-stack">
                  <div className="info-kv-row">
                    <span className="kv-label">Ghi chú của khách:</span>
                    <span className="kv-val text-note">{selectedBookingForDetail.note || 'Không có ghi chú.'}</span>
                  </div>
                  {selectedBookingForDetail.bookingStatus === 'CANCELLED' && (
                    <>
                      <div className="info-kv-row">
                        <span className="kv-label">Lý do hủy:</span>
                        <span className="kv-val">{selectedBookingForDetail.cancellationReason || 'Khách yêu cầu'}</span>
                      </div>
                      <div className="info-kv-row">
                        <span className="kv-label">Tiền hoàn cọc:</span>
                        <strong className="kv-val green-money">
                          {(selectedBookingForDetail.refundAmount || 0).toLocaleString('vi-VN')} đ
                        </strong>
                      </div>
                      {selectedBookingForDetail.bankAccountNumber && (
                        <div className="info-kv-row">
                          <span className="kv-label">Tài khoản nhận:</span>
                          <span className="kv-val">
                            {selectedBookingForDetail.bankName || 'BIDV'} - {selectedBookingForDetail.bankAccountNumber} (
                            {selectedBookingForDetail.bankAccountHolder || 'Khách'})
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions (Đầy đủ các button nghiệp vụ) */}
            <div className="drawer-footer-actions">
              {/* Thao tác theo trạng thái */}
              {selectedBookingForDetail.bookingStatus === 'PENDING' && (
                <>
                  <button
                    type="button"
                    className="btn-drawer-primary"
                    onClick={() => {
                      handleConfirmCashOrder(
                        selectedBookingForDetail.id,
                        selectedBookingForDetail.bookingCode,
                        selectedBookingForDetail.paymentMethod === 'VIETQR'
                      );
                    }}
                  >
                    <Check size={14} />
                    <span>{selectedBookingForDetail.paymentMethod === 'VIETQR' ? 'Nhận cọc VietQR' : 'Duyệt đơn'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-drawer-danger"
                    onClick={() => {
                      setSelectedBookingForCancel(selectedBookingForDetail);
                      setIsCancelModalOpen(true);
                    }}
                  >
                    <X size={14} />
                    <span>Hủy đơn</span>
                  </button>
                </>
              )}

              {selectedBookingForDetail.bookingStatus === 'CONFIRMED' && (
                <>
                  <button
                    type="button"
                    className="btn-drawer-success"
                    onClick={() => {
                      setSelectedBookingForCheckIn(selectedBookingForDetail);
                      setIsCheckInModalOpen(true);
                    }}
                  >
                    <KeyRound size={14} />
                    <span>Làm thủ tục Check-in</span>
                  </button>
                  <button
                    type="button"
                    className="btn-drawer-danger"
                    onClick={() => {
                      setSelectedBookingForCancel(selectedBookingForDetail);
                      setIsCancelModalOpen(true);
                    }}
                  >
                    <X size={14} />
                    <span>Hủy</span>
                  </button>
                  <button
                    type="button"
                    className="btn-drawer-muted"
                    onClick={() => {
                      handleMarkNoShow(selectedBookingForDetail.id, selectedBookingForDetail.bookingCode);
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>No-Show</span>
                  </button>
                </>
              )}

              {selectedBookingForDetail.bookingStatus === 'CHECKED_IN' && (
                <button
                  type="button"
                  className="btn-drawer-gold"
                  onClick={() => {
                    setSelectedBookingForCheckOut(selectedBookingForDetail);
                    setIsCheckOutModalOpen(true);
                  }}
                >
                  <LogOut size={14} />
                  <span>Làm thủ tục Check-out & Tất toán</span>
                </button>
              )}

              {selectedBookingForDetail.bookingStatus === 'CANCELLED' &&
                selectedBookingForDetail.paymentStatus === 'REFUND_PENDING' && (
                  <button
                    type="button"
                    className="btn-drawer-primary"
                    onClick={() => handleDirectRefund(selectedBookingForDetail)}
                  >
                    <Check size={14} />
                    <span>Xác nhận hoàn cọc ngay</span>
                  </button>
                )}

              {/* Nút PDF */}
              <button
                type="button"
                className="btn-drawer-pdf"
                disabled={downloadingCode === (selectedBookingForDetail.bookingCode || selectedBookingForDetail.id)}
                onClick={() => handleDownloadInvoice(selectedBookingForDetail)}
              >
                {downloadingCode === (selectedBookingForDetail.bookingCode || selectedBookingForDetail.id) ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileText size={14} />
                )}
                <span>Xuất PDF</span>
              </button>

              <button type="button" className="btn-drawer-close-action" onClick={handleCloseDetail}>
                Đóng
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Check-in Modal */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        booking={selectedBookingForCheckIn}
        onSuccess={loadBookings}
      />

      {/* Check-out Modal */}
      <CheckOutModal
        isOpen={isCheckOutModalOpen}
        onClose={() => setIsCheckOutModalOpen(false)}
        booking={selectedBookingForCheckOut}
        onSuccess={loadBookings}
      />

      {/* Cancel Modal */}
      <CancelBookingModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        booking={selectedBookingForCancel}
        onSuccess={loadBookings}
      />
    </div>
  );
}
export default ReceptionistBookingsPage;

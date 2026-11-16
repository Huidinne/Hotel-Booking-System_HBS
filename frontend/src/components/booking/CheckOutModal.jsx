import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { InvoicePrintModal } from './InvoicePrintModal';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService';
import { roomServiceOrderService } from '../../services/roomServiceOrderService';
import { useToast } from '../../context/ToastContext';
import { FileText, Printer, Loader2, Building2, Utensils } from 'lucide-react';

export function CheckOutModal({ isOpen, onClose, booking, onSuccess }) {
  const { showToast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [downloadingVat, setDownloadingVat] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Room Service details state
  const [roomServices, setRoomServices] = useState({
    allOrders: [],
    deliveredOrders: [],
    totalDeliveredAmount: 0,
  });
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    if (isOpen && booking) {
      setLoadingServices(true);
      const bCode = booking.bookingCode || booking.code;
      const bId = booking.id || booking.bookingId;
      roomServiceOrderService
        .getCustomerBookingServices(bCode, bId)
        .then((data) => {
          setRoomServices({
            allOrders: data.allOrders || [],
            deliveredOrders: data.deliveredOrders || [],
            totalDeliveredAmount: data.totalDeliveredAmount || 0,
          });
        })
        .catch((err) => {
          console.warn('Lỗi tải room services khi checkout:', err);
        })
        .finally(() => {
          setLoadingServices(false);
        });
    }
  }, [isOpen, booking]);

  // Sprint 1 - VAT Invoice Checkbox & Information
  const [isVatInvoiceRequested, setIsVatInvoiceRequested] = useState(false);
  const [vatInfo, setVatInfo] = useState({
    companyName: '',
    taxId: '',
    companyAddress: '',
    email: '',
  });

  if (!booking) return null;

  const totalRoomAmount = booking.totalAmount || booking.totalPrice || 0;
  const totalDeliveredAmount = roomServices.totalDeliveredAmount || 0;
  const totalActiveAmount = (roomServices.allOrders || [])
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalServicesAmount = totalDeliveredAmount > 0 ? totalDeliveredAmount : totalActiveAmount;
  const totalStayCost = totalRoomAmount + totalServicesAmount;
  const amountPaid = booking.amountPaid || 0;
  const remainingBalance = Math.max(0, totalStayCost - amountPaid);

  const handleDownloadVatInvoice = async () => {
    try {
      setDownloadingVat(true);
      await bookingService.downloadInvoicePdf(booking.bookingCode || booking.id);
      showToast(`Đã xuất và tải hóa đơn VAT cho đơn ${booking.bookingCode}!`, 'success');
    } catch (err) {
      showToast(err.message || 'Không thể tải hóa đơn VAT', 'error');
    } finally {
      setDownloadingVat(false);
    }
  };

  const handleConfirmCheckOut = async () => {
    setSubmitting(true);
    try {
      // 1. Nếu có số tiền còn phải thu tại quầy (> 0), ghi nhận bút toán thu tiền quầy trước để sổ cái cập nhật đủ cả tiền phòng và tiền dịch vụ
      if (remainingBalance > 0) {
        try {
          await paymentService.recordCounterPayment({
            bookingId: booking.id,
            amount: remainingBalance,
            paymentMethod,
            type: 'COUNTER_PAYMENT',
            referenceNote: `Tất toán khi Check-out tại quầy: Tiền phòng + Dịch vụ ăn uống (${totalServicesAmount.toLocaleString('vi-VN')} VNĐ)`,
          });
        } catch (payErr) {
          console.warn('Ghi nhận bút toán quầy notice:', payErr);
        }
      }

      // 2. Thực hiện Check-out qua API Backend
      const res = await bookingService.checkOut(booking.id, paymentMethod);

      // Xóa phòng và booking đã check-out khỏi active_checked_in_stays
      try {
        const activeStays = JSON.parse(localStorage.getItem('active_checked_in_stays') || '{}');
        Object.keys(activeStays).forEach((k) => {
          if (
            Number(activeStays[k]?.bookingId) === Number(booking.id) ||
            String(activeStays[k]?.bookingCode) === String(booking.bookingCode)
          ) {
            delete activeStays[k];
          }
        });
        localStorage.setItem('active_checked_in_stays', JSON.stringify(activeStays));
        window.dispatchEvent(new Event('storage'));
      } catch (cErr) {
        console.warn('Cập nhật active stays sau checkout notice:', cErr);
      }

      const primaryEmail = booking.customerEmail || booking.email || booking.user?.email;

      // Backend checkOut đã tự động gửi email kèm hóa đơn PDF chi tiết (tiền phòng + món ăn) tới primaryEmail
      showToast(
        `Đã Check-out thành công đơn ${booking.bookingCode}! Phòng chuyển sang trạng thái CLEANING. Hóa đơn PDF đầy đủ đã được tự động gửi qua email cho khách (${primaryEmail || 'email khách hàng'}).`,
        'success'
      );

      // Nếu có nhập email nhận hóa đơn công ty/VAT riêng biệt khác với email khách hàng, gửi thêm bản sao tới email đó
      if (
        isVatInvoiceRequested &&
        vatInfo.email &&
        vatInfo.email.includes('@') &&
        vatInfo.email.trim() !== primaryEmail
      ) {
        try {
          await bookingService.sendInvoiceEmail(booking.bookingCode || booking.id, vatInfo.email.trim());
          showToast(
            `Hóa đơn điện tử VAT cũng đã được gửi thành công đến email công ty: ${vatInfo.email.trim()}`,
            'info'
          );
        } catch (mailErr) {
          console.warn('Lỗi gửi email hóa đơn VAT công ty:', mailErr);
          showToast(
            `Check-out đã hoàn tất, nhưng chưa thể gửi email VAT đến ${vatInfo.email}: ${mailErr.message}`,
            'warning'
          );
        }
      }

      // Nếu có yêu cầu xuất hóa đơn VAT, tự động kích hoạt tải hóa đơn file PDF
      if (isVatInvoiceRequested) {
        try {
          await bookingService.downloadInvoicePdf(booking.bookingCode || booking.id);
          showToast(`Đã tự động tải hóa đơn VAT cho khách hàng.`, 'info');
        } catch {
          // Bỏ qua lỗi tự động tải sau checkout
        }
      }

      onSuccess?.(res);
      onClose();
    } catch (err) {
      showToast(err.message || 'Lỗi xử lý Check-out. Vui lòng kiểm tra lại.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Thủ tục Check-out: ${booking.bookingCode}`}>
      <div className="checkout-modal-content">
        {/* Box thông tin tóm tắt */}
        <div className="info-summary-box">
          <div className="info-row">
            <span className="info-label">Khách hàng:</span>
            <span className="info-val">
              <strong>{booking.customerName}</strong> ({booking.customerPhone || 'Chưa có SĐT'})
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Phòng đang ở:</span>
            <span className="info-val">
              {booking.assignedRooms && booking.assignedRooms.length > 0
                ? booking.assignedRooms.map((r) => `Phòng ${r.roomNumber}`).join(', ')
                : 'Chưa gán thông tin'}
            </span>
          </div>
        </div>

        {/* Thẻ đối soát tài chính */}
        <div className="financial-reconciliation-card">
          <h4>Đối soát thanh toán tất toán</h4>
          <div className="reconciliation-row">
            <span>Tiền phòng:</span>
            <span className="amount-val">{totalRoomAmount.toLocaleString('vi-VN')} VNĐ</span>
          </div>

          {totalServicesAmount > 0 && (
            <>
              <div className="reconciliation-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#B45309' }}>
                  <Utensils size={14} /> Dịch vụ ăn uống ({((roomServices.allOrders || []).filter((o) => o.status !== 'CANCELLED')).length} đơn đã gọi):
                </span>
                <span className="amount-val" style={{ color: '#B45309', fontWeight: 700 }}>
                  +{totalServicesAmount.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <div style={{ margin: '0.2rem 0 0.5rem 0', padding: '0.45rem 0.65rem', background: '#FFFBEB', borderRadius: '6px', fontSize: '0.78rem', color: '#92400E', border: '1px dashed #FCD34D' }}>
                <span style={{ fontWeight: 600 }}>Chi tiết món: </span>
                {roomServices.allOrders
                  ?.filter((o) => o.status !== 'CANCELLED')
                  .flatMap((o) => o.items || [])
                  .map((it) => `${it.quantity}x ${it.name || it.itemName}`)
                  .join(', ') || 'Đang cập nhật...'}
              </div>
            </>
          )}

          {totalServicesAmount > 0 && (
            <div className="reconciliation-row" style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '0.35rem' }}>
              <span style={{ fontWeight: 700 }}>Tổng chi phí lưu trú:</span>
              <span className="amount-val" style={{ fontWeight: 800 }}>
                {totalStayCost.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          )}

          <div className="reconciliation-row">
            <span>Đã thanh toán trước (Cọc):</span>
            <span className="amount-val green-text">-{amountPaid.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div className="reconciliation-divider" />
          <div className="reconciliation-row highlight-row">
            <span>Số tiền còn phải thu tại quầy:</span>
            <span className="amount-val highlight-val">{remainingBalance.toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>

        {/* Lựa chọn phương thức thanh toán khoản còn lại */}
        {remainingBalance > 0 && (
          <div className="payment-method-selector" style={{ marginTop: '1.2rem' }}>
            <label className="field-label">Phương thức thu tiền còn lại:</label>
            <div className="radio-group-horiz">
              <label className="radio-label">
                <input
                  type="radio"
                  name="checkoutPayment"
                  value="CASH"
                  checked={paymentMethod === 'CASH'}
                  onChange={() => setPaymentMethod('CASH')}
                />
                <span>Tiền mặt tại quầy</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="checkoutPayment"
                  value="BANK_TRANSFER"
                  checked={paymentMethod === 'BANK_TRANSFER'}
                  onChange={() => setPaymentMethod('BANK_TRANSFER')}
                />
                <span>Chuyển khoản ngân hàng</span>
              </label>
            </div>
          </div>
        )}

        {/* Sprint 1: Khối Yêu cầu xuất Hóa đơn điện tử / VAT */}
        <div className="vat-invoice-card" style={{ marginTop: '1.2rem' }}>
          <div className="vat-header-row">
            <label className="vat-checkbox-label">
              <input
                type="checkbox"
                checked={isVatInvoiceRequested}
                onChange={(e) => setIsVatInvoiceRequested(e.target.checked)}
                className="vat-custom-checkbox"
              />
              <div className="vat-checkbox-text">
                <span className="vat-checkbox-title">
                  Yêu cầu xuất hóa đơn điện tử / Hóa đơn VAT cho khách
                </span>
                <span className="vat-checkbox-sub">
                  Xuất hóa đơn tài chính PDF chuẩn Grand Aurora có mã QR tra cứu
                </span>
              </div>
            </label>

            {/* Nút In / Tải Hóa Đơn VAT (Disabled nếu chưa tích chọn) */}
            <button
              type="button"
              className={`btn-vat-action ${isVatInvoiceRequested ? 'btn-vat-active' : 'btn-vat-disabled'}`}
              disabled={!isVatInvoiceRequested || downloadingVat}
              onClick={handleDownloadVatInvoice}
              title={
                isVatInvoiceRequested
                  ? 'Tải file PDF Hóa đơn VAT Grand Aurora'
                  : 'Vui lòng tích chọn yêu cầu xuất hóa đơn để tải'
              }
            >
              {downloadingVat ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang tải...</span>
                </>
              ) : (
                <>
                  <Printer size={14} />
                  <span>In / Tải Hóa Đơn VAT</span>
                </>
              )}
            </button>
          </div>

          {/* Form thông tin doanh nghiệp mở rộng khi tích chọn VAT */}
          {isVatInvoiceRequested && (
            <div className="vat-fields-stack">
              <div className="vat-fields-title">
                <Building2 size={13} />
                <span>Thông tin xuất hóa đơn công ty / doanh nghiệp (tùy chọn)</span>
              </div>
              <div className="vat-grid-2col">
                <div className="form-group-compact">
                  <label>Tên đơn vị / Công ty:</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Công ty TNHH Grand Aurora..."
                    value={vatInfo.companyName}
                    onChange={(e) => setVatInfo({ ...vatInfo, companyName: e.target.value })}
                  />
                </div>
                <div className="form-group-compact">
                  <label>Mã số thuế (MST):</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 0101234567"
                    value={vatInfo.taxId}
                    onChange={(e) => setVatInfo({ ...vatInfo, taxId: e.target.value })}
                  />
                </div>
              </div>
              <div className="vat-grid-2col">
                <div className="form-group-compact">
                  <label>Địa chỉ doanh nghiệp:</label>
                  <input
                    type="text"
                    placeholder="Địa chỉ trụ sở công ty..."
                    value={vatInfo.companyAddress}
                    onChange={(e) => setVatInfo({ ...vatInfo, companyAddress: e.target.value })}
                  />
                </div>
                <div className="form-group-compact">
                  <label>Email nhận hóa đơn điện tử:</label>
                  <input
                    type="email"
                    placeholder="ketoan@doanhnghiep.com"
                    value={vatInfo.email}
                    onChange={(e) => setVatInfo({ ...vatInfo, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Thông báo nghiệp vụ buồng phòng */}
        <div className="notice-box info-box" style={{ marginTop: '1.2rem' }}>
          ℹ️ <strong>Quy trình buồng phòng:</strong> Sau khi hoàn tất Check-out, tất cả các phòng vật lý trên sẽ tự động chuyển sang trạng thái <strong>CLEANING (Đang dọn dẹp)</strong> để nhân viên buồng phòng tiến hành vệ sinh.
        </div>

        {/* Nút hành động */}
        <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowPrintModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: '1px solid #D4AF37',
              backgroundColor: '#FEF9C3',
              color: '#92400E',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            <Printer size={15} />
            <span>🖨️ In Hóa Đơn Chi Tiết A4</span>
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn-secondary" onClick={onClose} disabled={submitting}>
              Quay lại
            </button>
            <button className="btn-primary" onClick={handleConfirmCheckOut} disabled={submitting}>
              {submitting
                ? 'Đang đối soát...'
                : `Xác nhận thu ${remainingBalance.toLocaleString('vi-VN')} VNĐ & Check-out`}
            </button>
          </div>
        </div>
      </div>

      {showPrintModal && (
        <InvoicePrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          booking={booking}
          initialServicesData={roomServices}
        />
      )}
    </Modal>
  );
}
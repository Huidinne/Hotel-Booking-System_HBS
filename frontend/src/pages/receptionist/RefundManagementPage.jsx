import React, { useState, useEffect } from 'react';
import { paymentService } from '../../services/paymentService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { RefundConfirmModal } from '../../components/booking/RefundConfirmModal';
import { useToast } from '../../context/ToastContext';

export function RefundManagementPage() {
  const { showToast } = useToast();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRefund, setSelectedRefund] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const data = await paymentService.getPendingRefunds();
      setRefunds(data);
    } catch (err) {
      showToast(err.message || 'Lỗi tải danh sách hoàn tiền', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, []);

  const handleOpenConfirm = (item) => {
    setSelectedRefund(item);
    setIsModalOpen(true);
  };

  return (
    <div className="refund-management-container">
      <div className="page-header-row">
        <div>
          <h1>Quản Lý Đối Soát Hoàn Cọc (Refund Desk)</h1>
          <p>
            Theo dõi danh sách các đơn đã hủy có số dư hoàn tiền (REFUND_PENDING).
            Nhân viên chuyển khoản thủ công theo thông tin đã che bảo mật và xác nhận ủy nhiệm chi.
          </p>
        </div>
      </div>

      <div className="security-notice-card">
        🛡️ <strong>Chính sách bảo mật tài chính (NFR-06):</strong> Số tài khoản ngân hàng của khách hàng được che bảo mật dạng <code>******7890</code>. Quy trình hoàn tiền thủ công bảo vệ tuyệt đối rủi ro gian lận hoặc gọi API hoàn tiền tự động ngoài ý muốn.
      </div>

      {loading ? (
        <LoadingSpinner text="Đang tải danh sách chờ hoàn tiền..." />
      ) : refunds.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="Không có yêu cầu hoàn tiền nào đang chờ"
          message="Tuyệt vời! Tất cả các khoản tiền hoàn cọc đã được xử lý tất toán hoàn tất."
        />
      ) : (
        <div className="table-responsive-wrapper" style={{ marginTop: '1.5rem' }}>
          <table className="ops-data-table">
            <thead>
              <tr>
                <th>Mã Booking</th>
                <th>Chủ tài khoản thụ hưởng</th>
                <th>Ngân hàng nhận</th>
                <th>Số tài khoản (Bảo mật)</th>
                <th>Số tiền hoàn lại</th>
                <th>Lý do hủy đơn</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((item) => (
                <tr key={item.bookingId}>
                  <td className="code-cell" data-label="Mã Booking">
                    <strong>{item.bookingCode}</strong>
                  </td>
                  <td data-label="Chủ tài khoản thụ hưởng">
                    <strong>{item.accountHolder}</strong>
                  </td>
                  <td data-label="Ngân hàng nhận">{item.bankName}</td>
                  <td data-label="Số tài khoản (Bảo mật)">
                    <span className="masked-account-pill">{item.accountNumberMasked}</span>
                  </td>
                  <td data-label="Số tiền hoàn lại">
                    <strong className="green-text" style={{ fontSize: '1rem' }}>
                      {item.refundAmount.toLocaleString('vi-VN')} VNĐ
                    </strong>
                  </td>
                  <td data-label="Lý do hủy đơn">
                    <span className="reason-text">{item.cancellationReason || 'Khách hủy đơn'}</span>
                  </td>
                  <td data-label="Thao tác" style={{ textAlign: 'right' }}>
                    <button
                      className="btn-action-primary"
                      onClick={() => handleOpenConfirm(item)}
                    >
                      ✓ Xác nhận đã hoàn cọc
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Refund Modal */}
      <RefundConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        refundItem={selectedRefund}
        onSuccess={loadRefunds}
      />
    </div>
  );
}

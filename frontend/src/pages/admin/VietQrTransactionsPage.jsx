import React, { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  AlertCircle,
  Building2,
  User,
  Eye,
  FileText,
  ShieldCheck,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';

export function VietQrTransactionsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');

  // Modal states
  const [selectedQrPayment, setSelectedQrPayment] = useState(null);
  const [rejectModalPayment, setRejectModalPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const loadTransactions = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      // Gọi API lấy danh sách giao dịch
      const res = await paymentService.getPendingPayments(0, 100, searchTerm);
      setTransactions(res.content || []);
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách giao dịch VietQR', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, showToast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedCode(key);
    showToast(`Đã sao chép: ${text}`, 'info');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Xác nhận giao dịch thành công (tiền đã vào tài khoản thực tế)
  const handleConfirmPayment = async (payment) => {
    if (payment.status === 'SUCCESS') {
      showToast('Giao dịch này đã được xác nhận trước đó', 'warning');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Xác nhận giao dịch VietQR',
      message: (
        <div>
          <p>
            Bạn có chắc chắn muốn xác nhận đã nhận đủ số tiền{' '}
            <strong style={{ color: '#16A34A' }}>
              {Number(payment.amount).toLocaleString('vi-VN')} VNĐ
            </strong>{' '}
            từ tài khoản ngân hàng thực tế cho đơn đặt phòng{' '}
            <strong>{payment.bookingCode}</strong>?
          </p>
          <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <div>Nội dung CK: <strong style={{ color: '#78350F' }}>{payment.transferContent}</strong></div>
            <div>Mã GD: <code>{payment.transactionCode}</code></div>
          </div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#64748B' }}>
            Hệ thống sẽ cập nhật trạng thái đơn thành <strong>CONFIRMED (Đã cọc)</strong> và tự động gửi email hóa đơn PDF cho khách hàng.
          </p>
        </div>
      ),
      confirmText: 'Xác nhận đã nhận tiền',
      cancelText: 'Hủy bỏ',
      variant: 'primary',
      icon: '✓',
    });

    if (!isConfirmed) return;

    try {
      await paymentService.confirmPayment(payment.paymentId);
      showToast(`Đã xác nhận thành công giao dịch cho đơn ${payment.bookingCode}!`, 'success');
      loadTransactions(true);
    } catch (err) {
      showToast(err.message || 'Lỗi khi xác nhận giao dịch', 'error');
    }
  };

  // Mở modal từ chối giao dịch
  const handleOpenRejectModal = (payment) => {
    if (payment.status === 'SUCCESS') {
      showToast('Không thể từ chối giao dịch đã được xác nhận thành công', 'warning');
      return;
    }
    setRejectModalPayment(payment);
    setRejectReason('');
  };

  // Gửi từ chối giao dịch kèm lý do
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối giao dịch', 'error');
      return;
    }

    setRejecting(true);
    try {
      await paymentService.rejectPayment(rejectModalPayment.paymentId, rejectReason.trim());
      showToast(`Đã từ chối giao dịch ${rejectModalPayment.transactionCode}`, 'info');
      setRejectModalPayment(null);
      loadTransactions(true);
    } catch (err) {
      showToast(err.message || 'Lỗi khi từ chối giao dịch', 'error');
    } finally {
      setRejecting(false);
    }
  };

  // Lọc giao dịch theo trạng thái
  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  const pendingCount = transactions.filter((t) => t.status === 'PENDING').length;
  const pendingAmount = transactions
    .filter((t) => t.status === 'PENDING')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const successCount = transactions.filter((t) => t.status === 'SUCCESS').length;

  return (
    <div className="admin-page-container" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#C5A880', fontWeight: 700, letterSpacing: '0.06em' }}>
            VẬN HÀNH TÀI CHÍNH · GRAND AURORA
          </div>
          <h1 style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={24} color="#C5A880" />
            <span>Đối Soát & Xác Nhận Thanh Toán VietQR</span>
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748B', fontSize: '0.88rem' }}>
            Kiểm tra biến động số dư tài khoản ngân hàng thực tế, xác nhận tiền cọc hoặc từ chối các giao dịch chuyển khoản VietQR.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          disabled={refreshing}
          onClick={() => loadTransactions(false)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.15rem' }}
        >
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Đang tải lại...' : 'Làm mới'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>GIAO DỊCH CHỜ ĐỐI SOÁT</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#D97706', marginTop: '0.4rem' }}>
            {pendingCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#92400E' }}>đơn</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>Cần đối chiếu với tài khoản ngân hàng</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>TỔNG TIỀN CỌC ĐANG CHỜ</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2563EB', marginTop: '0.4rem' }}>
            {pendingAmount.toLocaleString('vi-VN')} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1E40AF' }}>VNĐ</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>Tổng tiền chuyển khoản cần xác nhận thực thu</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>ĐÃ XÁC NHẬN HỢP LỆ</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16A34A', marginTop: '0.4rem' }}>
            {successCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#15803D' }}>giao dịch</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>Đã xác nhận tiền vào tài khoản thành công</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'PENDING', label: `Chờ duyệt (${pendingCount})` },
            { id: 'ALL', label: 'Tất cả' },
            { id: 'SUCCESS', label: 'Đã xác nhận' },
            { id: 'FAILED', label: 'Bị từ chối' },
            { id: 'EXPIRED', label: 'Hết hạn' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: statusFilter === tab.id ? '1px solid #0F172A' : '1px solid #E2E8F0',
                background: statusFilter === tab.id ? '#0F172A' : '#F8FAFC',
                color: statusFilter === tab.id ? '#FFFFFF' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', minWidth: '300px' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Tìm theo mã Booking, mã GD, nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.88rem',
            }}
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <LoadingSpinner text="Đang tải danh sách giao dịch VietQR..." />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon="💳"
          title="Không có giao dịch nào"
          description={searchTerm ? 'Không tìm thấy giao dịch phù hợp với từ khóa tìm kiếm.' : 'Hiện tại chưa có giao dịch VietQR nào trong bộ lọc này.'}
        />
      ) : (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflowX: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600, fontSize: '0.82rem' }}>
                <th style={{ padding: '0.85rem 1rem' }}>MÃ GIAO DỊCH / THỜI GIAN</th>
                <th style={{ padding: '0.85rem 1rem' }}>ĐƠN ĐẶT PHÒNG & KHÁCH</th>
                <th style={{ padding: '0.85rem 1rem' }}>SỐ TIỀN CỌC</th>
                <th style={{ padding: '0.85rem 1rem' }}>NỘI DUNG CHUYỂN KHOẢN</th>
                <th style={{ padding: '0.85rem 1rem' }}>TRẠNG THÁI</th>
                <th style={{ padding: '0.85rem 1rem' }}>ĐỐI SOÁT / XÁC MINH</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((item) => {
                const isItemPending = item.status === 'PENDING';
                const isItemSuccess = item.status === 'SUCCESS';
                const isItemFailed = item.status === 'FAILED';
                const isItemExpired = item.status === 'EXPIRED';

                return (
                  <tr
                    key={item.paymentId}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: isItemPending ? '#FFFDF7' : '#FFFFFF',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Mã GD & Thời gian */}
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                        {item.transactionCode}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.2rem' }}>
                        Tạo lúc: {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}
                      </div>
                      {item.expiresAt && isItemPending && (
                        <div style={{ fontSize: '0.75rem', color: '#D97706', marginTop: '0.2rem' }}>
                          Hết hạn: {new Date(item.expiresAt).toLocaleTimeString('vi-VN')}
                        </div>
                      )}
                    </td>

                    {/* Booking & Khách */}
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>
                        {item.bookingCode}
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                        {item.customerName || 'Khách vãng lai'}
                        {item.customerPhone ? ` • ${item.customerPhone}` : ''}
                      </div>
                      {item.roomTypeName && (
                        <div style={{ color: '#64748B', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                          {item.roomTypeName}
                        </div>
                      )}
                    </td>

                    {/* Số tiền */}
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <strong style={{ color: '#16A34A', fontSize: '1rem' }}>
                        {Number(item.amount).toLocaleString('vi-VN')} VNĐ
                      </strong>
                    </td>

                    {/* Nội dung CK */}
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#FEF3C7', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                        <code style={{ color: '#78350F', fontWeight: 700, fontSize: '0.92rem' }}>
                          {item.transferContent}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.transferContent, item.paymentId)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', color: '#78350F' }}
                          title="Sao chép nội dung chuyển khoản"
                        >
                          {copiedCode === item.paymentId ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: '0.9rem 1rem' }}>
                      {isItemPending && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                          <Clock size={13} /> Chờ xác nhận
                        </span>
                      )}
                      {isItemSuccess && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}>
                          <CheckCircle2 size={13} /> Đã nhận tiền
                        </span>
                      )}
                      {isItemFailed && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>
                          <XCircle size={13} /> Bị từ chối
                        </span>
                      )}
                      {isItemExpired && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>
                          Hết hạn
                        </span>
                      )}
                    </td>

                    {/* Đối soát / Người duyệt */}
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: '#64748B' }}>
                      {item.verifiedBy ? (
                        <div>
                          <div>Duyệt bởi: <strong>{item.verifiedBy}</strong></div>
                          {item.verifiedAt && (
                            <div style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                              {new Date(item.verifiedAt).toLocaleString('vi-VN')}
                            </div>
                          )}
                          {item.rejectionReason && (
                            <div style={{ color: '#DC2626', marginTop: '0.2rem', fontStyle: 'italic' }}>
                              Lý do: {item.rejectionReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Chưa đối soát</span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        
                        {/* Xem QR */}
                        {item.qrCodeUrl && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => setSelectedQrPayment(item)}
                            title="Xem mã VietQR"
                          >
                            <QrCode size={14} />
                            <span>Xem QR</span>
                          </button>
                        )}

                        {/* Khi PENDING: Cho phép duyệt hoặc từ chối */}
                        {isItemPending && (
                          <>
                            <button
                              type="button"
                              className="btn-auth-gold"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', width: 'auto', marginTop: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              onClick={() => handleConfirmPayment(item)}
                              title="Kiểm tra tiền đã vào tài khoản và xác nhận cọc"
                            >
                              <CheckCircle2 size={14} />
                              <span>Xác nhận tiền về</span>
                            </button>

                            <button
                              type="button"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              onClick={() => handleOpenRejectModal(item)}
                              title="Từ chối giao dịch nếu không nhận được tiền hoặc sai lệch"
                            >
                              <XCircle size={14} />
                              <span>Từ chối</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: XEM MÃ VIETQR */}
      {selectedQrPayment && (
        <Modal
          isOpen={Boolean(selectedQrPayment)}
          onClose={() => setSelectedQrPayment(null)}
          title={`Mã VietQR - Đơn ${selectedQrPayment.bookingCode}`}
        >
          <div style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
            <div style={{ display: 'inline-block', padding: '10px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <img
                src={selectedQrPayment.qrCodeUrl}
                alt="VietQR Preview"
                style={{ width: '260px', height: '260px', objectFit: 'contain', display: 'block' }}
              />
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'left', background: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
              <div>Ngân hàng: <strong>{selectedQrPayment.bankCode || 'Napas'}</strong></div>
              <div>Số tài khoản: <code>{selectedQrPayment.bankAccount}</code></div>
              <div>Chủ tài khoản: <strong>{selectedQrPayment.bankAccountName || 'Grand Aurora Hotel'}</strong></div>
              <div>Số tiền: <strong style={{ color: '#16A34A', fontSize: '1rem' }}>{Number(selectedQrPayment.amount).toLocaleString('vi-VN')} VNĐ</strong></div>
              <div>Nội dung CK: <code style={{ color: '#78350F', fontWeight: 700, background: '#FEF3C7', padding: '2px 6px', borderRadius: '4px' }}>{selectedQrPayment.transferContent}</code></div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '0.55rem 1.25rem' }}
                onClick={() => setSelectedQrPayment(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: TỪ CHỐI GIAO DỊCH */}
      {rejectModalPayment && (
        <Modal
          isOpen={Boolean(rejectModalPayment)}
          onClose={() => setRejectModalPayment(null)}
          title="Từ chối giao dịch VietQR"
        >
          <form onSubmit={handleConfirmReject} style={{ padding: '0.5rem 0' }}>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              Bạn đang từ chối giao dịch <code>{rejectModalPayment.transactionCode}</code> cho đơn đặt phòng <strong>{rejectModalPayment.bookingCode}</strong>.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Lý do từ chối (bắt buộc):
              </label>
              <textarea
                rows={3}
                required
                placeholder="Ví dụ: Tiền chưa nổi trong tài khoản, sai nội dung chuyển khoản, thiếu tiền cọc..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={rejecting}
                onClick={() => setRejectModalPayment(null)}
                style={{ width: 'auto', padding: '0.55rem 1.15rem' }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={rejecting || !rejectReason.trim()}
                style={{ width: 'auto', padding: '0.55rem 1.25rem', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                {rejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}

export default VietQrTransactionsPage;

// =============================================================================
// HOTEL BOOKING SYSTEM - REFUND MANAGEMENT & PAYMENT LEDGER
// File: src/pages/receptionist/RefundManagementPage.jsx
// Handles:
// 1. Pending Refunds Desk (Lễ tân/Admin xác nhận hoàn tiền cọc ngân hàng thủ công)
// 2. Payment Ledger & Net Cash Flow (Sổ cái đối soát dòng tiền đa kênh theo contract Đức Anh)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  RefreshCw,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  RotateCcw,
  Search,
  Calendar,
  AlertCircle,
  Building,
  User,
  CheckCircle,
  Clock,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { RefundConfirmModal } from '../../components/booking/RefundConfirmModal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_LEDGER_FILTER = {
  startDate: '',
  endDate: '',
  bookingCode: '',
  type: '',
  paymentMethod: '',
  status: '',
};

export function RefundManagementPage() {
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  // Active Tab: 'refunds' (Bàn hoàn cọc) | 'ledger' (Sổ cái đối soát)
  const [activeTab, setActiveTab] = useState('refunds');

  // --- TAB 1: REFUND DESK STATES ---
  const [refunds, setRefunds] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- TAB 2: PAYMENT LEDGER STATES ---
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState(DEFAULT_LEDGER_FILTER);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // =========================================================================
  // LOAD TAB 1: PENDING REFUNDS (API DUY NHẤT - KHÔNG LOCALSTORAGE, KHÔNG FAKE)
  // =========================================================================
  const loadRefunds = useCallback(async () => {
    setLoadingRefunds(true);
    try {
      const data = await paymentService.getPendingRefunds();
      setRefunds(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err?.message || 'Không thể tải danh sách chờ hoàn tiền từ máy chủ', 'error');
      setRefunds([]);
    } finally {
      setLoadingRefunds(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  // =========================================================================
  // LOAD TAB 2: PAYMENT LEDGER (CONTRACT ĐỨC ANH BÀN GIAO)
  // =========================================================================
  const loadLedger = useCallback(async () => {
    // Validate khoảng ngày nếu cả 2 đều có
    if (ledgerFilter.startDate && ledgerFilter.endDate) {
      if (ledgerFilter.startDate > ledgerFilter.endDate) {
        showToast('Khoảng thời gian không hợp lệ: Từ ngày không được sau Đến ngày', 'error');
        return;
      }
    }

    setLoadingLedger(true);
    try {
      const res = await paymentService.getPaymentLedger({
        ...ledgerFilter,
        page: currentPage,
        size: pageSize,
      });

      if (res) {
        setLedgerEntries(res.entries || []);
        setLedgerSummary(res.summary || null);
        setTotalPages(res.totalPages || 0);
        setTotalElements(res.totalElements || 0);
      }
    } catch (err) {
      showToast(err?.message || 'Không thể tải dữ liệu sổ cái đối soát', 'error');
      setLedgerEntries([]);
    } finally {
      setLoadingLedger(false);
    }
  }, [ledgerFilter, currentPage, pageSize, showToast]);

  useEffect(() => {
    if (activeTab === 'ledger') {
      loadLedger();
    }
  }, [activeTab, loadLedger]);

  const handleLedgerFilterChange = (field, value) => {
    setLedgerFilter((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyLedgerFilter = (e) => {
    e?.preventDefault();
    setCurrentPage(0);
    loadLedger();
  };

  const handleResetLedgerFilter = () => {
    setLedgerFilter(DEFAULT_LEDGER_FILTER);
    setCurrentPage(0);
  };

  const handleOpenConfirm = (item) => {
    setSelectedRefund(item);
    setIsModalOpen(true);
  };

  const handleCopySTK = (stk) => {
    if (!stk) {
      showToast('Khách hàng chưa cung cấp số tài khoản!', 'warning');
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(stk);
      showToast(`Đã sao chép: ${stk}!`, 'success');
    }
  };

  // Format Vietnam Timezone (UTC+7)
  const formatVietnamTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="refund-management-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Quản Lý Đối Soát & Sổ Cái Thanh Toán</h1>
          </div>
          <p style={{ marginTop: '0.35rem', color: '#64748B' }}>
            Theo dõi danh sách hoàn cọc chờ xử lý và kiểm soát toàn bộ bút toán dòng tiền thực thu (Net Cash Flow) của khách sạn.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
            onClick={activeTab === 'refunds' ? loadRefunds : loadLedger}
            disabled={loadingRefunds || loadingLedger}
          >
            <RefreshCw size={15} className={loadingRefunds || loadingLedger ? 'animate-spin' : ''} />
            Làm mới số liệu
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('refunds')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: activeTab === 'refunds' ? '3px solid #B89668' : '3px solid transparent',
            color: activeTab === 'refunds' ? '#0F1E36' : '#64748B',
            marginBottom: '-2px',
            transition: 'all 0.2s ease',
          }}
        >
          <CreditCard size={18} color={activeTab === 'refunds' ? '#B89668' : '#94A3B8'} />
          Bàn Hoàn Cọc Chờ Xử Lý (Refund Desk)
          <span
            style={{
              fontSize: '0.75rem',
              backgroundColor: refunds.length > 0 ? '#FEE2E2' : '#F1F5F9',
              color: refunds.length > 0 ? '#DC2626' : '#64748B',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontWeight: 700,
            }}
          >
            {refunds.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: activeTab === 'ledger' ? '3px solid #B89668' : '3px solid transparent',
            color: activeTab === 'ledger' ? '#0F1E36' : '#64748B',
            marginBottom: '-2px',
            transition: 'all 0.2s ease',
          }}
        >
          <Receipt size={18} color={activeTab === 'ledger' ? '#B89668' : '#94A3B8'} />
          Sổ Cái Thanh Toán & Dòng Tiền (Payment Ledger)
          {isAdmin && (
            <span
              style={{
                fontSize: '0.72rem',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                padding: '0.12rem 0.45rem',
                borderRadius: '9999px',
              }}
            >
              Admin KPI
            </span>
          )}
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: REFUND DESK (DANH SÁCH CHỜ HOÀN TIỀN CỌC) */}
      {/* =================================================================== */}
      {activeTab === 'refunds' && (
        <>
          <div className="security-notice-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <ShieldCheck size={20} color="#1E40AF" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <div>
                <strong>Quy trình Lễ tân đối soát & Bảo mật tài chính (NFR-06):</strong>
                <ul style={{ margin: '0.35rem 0 0 1.15rem', padding: 0 }}>
                  <li>Số tài khoản khách hàng được mã hóa che theo chuẩn an toàn (ví dụ: <code>******9506</code>).</li>
                  <li>Nhân viên đối soát thông tin tài khoản thụ hưởng, thực hiện lệnh chuyển khoản qua Internet Banking / App ngân hàng.</li>
                  <li>Sau khi chuyển khoản thành công, bấm <strong>"✓ Xác nhận đã hoàn cọc"</strong> và nhập mã ủy nhiệm chi (Reference) để hệ thống tự động ghi nhận bút toán REFUND vào Sổ Cái và lưu vết Audit Log.</li>
                </ul>
              </div>
            </div>
          </div>

          {loadingRefunds ? (
            <LoadingSpinner text="Đang đồng bộ danh sách đơn chờ hoàn tiền từ máy chủ..." />
          ) : refunds.length === 0 ? (
            <EmptyState
              title="Không có yêu cầu hoàn tiền nào đang chờ"
              message="Tất cả các khoản tiền hoàn cọc đã được xử lý tất toán hoàn tất trên hệ thống."
            />
          ) : (
            <div className="table-responsive-wrapper">
              <table className="ops-data-table">
                <thead>
                  <tr>
                    <th>Mã Booking</th>
                    <th>Chủ tài khoản thụ hưởng</th>
                    <th>Ngân hàng nhận</th>
                    <th>Số tài khoản nhận</th>
                    <th>Số tiền hoàn lại</th>
                    <th>Lý do hủy đơn</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((item) => {
                    const hasBank = Boolean(item.bankName);
                    const hasAcc = Boolean(item.accountNumberMasked);
                    const hasHolder = Boolean(item.accountHolder);

                    return (
                      <tr key={item.bookingId || item.bookingCode}>
                        {/* 1. Mã Booking */}
                        <td className="code-cell" data-label="Mã Booking">
                          <strong style={{ letterSpacing: '0.04em' }}>{item.bookingCode}</strong>
                        </td>

                        {/* 2. Chủ tài khoản */}
                        <td data-label="Chủ tài khoản thụ hưởng">
                          {hasHolder ? (
                            <strong style={{ color: '#0F172A' }}>{item.accountHolder.toUpperCase()}</strong>
                          ) : (
                            <span style={{ color: '#E11D48', fontStyle: 'italic', fontSize: '0.86rem' }}>
                              Chưa cập nhật tên
                            </span>
                          )}
                        </td>

                        {/* 3. Ngân hàng nhận */}
                        <td data-label="Ngân hàng nhận">
                          {hasBank ? (
                            <span>{item.bankName}</span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.86rem' }}>—</span>
                          )}
                        </td>

                        {/* 4. Số tài khoản nhận */}
                        <td data-label="Số tài khoản nhận">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {hasAcc ? (
                              <>
                                <span className="masked-account-pill">{item.accountNumberMasked}</span>
                                <button
                                  type="button"
                                  style={{
                                    padding: '0.25rem 0.55rem',
                                    fontSize: '0.76rem',
                                    cursor: 'pointer',
                                    background: '#F1F5F9',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                  }}
                                  onClick={() => handleCopySTK(item.accountNumberMasked)}
                                  title="Sao chép số tài khoản"
                                >
                                  Sao chép
                                </button>
                              </>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  color: '#DC2626',
                                  backgroundColor: '#FEE2E2',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                Chưa cung cấp STK
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Số tiền hoàn lại */}
                        <td data-label="Số tiền hoàn lại">
                          <strong style={{ fontSize: '1.02rem', color: '#16A34A', fontWeight: 700 }}>
                            {Number(item.refundAmount || 0).toLocaleString('vi-VN')} VNĐ
                          </strong>
                        </td>

                        {/* 6. Lý do hủy đơn */}
                        <td data-label="Lý do hủy đơn">
                          <span className="reason-text">{item.cancellationReason || 'Khách yêu cầu hủy phòng'}</span>
                        </td>

                        {/* 7. Thao tác */}
                        <td data-label="Thao tác" style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-action-primary"
                            onClick={() => handleOpenConfirm(item)}
                          >
                            ✓ Xác nhận đã hoàn cọc
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* =================================================================== */}
      {/* TAB 2: PAYMENT LEDGER (SỔ CÁI THANH TOÁN & DÒNG TIỀN THỰC THU) */}
      {/* =================================================================== */}
      {activeTab === 'ledger' && (
        <>
          {/* KPI Summary Cards */}
          {ledgerSummary && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              {/* 1. Tổng Cọc Online (VNPay) */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>Tổng Cọc Online (VNPay)</span>
                  <ArrowDownLeft size={20} color="#2563EB" />
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1E40AF' }}>
                  {Number(ledgerSummary.totalDepositOnline || 0).toLocaleString('vi-VN')} VNĐ
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                  Dòng tiền cọc trực tuyến đã khớp thành công
                </div>
              </div>

              {/* 2. Tổng Thu Tại Quầy */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>Tổng Thu Tại Quầy (Counter)</span>
                  <Wallet size={20} color="#0D9488" />
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F766E' }}>
                  {Number(ledgerSummary.totalCounterRevenue || 0).toLocaleString('vi-VN')} VNĐ
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                  Tiền mặt: {Number(ledgerSummary.totalCounterCash || 0).toLocaleString('vi-VN')} đ · Chuyển khoản: {Number(ledgerSummary.totalCounterTransfer || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>

              {/* 3. Tổng Tiền Hoàn Cọc (Outflow) */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>Tổng Tiền Đã Hoàn Cọc (Outflow)</span>
                  <ArrowUpRight size={20} color="#DC2626" />
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#DC2626' }}>
                  {Number(ledgerSummary.totalRefunded || 0).toLocaleString('vi-VN')} VNĐ
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                  Tổng tiền đã chuyển khoản trả khách khi hủy đơn
                </div>
              </div>

              {/* 4. Dòng Tiền Ròng (Net Cash Flow) */}
              <div
                style={{
                  backgroundColor: Number(ledgerSummary.netCashFlow || 0) >= 0 ? '#F0FDF4' : '#FEF2F2',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: `1px solid ${Number(ledgerSummary.netCashFlow || 0) >= 0 ? '#BBF7D0' : '#FECACA'}`,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: Number(ledgerSummary.netCashFlow || 0) >= 0 ? '#166534' : '#991B1B' }}>
                    Dòng Tiền Thực Ròng (Net Cash)
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: Number(ledgerSummary.netCashFlow || 0) >= 0 ? '#DCFCE7' : '#FEE2E2',
                      color: Number(ledgerSummary.netCashFlow || 0) >= 0 ? '#15803D' : '#DC2626',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '9999px',
                    }}
                  >
                    {Number(ledgerSummary.netCashFlow || 0) >= 0 ? 'DƯ TIỀN' : 'ÂM TIỀN HỢP LỆ'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: Number(ledgerSummary.netCashFlow || 0) >= 0 ? '#15803D' : '#DC2626',
                  }}
                >
                  {Number(ledgerSummary.netCashFlow || 0) > 0 ? '+' : ''}
                  {Number(ledgerSummary.netCashFlow || 0).toLocaleString('vi-VN')} VNĐ
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
                  Thành công: <strong>{ledgerSummary.successfulTransactionCount}</strong> · Thất bại: <strong>{ledgerSummary.failedTransactionCount}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Sổ Cái Filter Bar */}
          <form
            onSubmit={handleApplyLedgerFilter}
            style={{
              backgroundColor: '#FFFFFF',
              padding: '1.15rem',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              marginBottom: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.85rem',
                alignItems: 'flex-end',
              }}
            >
              {/* Filter 1: Mã Booking */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Mã Booking
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: BK-202611..."
                  value={ledgerFilter.bookingCode}
                  onChange={(e) => handleLedgerFilterChange('bookingCode', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              {/* Filter 2: Loại Giao Dịch */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Loại giao dịch
                </label>
                <select
                  value={ledgerFilter.type}
                  onChange={(e) => handleLedgerFilterChange('type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="">Tất cả loại giao dịch</option>
                  <option value="DEPOSIT">Cọc Online (DEPOSIT)</option>
                  <option value="COUNTER_PAYMENT">Thu tại quầy (COUNTER_PAYMENT)</option>
                  <option value="REFUND">Hoàn tiền cọc (REFUND)</option>
                  <option value="ADDITIONAL_SERVICE">Phụ thu dịch vụ</option>
                </select>
              </div>

              {/* Filter 3: Phương thức thanh toán */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Phương thức
                </label>
                <select
                  value={ledgerFilter.paymentMethod}
                  onChange={(e) => handleLedgerFilterChange('paymentMethod', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="">Tất cả phương thức</option>
                  <option value="VNPAY">VNPay Sandbox</option>
                  <option value="CASH">Tiền mặt tại quầy</option>
                  <option value="BANK_TRANSFER">Chuyển khoản</option>
                </select>
              </div>

              {/* Filter 4: Trạng thái */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Trạng thái
                </label>
                <select
                  value={ledgerFilter.status}
                  onChange={(e) => handleLedgerFilterChange('status', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="SUCCESS">Thành công (SUCCESS)</option>
                  <option value="PENDING">Chờ xử lý (PENDING)</option>
                  <option value="FAILED">Thất bại (FAILED)</option>
                  <option value="EXPIRED">Hết hạn (EXPIRED)</option>
                </select>
              </div>

              {/* Filter 5: Từ ngày */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={ledgerFilter.startDate}
                  onChange={(e) => handleLedgerFilterChange('startDate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              {/* Filter 6: Đến ngày */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={ledgerFilter.endDate}
                  onChange={(e) => handleLedgerFilterChange('endDate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.52rem 1.1rem',
                    fontSize: '0.86rem',
                  }}
                >
                  <Filter size={15} />
                  Lọc
                </button>
                <button
                  type="button"
                  onClick={handleResetLedgerFilter}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.52rem 0.85rem',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '0.86rem',
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                  title="Đặt lại bộ lọc"
                >
                  <RotateCcw size={15} />
                  Đặt lại
                </button>
              </div>
            </div>
          </form>

          {/* Sổ Cái Table */}
          {loadingLedger ? (
            <LoadingSpinner text="Đang tải dữ liệu bút toán Sổ Cái từ máy chủ..." />
          ) : ledgerEntries.length === 0 ? (
            <EmptyState
              title="Không tìm thấy bút toán giao dịch nào"
              message="Không có giao dịch nào khớp với khoảng thời gian hoặc điều kiện lọc đã chọn."
            />
          ) : (
            <>
              <div className="table-responsive-wrapper">
                <table className="ops-data-table">
                  <thead>
                    <tr>
                      <th>Thời gian giao dịch</th>
                      <th>Mã giao dịch</th>
                      <th>Mã Booking</th>
                      <th>Loại bút toán</th>
                      <th>Kênh thanh toán</th>
                      <th>Dòng tiền (VND)</th>
                      <th>Trạng thái</th>
                      <th>Tham chiếu / Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry) => {
                      const isRefund = entry.type === 'REFUND' || entry.cashFlowSign === -1;
                      const isSuccess = entry.status === 'SUCCESS';

                      return (
                        <tr key={entry.id || entry.transactionCode}>
                          {/* Thời gian */}
                          <td data-label="Thời gian giao dịch" style={{ whiteSpace: 'nowrap', fontSize: '0.86rem', color: '#475569' }}>
                            {formatVietnamTime(entry.transactionTime)}
                          </td>

                          {/* Mã giao dịch */}
                          <td className="code-cell" data-label="Mã giao dịch">
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F1E36' }}>
                              {entry.transactionCode}
                            </span>
                          </td>

                          {/* Mã booking */}
                          <td data-label="Mã Booking">
                            <strong style={{ color: '#1E40AF', letterSpacing: '0.04em' }}>
                              {entry.bookingCode || entry.reference?.bookingCode || '—'}
                            </strong>
                          </td>

                          {/* Loại bút toán */}
                          <td data-label="Loại bút toán">
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '9999px',
                                backgroundColor:
                                  entry.type === 'DEPOSIT'
                                    ? '#EFF6FF'
                                    : entry.type === 'COUNTER_PAYMENT'
                                    ? '#F0FDF4'
                                    : entry.type === 'REFUND'
                                    ? '#FEF2F2'
                                    : '#F8FAFC',
                                color:
                                  entry.type === 'DEPOSIT'
                                    ? '#1D4ED8'
                                    : entry.type === 'COUNTER_PAYMENT'
                                    ? '#15803D'
                                    : entry.type === 'REFUND'
                                    ? '#DC2626'
                                    : '#475569',
                                border: `1px solid ${
                                  entry.type === 'DEPOSIT'
                                    ? '#BFDBFE'
                                    : entry.type === 'COUNTER_PAYMENT'
                                    ? '#BBF7D0'
                                    : entry.type === 'REFUND'
                                    ? '#FECACA'
                                    : '#E2E8F0'
                                }`,
                              }}
                            >
                              {entry.type === 'DEPOSIT' && 'Cọc Online'}
                              {entry.type === 'COUNTER_PAYMENT' && 'Thu tại quầy'}
                              {entry.type === 'REFUND' && 'Hoàn tiền cọc'}
                              {entry.type === 'ADDITIONAL_SERVICE' && 'Phụ thu'}
                            </span>
                          </td>

                          {/* Kênh thanh toán */}
                          <td data-label="Kênh thanh toán">
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                              {entry.paymentMethod === 'VNPAY' && 'VNPay Sandbox'}
                              {entry.paymentMethod === 'CASH' && 'Tiền mặt (Cash)'}
                              {entry.paymentMethod === 'BANK_TRANSFER' && 'Chuyển khoản'}
                            </span>
                          </td>

                          {/* Dòng tiền */}
                          <td data-label="Dòng tiền">
                            <strong
                              style={{
                                fontSize: '1rem',
                                color: isRefund ? '#DC2626' : '#16A34A',
                                fontWeight: 700,
                              }}
                            >
                              {isRefund ? '-' : '+'}
                              {Number(entry.amount || 0).toLocaleString('vi-VN')} VNĐ
                            </strong>
                          </td>

                          {/* Trạng thái */}
                          <td data-label="Trạng thái">
                            <span
                              style={{
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                padding: '0.18rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: isSuccess ? '#DCFCE7' : '#FEE2E2',
                                color: isSuccess ? '#15803D' : '#DC2626',
                              }}
                            >
                              {entry.status}
                            </span>
                          </td>

                          {/* Ghi chú & Tham chiếu */}
                          <td data-label="Tham chiếu" style={{ fontSize: '0.84rem', color: '#64748B' }}>
                            {entry.reference?.referenceNote && (
                              <div>
                                Ref: <strong>{entry.reference.referenceNote}</strong>
                              </div>
                            )}
                            {entry.actorEmail && <div>Bởi: {entry.actorEmail}</div>}
                            {entry.reference?.customerName && (
                              <div>Khách: {entry.reference.customerName}</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="table-pagination-container" style={{ marginTop: '1rem' }}>
                <div className="pagination-info">
                  Hiển thị{' '}
                  <strong>
                    {currentPage * pageSize + 1} -{' '}
                    {Math.min((currentPage + 1) * pageSize, totalElements)}
                  </strong>{' '}
                  trên tổng số <strong>{totalElements}</strong> bút toán · Trang{' '}
                  <strong>
                    {currentPage + 1} / {Math.max(1, totalPages)}
                  </strong>
                </div>

                {totalPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    >
                      ← Trước
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i).map((pageIdx) => (
                      <button
                        key={pageIdx}
                        type="button"
                        className={`pagination-btn ${currentPage === pageIdx ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageIdx)}
                      >
                        {pageIdx + 1}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={currentPage >= totalPages - 1}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      Sau →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
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

export default RefundManagementPage;

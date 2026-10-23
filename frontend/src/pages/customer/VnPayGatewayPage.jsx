import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export function VnPayGatewayPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const rawTxnRef = searchParams.get('vnp_TxnRef') || 'BK-DEMO-20261023';
  const bkMatch = rawTxnRef.match(/BK-[A-Za-z0-9-]+/);
  const bookingCode = bkMatch ? bkMatch[0] : rawTxnRef;

  const rawAmount = Number(searchParams.get('vnp_Amount')) || 950000;
  const amount = rawAmount >= 50000000 ? Math.round(rawAmount / 100) : rawAmount;

  // Step 1: Chọn ngân hàng & nhập thẻ, Step 2: Nhập OTP
  const [step, setStep] = useState(1);
  const [selectedBank, setSelectedBank] = useState('NCB');
  const [cardNumber, setCardNumber] = useState('9704198526191432198');
  const [cardHolder, setCardHolder] = useState('NGUYEN VAN A');
  const [issueDate, setIssueDate] = useState('07/15');
  const [otp, setOtp] = useState('123456');
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [processing, setProcessing] = useState(false);

  // 15 mins timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(`/payment/vnpay-return?vnp_ResponseCode=11&vnp_TxnRef=${bookingCode}&vnp_Amount=${amount * 100}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [bookingCode, amount, navigate]);

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFillTestCard = () => {
    setSelectedBank('NCB');
    setCardNumber('9704198526191432198');
    setCardHolder('NGUYEN VAN A');
    setIssueDate('07/15');
    showToast('Đã điền sẵn thông tin thẻ Test NCB chuẩn VNPay!', 'info');
  };

  const handleSubmitCard = (e) => {
    e.preventDefault();
    if (!cardNumber.trim() || !cardHolder.trim() || !issueDate.trim()) {
      showToast('Vui lòng nhập đầy đủ thông tin thẻ!', 'warning');
      return;
    }
    setStep(2);
    showToast('Mã xác thực OTP đã được gửi về số điện thoại giả lập của bạn!', 'success');
  };

  const handleConfirmOtp = () => {
    if (!otp.trim()) {
      showToast('Vui lòng nhập mã OTP xác thực!', 'warning');
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      const vnpTransactionNo = `VNP-${Date.now().toString().slice(-8)}`;
      // Chuyển hướng về trang Return với mã thành công 00
      navigate(
        `/payment/vnpay-return?vnp_ResponseCode=00&vnp_TxnRef=${bookingCode}&vnp_Amount=${amount * 100}&vnp_BankCode=${selectedBank}&vnp_TransactionNo=${vnpTransactionNo}&vnp_CardType=ATM`
      );
    }, 1200);
  };

  const handleCancelPayment = () => {
    navigate(`/payment/vnpay-return?vnp_ResponseCode=24&vnp_TxnRef=${bookingCode}&vnp_Amount=${amount * 100}`);
  };

  const banks = [
    { code: 'NCB', name: 'NCB (Test khuyên dùng)', popular: true },
    { code: 'VCB', name: 'Vietcombank', popular: false },
    { code: 'TCB', name: 'Techcombank', popular: false },
    { code: 'MB', name: 'MB Bank', popular: false },
    { code: 'BIDV', name: 'BIDV', popular: false },
    { code: 'CTG', name: 'VietinBank', popular: false },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* VNPay Header */}
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <div style={styles.vnpayBadge}>
              <span style={{ color: '#005BAA', fontWeight: 900, fontSize: '1.4rem' }}>VN</span>
              <span style={{ color: '#ED1C24', fontWeight: 900, fontSize: '1.4rem' }}>PAY</span>
              <span style={{ color: '#005BAA', fontWeight: 700, fontSize: '0.9rem', marginLeft: '4px' }}>QR</span>
            </div>
            <span style={styles.sandboxTag}>MÔI TRƯỜNG THỬ NGHIỆM (SANDBOX)</span>
          </div>

          <div style={styles.merchantInfo}>
            <div>
              <div style={styles.merchantLabel}>Đơn vị chấp nhận thanh toán:</div>
              <div style={styles.merchantName}>Khách Sạn Grand Aurora Luxury Hotel</div>
              <div style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '4px' }}>
                Ngân hàng thụ hưởng: <strong style={{ color: '#0F172A' }}>BIDV</strong> • Chủ TK: <strong style={{ color: '#0F172A' }}>NGUYEN THI YEN</strong> • STK: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>8861339506</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={styles.amountLabel}>Số tiền cọc cần thanh toán (50%):</div>
              <div style={styles.amountVal}>{amount.toLocaleString('vi-VN')} VNĐ</div>
            </div>
          </div>

          <div style={styles.orderSummaryBar}>
            <span>Mã đơn hàng: <strong>{bookingCode}</strong></span>
            <span>Thời gian chờ: <strong style={{ color: '#ED1C24' }}>{formatTimer(secondsLeft)}</strong></span>
          </div>
        </div>

        {/* Content Body */}
        <div style={styles.body}>
          {step === 1 && (
            <div>
              <div style={styles.tabsRow}>
                <button type="button" style={{ ...styles.tabBtn, ...styles.activeTabBtn }}>
                  💳 Thẻ nội địa & Tài khoản ngân hàng
                </button>
              </div>

              {/* Quick fill helper banner */}
              <div style={styles.quickFillBanner}>
                <div>
                  <strong>💡 Dữ liệu thẻ thử nghiệm có sẵn:</strong>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                    Thẻ NCB • Số: 9704198526191432198 • Tên: NGUYEN VAN A • Hạn: 07/15
                  </div>
                </div>
                <button type="button" style={styles.quickFillBtn} onClick={handleFillTestCard}>
                  ⚡ Điền nhanh thông tin
                </button>
              </div>

              {/* Ngân hàng grid */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={styles.inputLabel}>Chọn ngân hàng phát hành thẻ:</label>
                <div style={styles.bankGrid}>
                  {banks.map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      style={{
                        ...styles.bankItem,
                        ...(selectedBank === b.code ? styles.bankItemActive : {}),
                      }}
                      onClick={() => setSelectedBank(b.code)}
                    >
                      <span style={{ fontWeight: 700 }}>{b.code}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{b.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form nhập thông tin thẻ */}
              <form onSubmit={handleSubmitCard}>
                <div style={styles.formGroup}>
                  <label style={styles.inputLabel}>Số thẻ ngân hàng:</label>
                  <input
                    type="text"
                    style={styles.textInput}
                    value={cardNumber}
                    placeholder="9704 xxxx xxxx xxxx"
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={{ flex: 2 }}>
                    <label style={styles.inputLabel}>Tên chủ thẻ (Không dấu):</label>
                    <input
                      type="text"
                      style={styles.textInput}
                      value={cardHolder}
                      placeholder="NGUYEN VAN A"
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.inputLabel}>Ngày phát hành:</label>
                    <input
                      type="text"
                      style={styles.textInput}
                      value={issueDate}
                      placeholder="MM/YY (07/15)"
                      onChange={(e) => setIssueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={styles.btnRow}>
                  <button type="submit" style={styles.primaryBtn}>
                    Tiếp tục xác thực OTP →
                  </button>
                  <button type="button" style={styles.cancelBtn} onClick={handleCancelPayment}>
                    ✕ Hủy giao dịch
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📲</div>
              <h3 style={{ fontSize: '1.25rem', color: '#0F172A', marginBottom: '0.5rem' }}>
                Xác thực mã OTP thanh toán
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
                Mã xác thực giao dịch một lần (OTP) đã được gửi tới số điện thoại liên kết với thẻ <strong>{selectedBank}</strong>.
              </p>

              <div style={{ maxWidth: '320px', margin: '0 auto 1.5rem auto', textAlign: 'left' }}>
                <label style={styles.inputLabel}>Nhập mã OTP (Mặc định: 123456):</label>
                <input
                  type="text"
                  style={{ ...styles.textInput, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em', fontWeight: 700 }}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                />
                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setOtp('123456')}
                    style={{ background: 'none', border: 'none', color: '#005BAA', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                  >
                    Điền nhanh mã OTP: 123456
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  style={styles.primaryBtn}
                  disabled={processing}
                  onClick={handleConfirmOtp}
                >
                  {processing ? 'Đang xác thực giao dịch...' : '✓ Xác nhận Thanh Toán'}
                </button>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  disabled={processing}
                  onClick={() => setStep(1)}
                >
                  ← Quay lại
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={styles.footer}>
          <span>🔒 Giao dịch được bảo mật bởi VNPay 256-bit SSL encryption</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '85vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    background: '#F1F5F9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '680px',
    background: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    border: '1px solid #E2E8F0',
  },
  header: {
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #0A2540 0%, #1E3A8A 100%)',
    color: '#FFFFFF',
  },
  logoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  vnpayBadge: {
    background: '#FFFFFF',
    padding: '4px 12px',
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  sandboxTag: {
    background: '#FEE2E2',
    color: '#991B1B',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid #F87171',
  },
  merchantInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
    paddingTop: '1rem',
  },
  merchantLabel: {
    fontSize: '0.8rem',
    color: '#94A3B8',
  },
  merchantName: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#F8FAFC',
    marginTop: '2px',
  },
  amountLabel: {
    fontSize: '0.8rem',
    color: '#94A3B8',
  },
  amountVal: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: '#FDE047',
    marginTop: '2px',
  },
  orderSummaryBar: {
    display: 'flex',
    justifyContent: 'space-between',
    background: 'rgba(0, 0, 0, 0.25)',
    padding: '8px 14px',
    borderRadius: '6px',
    marginTop: '1rem',
    fontSize: '0.85rem',
    color: '#E2E8F0',
  },
  body: {
    padding: '1.75rem',
  },
  tabsRow: {
    display: 'flex',
    borderBottom: '2px solid #E2E8F0',
    marginBottom: '1.25rem',
  },
  tabBtn: {
    padding: '10px 18px',
    background: 'none',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#64748B',
  },
  activeTabBtn: {
    color: '#005BAA',
    borderBottom: '2px solid #005BAA',
    marginBottom: '-2px',
  },
  quickFillBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '1.25rem',
  },
  quickFillBtn: {
    background: '#005BAA',
    color: '#FFFFFF',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    marginLeft: '10px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px',
  },
  bankGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  bankItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    background: '#F8FAFC',
    border: '1px solid #CBD5E1',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  bankItemActive: {
    borderColor: '#005BAA',
    background: '#E0F2FE',
    color: '#0369A1',
    boxShadow: '0 0 0 1px #005BAA',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '1.25rem',
  },
  textInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '1.5rem',
  },
  primaryBtn: {
    flex: 2,
    background: '#ED1C24',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
  },
  secondaryBtn: {
    flex: 1,
    background: '#E2E8F0',
    color: '#334155',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    background: '#F1F5F9',
    color: '#64748B',
    border: '1px solid #CBD5E1',
    padding: '12px 14px',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  footer: {
    padding: '12px 18px',
    background: '#F8FAFC',
    borderTop: '1px solid #E2E8F0',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#64748B',
  },
};

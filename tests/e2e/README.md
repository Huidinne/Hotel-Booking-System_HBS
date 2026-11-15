# 🚀 Bộ Kiểm Thử Khép Kín Toàn Trình (End-to-End E2E Test Suite)

> **Mã công việc:** Task `[SP2-1109-TRUNG]`, `[SP2-1110-TRUNG]` & `[SP3-1112-TRUNG]`  
> **Người thực hiện:** Kỹ sư QA & DevOps — Nguyễn Việt Trung (`Vtrung_Tester`)  
> **Dự án:** Hotel Booking System (HBS) — Grand Aurora Luxury Hotel  
> **Báo cáo Sprint 2:** [`docs/testing/smoke-sprint2-report.md`](../../docs/testing/smoke-sprint2-report.md)  
> **Báo cáo Sprint 3 & Bug Report:** [`docs/testing/e2e-report.md`](../../docs/testing/e2e-report.md)

---

## 🗂️ 1. Cấu Trúc Thư Mục Bộ Test E2E

```text
tests/e2e/
├── config.js                       # BASE_URL, timeout, Mock/Sandbox flags & API Endpoints
├── runner.js                       # CLI Master Runner (Pass / Fail / Skipped + --suite filter)
├── README.md                       # Tài liệu hướng dẫn cấu hình và chạy test
├── fixtures/
│   └── test-data.json              # Dữ liệu mẫu kiểm thử (Users, Booking, Refund bank fixtures)
├── utils/
│   ├── api-client.js               # Fetch wrapper (JSON + Binary PDF), Suite tracker, state store
│   └── mock-providers.js           # Mock VNPay HMAC-SHA512 IPN signer, Mock Outbox & PDF validator
└── suites/
    ├── 01-auth.test.js             # Sprint 2: Register, Login, Token generation, GET /auth/me
    ├── 02-booking.test.js          # Sprint 2: Tra cứu phòng trống, Tạo booking, Đơn cá nhân
    ├── 03-audit.test.js            # Sprint 2: RBAC Audit endpoint, Audit actions & logs
    ├── 04-chat.test.js             # Sprint 2: Chatbot hỏi đáp & duy trì session
    ├── 05-booking-full-e2e.test.js # Sprint 3 Flow 1: Chat -> Booking -> VNPay/Mock -> Mail/PDF + @sandbox-manual
    ├── 06-timeline-checkin.test.js # Sprint 3 Flow 2: Room Timeline Matrix & Check-in gán phòng
    ├── 07-checkout-cleaning.test.js# Sprint 3 Flow 3: Check-out -> CLEANING -> AVAILABLE
    ├── 08-refund-ledger.test.js    # Sprint 3 Flow 4: Hủy cọc -> REFUND_PENDING -> REFUNDED & Sổ Cái
    └── 09-dashboard-audit.test.js  # Sprint 3 Flow 5: Dashboard KPI & Audit Trail 7 loại sự kiện
```

---

## ⚙️ 2. Cấu Hình Môi Trường & Tách Bạch CI Mock vs Sandbox Manual

| Biến môi trường / Cờ CLI | Mặc định | Giá trị CI | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `BASE_URL` | `http://localhost:8080` | `http://localhost:8080` | Địa chỉ Backend mục tiêu |
| `USE_MOCK_PROVIDERS` | `true` | `true` | Bật Mock Provider cho VNPay IPN & Async Email (`Mock-Email-Provider`), bỏ qua gọi mạng ngoài |
| `RUN_SANDBOX_MANUAL` / `--include-sandbox` | `false` | `false` | Khi `false` (hoặc `USE_MOCK_PROVIDERS=true`), các case gắn tag `@sandbox-manual` tự động đánh dấu `SKIPPED` |
| `CHECK_KNOWN_BUGS` / `--verify-bugs` | `false` | `false` | In chi tiết đối soát các bug đã ghi nhận trong quá trình chạy E2E |
| `VNPAY_HASH_SECRET` | `DEMO_HASH_SECRET` | `DEMO_HASH_SECRET` | Khóa ký HMAC-SHA512 cho môi trường test/mock cục bộ (không commit secret thật) |
| `--suite=05,06` | All (`01..09`) | All | Chạy chọn lọc từng suite theo mã |

---

## 🚀 3. Hướng Dẫn Thực Thi Qua Command Line

### 3.1. Chế Độ CI / Mock Mode (Khuyên dùng cho Automated Pipeline)
```bash
USE_MOCK_PROVIDERS=true node tests/e2e/runner.js
# Hoặc chạy qua script CI chuẩn:
USE_MOCK_PROVIDERS=true bash scripts/smoke_test.sh http://localhost:8080
```

### 3.2. Khởi Động Backend Độc Lập Bằng H2 E2E Mock Profile (Không cần MySQL ngoài)
```bash
# Terminal 1: Khởi chạy backend chế độ H2 in-memory + USE_MOCK_PROVIDERS=true
USE_MOCK_PROVIDERS=true ./backend/gradlew -p backend bootTestRun --args='--spring.profiles.active=e2e-mock'

# Terminal 2: Chạy toàn bộ 9 suite E2E
USE_MOCK_PROVIDERS=true node tests/e2e/runner.js --verify-bugs
```

### 3.3. Chế Độ Sandbox Manual (`@sandbox-manual` Active)
Chỉ kích hoạt khi QA kiểm thử thủ công trên máy có kết nối Internet và cấu hình cổng VNPay Sandbox / Brevo SMTP thật:
```bash
USE_MOCK_PROVIDERS=false RUN_SANDBOX_MANUAL=true node tests/e2e/runner.js --include-sandbox
```

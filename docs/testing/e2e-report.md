# 📋 Báo Cáo Kiểm Thử E2E Mở Rộng & Bug Report (Sprint 3)

> **Mã công việc:** Task `[SP3-1112-TRUNG]`  
> **Người thực hiện:** Kỹ sư QA & DevOps — Nguyễn Việt Trung (`Vtrung_Tester`)  
> **Ngày thực hiện:** `12/11/2026`  
> **Nhánh Git:** `Vtrung_Tester`  
> **Git Commit SHA gốc đo kiểm:** `c3f1628` (`git rev-parse --short HEAD`)  
> **Phạm vi kiểm thử:** Mở rộng bộ E2E (`tests/e2e/`) cho 5 luồng nghiệp vụ Sprint 3 + Tách biệt **CI Mock Mode** (`USE_MOCK_PROVIDERS=true`) vs **Sandbox Manual Tag** (`@sandbox-manual`)

---

## 📌 1. Thông Tin Phiên Kiểm Thử & Kiến Trúc Môi Trường

| Thông số | Chi tiết thực tế |
| :--- | :--- |
| **Ngày thực hiện** | `12/11/2026` |
| **Nhánh Git** | `Vtrung_Tester` |
| **Commit SHA** | `c3f1628` |
| **Backend Test Target** | `http://localhost:8080` (`spring.profiles.active=e2e-mock`, H2 MySQL-mode seeded qua [`E2eMockDataSeeder.java`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/test/java/org/example/backend/e2e/E2eMockDataSeeder.java)) |
| **Chế độ Mock Providers (CI)** | `USE_MOCK_PROVIDERS=true` (`app.mock-providers.enabled=true`): Mock VNPay IPN/Return HMAC-SHA512 (`DEMO_HASH_SECRET`), `GeminiStubClient`, và `Mock-Email-Provider` outbox (`/api/v1/test/email/mock-outbox`) |
| **Chế độ Sandbox Manual** | `RUN_SANDBOX_MANUAL=false` (tự động đánh dấu `SKIPPED` cho các case gắn tag `@sandbox-manual` khi chạy trên CI / chế độ mock) |
| **Lệnh chạy CLI** | `node tests/e2e/runner.js --verify-bugs` / `bash scripts/smoke_test.sh http://localhost:8080` |
| **Backend Unit & Integration** | `./backend/gradlew.bat -p backend test --no-daemon`: **33 suites, 242 tests — 0 failures, 0 errors, 0 skipped** |

### Kiến trúc phân tách môi trường CI Mock vs Sandbox Manual
1. **CI / Automated (`USE_MOCK_PROVIDERS=true`):**
   - **Thanh toán VNPay (`mock-providers.js`):** Dùng [`buildSignedVnPayCallbackQuery`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/utils/mock-providers.js#L25-L68) ký HMAC-SHA512 khớp `VnPayUtil.buildHashData` và gọi trực tiếp `GET /api/v1/payments/vnpay-ipn` & `/vnpay-return` nội bộ, không gọi ra mạng ngoài tới `sandbox.vnpayment.vn`.
   - **Email bất đồng bộ (`EmailServiceImpl.java`):** Khi `app.mock-providers.enabled=true` (từ env `USE_MOCK_PROVIDERS`), [`EmailServiceImpl.executeSendEmail`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/mail/service/EmailServiceImpl.java#L125-L150) bỏ qua kết nối SMTP tới `smtp-relay.brevo.com:587` và ghi nhận bản ghi email + metadata tệp đính kèm PDF vào bộ nhớ `mockOutbox` để bộ test truy vấn xác minh qua [`GET /api/v1/test/email/mock-outbox`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/mail/controller/EmailTestController.java#L137-L147).
   - **Sinh hóa đơn PDF & Chatbot:** `PdfInvoiceServiceImpl` (OpenPDF) và `GeminiStubClient` chạy nội bộ 100% không phụ thuộc Internet hay API Key bên ngoài.
2. **Sandbox Manual Tag (`@sandbox-manual`):**
   - Các ca test gọi cổng VNPay Sandbox thật và Brevo SMTP Gateway thật được gắn tag `@sandbox-manual` trong [`05-booking-full-e2e.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/05-booking-full-e2e.test.js#L123-L203).
   - Mặc định trên CI (`USE_MOCK_PROVIDERS=true` hoặc `RUN_SANDBOX_MANUAL=false`), hệ thống **tự động `SKIP`** với thông báo lý do rõ ràng. Khi QA kiểm thử thủ công có Internet & credentials thật, kích hoạt bằng:
     ```bash
     USE_MOCK_PROVIDERS=false RUN_SANDBOX_MANUAL=true node tests/e2e/runner.js --include-sandbox
     ```

---

## 🧪 2. Bảng Tổng Hợp Kết Quả Thực Thi E2E (41 Test Cases)

Kết quả thực thi trực tiếp phiên cuối (`runner.js --verify-bugs` trên profile `e2e-mock`, thời gian chạy: **4.21s**):

| STT | Suite | Nhóm nghiệp vụ | Tổng số case | Đạt (PASS) | Hỏng (FAIL) | Bỏ qua (SKIPPED) | Ghi chú |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | [`01-auth.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/01-auth.test.js) | Auth & Session (Sprint 2) | 4 | **4** | 0 | 0 | 100% Pass |
| **2** | [`02-booking.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/02-booking.test.js) | Booking cơ bản (Sprint 2) | 3 | **3** | 0 | 0 | Đã sửa mapping `roomTypeId` |
| **3** | [`03-audit.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/03-audit.test.js) | Audit cơ bản & RBAC (Sprint 2) | 4 | **4** | 0 | 0 | 100% Pass |
| **4** | [`04-chat.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/04-chat.test.js) | Chatbot cơ bản (Sprint 2) | 2 | **2** | 0 | 0 | 100% Pass |
| **5** | [`05-booking-full-e2e.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/05-booking-full-e2e.test.js) | **Chat -> Booking -> Sandbox/Mock -> Mail/PDF** | 8 | **6** | 0 | **2** | 2 case `@sandbox-manual` auto-skip |
| **6** | [`06-timeline-checkin.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/06-timeline-checkin.test.js) | **Vận hành Timeline & Check-in** | 6 | **6** | 0 | 0 | 100% Pass |
| **7** | [`07-checkout-cleaning.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/07-checkout-cleaning.test.js) | **Check-out -> CLEANING -> AVAILABLE** | 5 | **1** | **4** | 0 | Chặn bởi **`BUG-SP3-01` (HTTP 500)** |
| **8** | [`08-refund-ledger.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/08-refund-ledger.test.js) | **Hoàn tiền & Sổ Cái (Refund & Ledger)** | 5 | **4** | **1** | 0 | Thiếu `COUNTER_PAYMENT` do `BUG-SP3-01` |
| **9** | [`09-dashboard-audit.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/09-dashboard-audit.test.js) | **Quản trị Dashboard & Audit Trail** | 4 (+1 cảnh báo bug) | **4** | 0 | 0 | Phát hiện thêm **`BUG-SP3-02`** |
| **Tổng** | **9 Suites** | **Toàn bộ E2E Sprint 2 + Sprint 3** | **41** | **34** | **5** | **2** | **Exit code: `1` (do 5 case fail từ `BUG-SP3-01`)** |

> **Giải thích 2 ca `SKIPPED`:** Trong `USE_MOCK_PROVIDERS=true`, 2 ca kiểm thử gắn tag `@sandbox-manual` trong Suite 05 (gọi trực tiếp `https://sandbox.vnpayment.vn/` và gửi SMTP thật tới Brevo) được bỏ qua có chủ đích để đảm bảo pipeline CI không phụ thuộc mạng ngoài hay bị lộ/cần credentials thật.

### 2.1. Chi Tiết Kết Quả Từng Test Case

| Mã Case | Suite | Mô tả Test Case | Kết quả thực tế quan sát | Trạng thái |
| :--- | :---: | :--- | :--- | :---: |
| `E2E-01-01` | 01 | Đăng ký tài khoản Customer mới (`POST /api/v1/auth/register`) | HTTP `201`, nhận `accessToken` | 🟢 **PASS** |
| `E2E-01-02` | 01 | Đăng nhập cấp JWT Bearer Token (`POST /api/v1/auth/login`) | HTTP `200`, nhận `accessToken` | 🟢 **PASS** |
| `E2E-01-03` | 01 | Xác thực phiên làm việc (`GET /api/v1/auth/me`) | HTTP `200`, email khớp dynamic user | 🟢 **PASS** |
| `E2E-01-04` | 01 | Đăng nhập Quản trị viên Admin (`POST /api/v1/auth/login`) | HTTP `200`, cấp token `ROLE_ADMIN` | 🟢 **PASS** |
| `E2E-02-01` | 02 | Tra cứu danh sách loại phòng active (`GET /api/v1/room-types`) | HTTP `200`, trả về 3 loại phòng | 🟢 **PASS** |
| `E2E-02-02` | 02 | Tạo đơn đặt phòng (`POST /api/v1/bookings`) | HTTP `201`, sinh `BK-20261112-191012-2001` | 🟢 **PASS** |
| `E2E-02-03` | 02 | Kiểm tra đơn trong danh sách cá nhân (`GET /my-bookings`) | HTTP `200`, tìm thấy đơn vừa tạo | 🟢 **PASS** |
| `E2E-03-01` | 03 | Bảo mật RBAC Audit: Chặn Customer | HTTP `403 Forbidden` | 🟢 **PASS** |
| `E2E-03-02` | 03 | Tra cứu danh mục `AuditAction` (`GET /audit-logs/actions`) | HTTP `200`, trả về 11 danh mục | 🟢 **PASS** |
| `E2E-03-03` | 03 | Admin tra cứu nhật ký Audit Log (`GET /audit-logs`) | HTTP `200`, trả về danh sách log | 🟢 **PASS** |
| `E2E-03-04` | 03 | Xác minh log `CREATE_BOOKING` từ Suite 02 | Có log `CREATE_BOOKING: true` | 🟢 **PASS** |
| `E2E-04-01` | 04 | Gửi tin nhắn tư vấn cơ bản (`POST /chat/message`) | HTTP `200`, reply từ `GeminiStubClient` | 🟢 **PASS** |
| `E2E-04-02` | 04 | Hỏi phòng trống & duy trì `sessionId` hội thoại | HTTP `200`, giữ đúng `sessionId` | 🟢 **PASS** |
| `E2E-05-01` | 05 | Chat yêu cầu báo giá (`BOOKING_QUOTE`) | HTTP `200`, nhận `quoteId` (`provider=stub`) | 🟢 **PASS** |
| `E2E-05-02` | 05 | Chat tạo bản nháp đặt phòng (`BOOKING_DRAFT`) | HTTP `200`, nhận `draftId` gắn user | 🟢 **PASS** |
| `E2E-05-03` | 05 | Xác nhận Draft -> Booking `PENDING` + `paymentUrl` VNPay | HTTP `200`, sinh `BK-20261112-191012-2002` & chữ ký | 🟢 **PASS** |
| `E2E-05-04` | 05 | `[MOCK-PROVIDER]` Giả lập VNPay IPN & Return HMAC-SHA512 | `RspCode=00`, `bookingStatus=CONFIRMED`, `PARTIALLY_PAID` | 🟢 **PASS** |
| `E2E-05-05` | 05 | `@sandbox-manual` Gọi trực tiếp `sandbox.vnpayment.vn` | Tự động skip do `USE_MOCK_PROVIDERS=true` | 🟡 **SKIPPED** |
| `E2E-05-06` | 05 | Xuất hóa đơn PDF A4 (`GET /bookings/{code}/invoice-pdf`) | HTTP `200`, `application/pdf`, `%PDF-` (`36,542 B`) | 🟢 **PASS** |
| `E2E-05-07` | 05 | `[MOCK-PROVIDER]` Xác minh email + PDF trong Mock Outbox | Tìm thấy `Hoa_don_BK-20261112-191012-2002.pdf` (`36,542 B`) | 🟢 **PASS** |
| `E2E-05-08` | 05 | `@sandbox-manual` Gửi SMTP thật qua Brevo Gateway | Tự động skip do `USE_MOCK_PROVIDERS=true` | 🟡 **SKIPPED** |
| `E2E-06-01` | 06 | Đăng nhập Lễ tân (`ROLE_RECEPTIONIST`) | HTTP `200`, cấp token thành công | 🟢 **PASS** |
| `E2E-06-02` | 06 | Bảo mật RBAC Timeline: Chặn Customer | HTTP `403 Forbidden` | 🟢 **PASS** |
| `E2E-06-03` | 06 | Tạo đơn nhận phòng hôm nay & Lễ tân Confirm | HTTP `200`, `BK-20261112-191013-2003` -> `CONFIRMED` | 🟢 **PASS** |
| `E2E-06-04` | 06 | Tra cứu Timeline PMS & phòng vật lý `AVAILABLE` | Timeline có 4 phòng Deluxe, chọn phòng `201` (ID=`4`) | 🟢 **PASS** |
| `E2E-06-05` | 06 | Check-in gán phòng `201` & đồng bộ Timeline | Physical=`OCCUPIED`, Timeline cell=`CHECKED_IN` | 🟢 **PASS** |
| `E2E-06-06` | 06 | Negative check: Chặn Check-in lặp lại | HTTP `409 Conflict` | 🟢 **PASS** |
| `E2E-07-01` | 07 | Check-out đối soát (`POST /check-out`) | **HTTP `500`** (`Value too long for column response_code(20): 'COUNTER_CHECKOUT_CONFIRMED' (26)`) — **`BUG-SP3-01`** | 🔴 **FAIL** |
| `E2E-07-02` | 07 | Xác minh phòng tự động chuyển `CLEANING` sau Check-out | Phòng `201` (ID=`4`) vẫn ở `OCCUPIED` / `CHECKED_IN` do Check-out rollback | 🔴 **FAIL** |
| `E2E-07-03` | 07 | Negative check: Chặn chuyển sai quy trình -> `MAINTENANCE` | HTTP `400 Bad Request` | 🟢 **PASS** |
| `E2E-07-04` | 07 | Cập nhật dọn xong `CLEANING -> AVAILABLE` | Thất bại (`backAvailable=false`) vì phòng vẫn kẹt `OCCUPIED` | 🔴 **FAIL** |
| `E2E-07-05` | 07 | `[MOCK-PROVIDER]` Xác minh email quyết toán kèm PDF | Không tìm thấy `Hoa_don_quyet_toan_*.pdf` do Check-out lỗi 500 | 🔴 **FAIL** |
| `E2E-08-01` | 08 | Tạo đơn VNPAY (>=24h) & hoàn tất cọc 50% IPN (`DEPOSIT`) | `BK-20261112-191015-2004`, `deposit=500,000`, `RspCode=00` | 🟢 **PASS** |
| `E2E-08-02` | 08 | Khách hủy phòng >=24h -> `REFUND_PENDING`, hoàn 100% cọc | `penalty=0`, `refund=500,000`, `REFUND_PENDING` | 🟢 **PASS** |
| `E2E-08-03` | 08 | Lễ tân đối soát danh sách & xác nhận hoàn cọc -> `REFUNDED` | Masked=`**** **** 8877`, status=`REFUNDED` | 🟢 **PASS** |
| `E2E-08-04` | 08 | Bảo mật RBAC Sổ Cái Admin: Chặn Customer | HTTP `403 Forbidden` | 🟢 **PASS** |
| `E2E-08-05` | 08 | Xác minh Sổ Cái chứa đủ `DEPOSIT`, `COUNTER_PAYMENT`, `REFUND` | Có `DEPOSIT` (`1,450,000`) & `REFUND` (`500,000`), nhưng `counter=0` do Check-out ở Suite 07 rollback (`BUG-SP3-01`) | 🔴 **FAIL** |
| `E2E-09-01` | 09 | Bảo mật RBAC Dashboard Admin: Chặn Customer | HTTP `403 Forbidden` | 🟢 **PASS** |
| `E2E-09-02` | 09 | KPI Dashboard Summary khớp dòng tiền & trạng thái phòng | `totalPaid=1,450,000`, `refundTotal=500,000`, `netCashFlow=950,000`, `rooms=9/10` *(nhưng phát hiện `revenueSeries` tổng `1,450,000` -> `BUG-SP3-02`)* | 🟢 **PASS** |
| `E2E-09-03` | 09 | Biểu đồ doanh thu 12 tháng & cơ cấu loại phòng | HTTP `200`, đủ 12 tháng (`months=12`) | 🟢 **PASS** |
| `E2E-09-04` | 09 | Xác minh Audit Trail ghi nhận đủ 7 sự kiện toàn trình | Tìm thấy đủ 7/7 `AuditAction` trong 12 bản ghi | 🟢 **PASS** |

---

## 🐛 3. Danh Sách Bug Report Chi Tiết (5 Bugs Phát Hiện)

| Bug ID | Tiêu đề lỗi | Severity | Priority | Trạng thái | Owner dự kiến |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`BUG-SP3-01`** | Lỗi SQL Truncation `HTTP 500` khi Check-out đơn còn công nợ (`response_code` dài 26 > 20 ký tự) | **Critical / Blocker** | **P1** | 🔴 Open | `Ducanh_devBE` |
| **`BUG-SP3-02`** | Biểu đồ ngày `revenueSeries` trên Dashboard Admin tính sai `dayInflow` & `netCashFlow` khi có hoàn tiền (`REFUND`) | **High** | **P1** | 🔴 Open | `thanh_devBE` |
| **`BUG-SP3-03`** | `CheckOutResponse.amountPaid` trả về số tiền cũ trước check-out (50% cọc) thay vì tổng đã tất toán 100%, và `bookingId` bị `null` | **Medium** | **P2** | 🔴 Open | `Ducanh_devBE` |
| **`BUG-SP3-04`** | API hủy phòng không kiểm tra bắt buộc thông tin ngân hàng khi có hoàn cọc (`refundAmount > 0`) | **Medium** | **P2** | 🔴 Open | `Ducanh_devBE` |
| **`BUG-SP3-05`** | API gửi email hóa đơn trả `HTTP 200 OK` giả dù gửi SMTP thất bại trong `@Async` worker (khi tắt Mock Mode) | **Medium** | **P2** | 🔴 Open | `thanh_devBE` / `Ducanh_devBE` |

---

### 🔴 BUG-SP3-01: Lỗi HTTP 500 SQL Truncation khi Check-out đơn có số tiền còn phải thu (`remaining > 0`)

- **Severity / Priority:** `Critical (Blocker)` / `P1`
- **Thành phần ảnh hưởng:** [`BookingService.java#L519-L525`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/booking/service/BookingService.java#L519-L525) & [`PaymentTransaction.java#L59-L60`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/payment/entity/PaymentTransaction.java#L59-L60)
- **Owner dự kiến:** `Ducanh_devBE`
- **Steps to Reproduce:**
  1. Tạo booking thanh toán `CASH` (hoặc `VNPAY` đã cọc 50%), Lễ tân xác nhận đơn `CONFIRMED`.
  2. Lễ tân gọi `POST /api/v1/receptionist/bookings/{bookingId}/check-in` gán phòng vật lý thành công (`CHECKED_IN`).
  3. Lễ tân gọi `POST /api/v1/receptionist/bookings/{bookingId}/check-out` để tất toán phần tiền còn lại (`remaining > 0`).
- **Input Data:**
  - Booking `BK-20261112-191013-2003` (`paymentMethod = CASH`, `totalPrice = 1,900,000 VND`, `totalPaid = 0`, `remaining = 1,900,000 VND`).
- **Expected Result:**
  - Trả về `HTTP 200 OK`, ghi bút toán `COUNTER_PAYMENT` vào `payment_transactions`, chuyển booking sang `CHECKED_OUT` / `FULLY_PAID`, chuyển phòng vật lý sang `CLEANING` và gửi email quyết toán.
- **Actual Result:**
  - Server trả về **`HTTP 500 Internal Server Error`**, rollback toàn bộ giao dịch Check-out. Phòng vẫn kẹt ở `OCCUPIED`, không ghi nhận thu tiền tại quầy vào Sổ Cái và không gửi được email quyết toán.
- **Log / Payload chứng minh (quan sát trực tiếp khi chạy E2E Suite 07):**
  ```text
  WARN  --- o.h.engine.jdbc.spi.SqlExceptionHelper : SQL Error: 22001, SQLState: 22001
  ERROR --- o.h.engine.jdbc.spi.SqlExceptionHelper : Value too long for column "response_code CHARACTER VARYING(20)": "'COUNTER_CHECKOUT_CONFIRMED' (26)"; SQL statement:
  insert into payment_transactions (actor_email,amount,booking_id,created_at,expires_at,payment_method,reference_note,response_code,status,transaction_code,transaction_time,type,vnp_transaction_no,id) values (?,?,?,?,?,?,?,?,?,?,?,?,?,default) [22001-224]
  ```
- **Nguyên nhân & Đề xuất sửa:**
  - Cột `payment_transactions.response_code` có độ dài tối đa `VARCHAR(20)` nhưng `BookingService.checkOut()` L520 gán chuỗi `"COUNTER_CHECKOUT_CONFIRMED"` (**26 ký tự**). Đề xuất đổi thành `"COUNTER_CONFIRMED"` (17 ký tự, đồng nhất với [`PaymentService.recordCounterPayment`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/payment/service/PaymentService.java#L434)) hoặc tạo Flyway migration tăng độ dài `response_code`.

---

### 🟠 BUG-SP3-02: Biểu đồ `revenueSeries` hàng ngày cộng nhầm giao dịch `REFUND` vào dòng tiền vào (`dayInflow`)

- **Severity / Priority:** `High` / `P1`
- **Thành phần ảnh hưởng:** [`DashboardService.java#L258-L276`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/dashboard/service/DashboardService.java#L258-L276)
- **Owner dự kiến:** `thanh_devBE`
- **Steps to Reproduce:**
  1. Trong cùng kỳ báo cáo (ví dụ hôm nay), phát sinh cọc VNPay (`DEPOSIT`, `+500,000`) và hoàn tiền (`REFUND`, `-500,000`) qua `POST /api/v1/receptionist/refunds/{id}/confirm` + đơn chat cọc `+950,000`.
  2. Admin gọi `GET /api/v1/admin/dashboard/summary?dateFrom=2026-11-01&dateTo=2026-11-30`.
  3. Đối chiếu `summary.netCashFlow` với tổng $\sum \text{revenueSeries}[i].\text{netCashFlow}$.
- **Expected Result:**
  - `sum(revenueSeries[].netCashFlow)` phải bằng `summary.netCashFlow` (`950,000 VND`), vì giao dịch `REFUND` không phải tiền thu vào (`dayInflow`).
- **Actual Result:**
  - `summary.totalPaid = 1,450,000`, `summary.refundTotal = 500,000`, `summary.netCashFlow = 950,000`.
  - Nhưng **`sum(revenueSeries[].netCashFlow) = 1,450,000`** (lệch dương `+500,000 VND`) do dòng 259 lọc `periodTxns` không loại trừ `pt.getType() != REFUND` (dù tổng KPI ở dòng 188 có lọc!). Đồng thời dòng 260 dùng `t.getCreatedAt()` thay vì `COALESCE(t.getTransactionTime(), t.getCreatedAt())` như câu query gốc ở dòng 182.
- **Log chứng minh (từ `runner.js --verify-bugs` Suite 09):**
  ```text
  WARN  BUG-SP3-02 reproduced -> seriesNetSum=1450000 != summary.netCashFlow=950000
  PASS  Xác minh KPI Admin Dashboard Summary khớp dòng tiền ... (totalPaid=1450000, refundTotal=500000, netCashFlow=950000, rooms=9/10, seriesPoints=30)
  ```

---

### 🟡 BUG-SP3-03: `CheckOutResponse.amountPaid` trả thiếu khoản tiền vừa thu tại quầy và `bookingId` bị `null`

- **Severity / Priority:** `Medium` / `P2`
- **Thành phần ảnh hưởng:** [`BookingService.java#L549-L557`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/booking/service/BookingService.java#L549-L557)
- **Owner dự kiến:** `Ducanh_devBE`
- **Steps to Reproduce:**
  1. Kiểm tra mã nguồn `BookingService.checkOut()` (sau khi sửa `BUG-SP3-01` để check-out chạy thông).
  2. Thực hiện check-out một booking `CONFIRMED` đang có `totalPrice = 1,900,000`, đã cọc `totalPaid = 950,000`, `remaining = 950,000`.
- **Expected Result:**
  - Sau khi thu `remaining` và đặt `paymentStatus = FULLY_PAID`, response `CheckOutResponse` phải trả `bookingId != null` và `amountPaid = totalPaid + remaining` (`1,900,000`).
- **Actual Result:**
  - Line 549-557 không gọi `.bookingId(booking.getId())` (`bookingId = null`) và gán `.amountPaid(totalPaid)` lấy biến `totalPaid` **trước** lúc ghi bút toán thu quầy (`950,000` thay vì `1,900,000`), gây mâu thuẫn với `paymentStatus: "FULLY_PAID"` trên UI Lễ tân.

---

### 🟡 BUG-SP3-04: API Hủy phòng cho phép chuyển `REFUND_PENDING` với thông tin ngân hàng trống (`null`)

- **Severity / Priority:** `Medium` / `P2`
- **Thành phần ảnh hưởng:** [`CancelBookingRequest.java`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/booking/dto/CancelBookingRequest.java) & [`BookingService.java#L340-L347`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/booking/service/BookingService.java#L340-L347)
- **Owner dự kiến:** `Ducanh_devBE`
- **Steps to Reproduce:**
  1. Tạo đơn VNPAY với `checkIn` cách hiện tại `>= 24h`, thanh toán cọc qua IPN.
  2. Gọi `POST /api/v1/bookings/{bookingCode}/cancel` với payload thiếu thông tin ngân hàng:
     `{ "reason": "Khong di nua", "bankName": null, "accountNumber": null, "accountHolder": null }`.
- **Expected Result:**
  - Khi `refundAmount > 0`, backend phải validate bắt buộc có `bankName`, `accountNumber`, `accountHolder` (trả về `HTTP 400 Bad Request` nếu rỗng/null).
- **Actual Result:**
  - `CancelBookingRequest` chỉ validate `@NotBlank` trên `reason`. `BookingService.cancelBooking()` vẫn chấp nhận và chuyển booking sang `REFUND_PENDING` với số tài khoản `null` (`accountNumberMasked = "****"` trên màn hình Lễ tân), khiến Lễ tân không có thông tin chuyển khoản hoàn tiền.

---

### 🟡 BUG-SP3-05: API gửi Email hóa đơn trả `HTTP 200 OK` giả khi SMTP thật thất bại trong luồng `@Async`

- **Severity / Priority:** `Medium` / `P2`
- **Thành phần ảnh hưởng:** [`BookingInvoiceController.java#L144-L165`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/booking/controller/BookingInvoiceController.java#L144-L165) & [`EmailServiceImpl.java#L170-L185`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/mail/service/EmailServiceImpl.java#L170-L185)
- **Owner dự kiến:** `thanh_devBE` / `Ducanh_devBE`
- **Steps to Reproduce:**
  1. Khởi chạy backend với `USE_MOCK_PROVIDERS=false` và không cấu hình `SPRING_MAIL_USERNAME`/`SPRING_MAIL_PASSWORD`.
  2. Gọi `POST /api/v1/bookings/{bookingCode}/send-invoice-email` cho đơn `CONFIRMED`.
- **Expected Result:**
  - Hoặc trả `202 Accepted` nêu rõ "đã đưa vào hàng đợi gửi" kèm trạng thái kiểm tra cấu hình SMTP, hoặc trả lỗi `503 Service Unavailable` nếu SMTP credentials chưa được cấu hình.
- **Actual Result:**
  - Controller bắt exception không có tác dụng (vì `emailService.sendBookingConfirmationEmail` chạy `@Async` trên `mail-async-*` và tự nuốt `MessagingException`), luôn trả ngay `HTTP 200 OK` với thông điệp *"Hóa đơn điện tử đã được gửi thành công đến email..."* dù SMTP fail ngầm.

---

## 🛠️ 4. Danh Sách Tệp Đã Triển Khai & Tích Hợp CI

1. **Bộ kiểm thử E2E mở rộng (`tests/e2e/`):**
   - [`tests/e2e/config.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/config.js): Bổ sung endpoints Sprint 3, biến `USE_MOCK_PROVIDERS`, `RUN_SANDBOX_MANUAL`, `CHECK_KNOWN_BUGS`.
   - [`tests/e2e/utils/api-client.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/utils/api-client.js): Thêm `getBuffer()` kiểm tra binary PDF, `createSuiteTracker()` hỗ trợ `PASS / FAIL / SKIPPED`.
   - [`tests/e2e/utils/mock-providers.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/utils/mock-providers.js): Mock VNPay HMAC-SHA512 IPN Signer, Mock Outbox poller, PDF `%PDF-` validator.
   - [`tests/e2e/suites/05-booking-full-e2e.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/05-booking-full-e2e.test.js) .. [`09-dashboard-audit.test.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/suites/09-dashboard-audit.test.js): 5 luồng nghiệp vụ Sprint 3.
   - [`tests/e2e/runner.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/runner.js), [`tests/e2e/fixtures/test-data.json`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/fixtures/test-data.json), [`tests/e2e/README.md`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/README.md).
2. **Hỗ trợ Mock Providers Backend & E2E H2 Profile:**
   - [`application.yaml`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/resources/application.yaml): Thêm `app.mock-providers.enabled: ${USE_MOCK_PROVIDERS:false}`.
   - [`EmailService.java`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/mail/service/EmailService.java), [`EmailServiceImpl.java`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/mail/service/EmailServiceImpl.java), [`EmailTestController.java`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/mail/controller/EmailTestController.java), [`EmailServiceTest.java`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/test/java/org/example/backend/mail/EmailServiceTest.java).
   - [`application-e2e-mock.yaml`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/test/resources/application-e2e-mock.yaml) & [`E2eMockDataSeeder.java`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/backend/src/test/java/org/example/backend/e2e/E2eMockDataSeeder.java).
3. **Scripts & CI Pipeline:**
   - [`scripts/smoke_test.sh`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/smoke_test.sh), [`scripts/smoke_test.ps1`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/smoke_test.ps1), [`.github/workflows/ci.yml`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/.github/workflows/ci.yml).

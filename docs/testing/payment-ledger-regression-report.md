# BÁO CÁO KIỂM THỬ GHI NHẬN DÒNG TIỀN & TRUY VẤN SỔ CÁI (PAYMENT LEDGER)

> **Mã công việc:** `[SP3-1111-ANH] [Payment] 11/11 | Đức Anh | Ghi nhận dòng tiền và truy vấn ledger (6h)`  
> **Người thực hiện:** Nguyễn Đức Anh — Backend  
> **Nhánh thực hiện:** `Ducanh_devBE`  
> **Thời điểm kiểm thử:** 2026-11-11 14:52:00 (Asia/Bangkok, UTC+7)  
> **Tiêu chuẩn đối soát:** SRS §FR-19 (Extended Payment & Refund Ledger), §FR-19.1, §FR-19.2, §FR-19.3, §NFR-08, §NFR-09

---

## 1. MỤC TIÊU & TIÊU CHÍ NGHIỆM THU

### 1.1. Mục tiêu
Hiện thực hóa cơ chế ghi nhận 3 luồng dòng tiền thực tế vào `payment_transactions`, xây dựng API truy vấn Sổ Cái (`GET /api/v1/admin/payment-ledger`) và bàn giao nguồn dữ liệu giao dịch chuẩn xác cho Thành (Dashboard).

### 1.2. Tiêu chí nghiệm thu đã kiểm chứng
1. **Ghi đúng thời điểm thực tế (`transactionTime`):** Neo theo thời điểm phát sinh thực tế của giao dịch (chênh lệch $< 5s$ so với thời gian máy chủ), tuyệt đối không bịa timestamp cũ hay lấy ngày tạo booking.
2. **Không suy đoán thu quầy từ giá booking:** Bút toán thu quầy được ghi nhận từ thao tác Lễ tân xác nhận thu tiền (`RecordCounterPaymentRequest` hoặc lúc Check-out), lưu bản ghi `PaymentTransaction` loại `COUNTER_PAYMENT` có `actorEmail` và `referenceNote`.
3. **Idempotency chống double count:** Callback IPN từ VNPay khi gửi lặp lại lần 2 được nhận diện và trả về `RspCode: 02` (Order already confirmed), không ghi đè và không nhân đôi số tiền.
4. **Bút toán hoàn tiền (`REFUND`):** Khi Lễ tân bấm `confirmRefund`, hệ thống tự động ghi 1 bản ghi `PaymentTransaction` loại `REFUND` có số tiền hoàn, phương thức `BANK_TRANSFER`, thời điểm thực hiện và ghi chú ủy nhiệm chi.
5. **Dòng tiền thực thu (Net Cash Flow - SRS §FR-19.2):**
   $$\text{Dòng tiền thực thu} = \sum \text{Cọc VNPay} + \sum \text{Thu quầy (Tiền mặt + Chuyển khoản)} - \sum \text{Đã hoàn tiền}$$

---

## 2. KIẾN TRÚC & MÃ NGUỒN TRIỂN KHAI

### 2.1. Cơ sở Dữ liệu & Entity
- **Migration Flyway `V4__add_payment_ledger_fields.sql`:**
  - Bổ sung các cột `type` (`DEPOSIT`, `COUNTER_PAYMENT`, `REFUND`, `ADDITIONAL_SERVICE`), `reference_note`, `actor_email` và các chỉ mục `idx_trans_type_time`, `idx_trans_status_time`.
- **Entity [`PaymentTransaction.java`](file:///c:/Users/OS/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/payment/entity/PaymentTransaction.java):**
  - Ánh xạ đầy đủ `PaymentTransactionType`, `referenceNote`, `actorEmail`.
- **Repository [`PaymentTransactionRepository.java`](file:///c:/Users/OS/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/payment/repository/PaymentTransactionRepository.java):**
  - Kế thừa `JpaSpecificationExecutor<PaymentTransaction>`.
  - Bổ sung `findSuccessfulTransactionsByTimeBetween(startDateTime, endDateTime)` dùng cho Sổ Cái và Dashboard.

### 2.2. Nghiệp Vụ Xử Lý Dòng Tiền ([`PaymentService.java`](file:///c:/Users/OS/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/payment/service/PaymentService.java))
- `processIpn`: Ghi nhận cọc thành công, kiểm tra idempotent trả `02` nếu đã confirmed.
- `recordCounterPayment`: Lễ tân thu tiền mặt/POS tại quầy, cập nhật booking status (`PARTIALLY_PAID` / `FULLY_PAID`).
- `confirmRefund`: Ghi nhận bút toán `REFUND` với mã ủy nhiệm chi.
- `getPaymentLedger`: Tra cứu phân trang kèm bộ lọc động `PaymentLedgerSpecification`.
- `getLedgerSummary`: Tính toán dòng tiền ròng theo công thức SRS §FR-19.2.

### 2.3. Bàn Giao Nguồn Dữ Liệu Cho Thành ([`DashboardService.java`](file:///c:/Users/OS/Hotel-Booking-System_HBS/backend/src/main/java/org/example/backend/dashboard/service/DashboardService.java))
- Cập nhật hàm tính toán dòng tiền thực thu của Dashboard để sử dụng `findSuccessfulTransactionsByTimeBetween`:
  - Phân tách rõ ràng giữa `depositAndCounterTotal` và `refundTxnTotal`.
  - Số liệu thực thu của Dashboard khớp 100% với Sổ Cái của Kế toán.

---

## 3. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (TEST EVIDENCE)

### 3.1. Danh Sách Test Cases ([`PaymentLedgerIntegrationTest.java`](file:///c:/Users/OS/Hotel-Booking-System_HBS/backend/src/test/java/org/example/backend/payment/PaymentLedgerIntegrationTest.java))

| STT | Tên Test Case | Điều kiện kiểm thử | Kết quả mong đợi | Trạng thái |
|:---:|---|---|---|:---:|
| **1** | `testVnPayIpnDepositAndIdempotency` | Gọi IPN lần 1 thành công (00), sau đó gọi lại IPN lần 2 với cùng mã | Lần 1 `SUCCESS` timestamp mới; Lần 2 trả `02`, không nhân đôi tiền | ✅ **PASSED** |
| **2** | `testRecordCounterPayment` | Lễ tân thu tiền mặt 1.000.000 VNĐ tại quầy khi Check-out | Tạo `COUNTER_PAYMENT`, `transactionTime` hiện tại, booking `FULLY_PAID` | ✅ **PASSED** |
| **3** | `testConfirmRefundRecordsRefundTransaction` | Lễ tân chuyển khoản hoàn cọc 700.000 VNĐ cho đơn hủy | Sinh bút toán `REFUND`, method `BANK_TRANSFER`, mã ủy nhiệm chi | ✅ **PASSED** |
| **4** | `testGetPaymentLedgerAndSummary` | Tạo 1 cọc (1.5M) + 1 thu quầy (1.5M) - 1 hoàn tiền (0.5M) | `netCashFlow = 2.500.000`, `totalElements = 3` | ✅ **PASSED** |
| **5** | `testInvalidDateRangeThrowsBadRequest` | Gọi API với `startDate = 2026-11-15 > endDate = 2026-11-10` | Trả về `HTTP 400 Bad Request`, message tiếng Việt chuẩn | ✅ **PASSED** |
| **6** | `testRbacPermissions` | Admin (200), Receptionist vào sổ cái (403), Customer thu quầy (403) | Phân quyền RBAC bảo mật tuyệt đối | ✅ **PASSED** |

### 3.2. Bằng Chứng Chạy Gradle Test
```text
> Task :compileJava UP-TO-DATE
> Task :processResources UP-TO-DATE
> Task :classes UP-TO-DATE
> Task :compileTestJava UP-TO-DATE
> Task :processTestResources UP-TO-DATE
> Task :testClasses UP-TO-DATE
> Task :test

BUILD SUCCESSFUL in 26s
5 actionable tasks: 1 executed, 4 up-to-date
```
- **Tổng số test:** 6/6 test cases của `PaymentLedgerIntegrationTest` đạt 100%.
- **Hồi quy toàn diện:** Chạy cùng lúc với `PaymentIntegrationTest`, `BookingConcurrencyAuditRegressionTest` và `AuditLogIntegrationTest` đều đạt `BUILD SUCCESSFUL`.

---

## 4. KẾT LUẬN & BÀN GIAO SPRINT 3
- Toàn bộ tiêu chí nghiệm thu của thẻ `[SP3-1111-ANH]` đã được kiểm chứng và hoàn thành xuất sắc.
- Nguồn dữ liệu giao dịch sạch, minh bạch, có cơ chế chống double count và đúng timestamp thực tế đã sẵn sàng bàn giao cho Thành tích hợp giao diện Dashboard.

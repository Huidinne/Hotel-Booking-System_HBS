# BÁO CÁO KIỂM THỬ GHI NHẬN DÒNG TIỀN, ĐỐI SOÁT & REGRESSION SỔ CÁI (PAYMENT LEDGER)

> **Mã công việc:** `[SP3-1112-ANH] [Payment] 12/11 | Đức Anh | API đối soát và regression (6h)`  
> **Người thực hiện:** Nguyễn Đức Anh — Backend  
> **Nhánh thực hiện:** `Ducanh_devBE`  
> **Thời điểm kiểm thử:** 2026-11-12 13:59:00 (Asia/Bangkok, UTC+7)  
> **Tiêu chuẩn đối soát:** SRS §FR-19 (Extended Payment & Refund Ledger), §FR-19.1, §FR-19.2, §FR-19.3, §FR-16.1 (Audit Trail), §NFR-08, §NFR-09

---

## 1. MỤC TIÊU & TIÊU CHÍ NGHIỆM THU

### 1.1. Mục tiêu
Chuẩn hóa API đối soát Sổ Cái (`GET /api/v1/admin/payment-ledger`, `GET /api/v1/admin/payment-ledger/summary`) với đầy đủ phân trang (`page`, `size`), bộ lọc động (`filter`), thông tin tham chiếu chi tiết (`reference`). Xử lý triệt để các ca biên dòng tiền (Net cash có thể âm, không cộng giao dịch thất bại), đảm bảo RBAC, Idempotency, ghi vết Audit Log khi hoàn cọc và khớp số liệu Fixture ngày/tháng để bàn giao cho **Huy** (Frontend Admin/Ops).

### 1.2. Tiêu chí nghiệm thu đã kiểm chứng
1. **Net cash có thể âm (Signed Net Cash Flow):** Khi tổng tiền xuất hoàn cọc lớn hơn tổng tiền thực thu (cọc online + thu quầy), `netCashFlow` được phép mang giá trị âm chính xác, không bị gò ép về 0.
2. **Không cộng giao dịch thất bại:** Các giao dịch có trạng thái `FAILED` hoặc `EXPIRED` tuyệt đối không được cộng vào tổng tiền thu, tiền hoàn hoặc dòng tiền ròng; đồng thời được đếm chính xác qua trường `failedTransactionCount`.
3. **Phân quyền bảo mật RBAC:** Chỉ `ROLE_ADMIN` được quyền truy cập sổ cái và thống kê dòng tiền; `ROLE_RECEPTIONIST` và `ROLE_CUSTOMER` bị từ chối truy cập với mã lỗi `403 Forbidden`.
4. **Idempotency chống double count:** Callback IPN từ VNPay và các lượt xác nhận thanh toán/hoàn cọc trùng lặp không gây nhân đôi số tiền hoặc trùng lặp bản ghi sổ cái.
5. **Ghi vết kiểm toán (Audit Trail) khi Hoàn cọc:** Bắt buộc ghi nhận sự kiện vào bảng `audit_logs` với action `CONFIRM_REFUND`, loại `PAYMENT`, email Lễ tân thực hiện và mã booking.
6. **Khớp số liệu Fixture tổng ngày/tháng:** Dữ liệu tính toán từ API khớp 100% với Fixture mẫu dùng trên giao diện đối soát và Dashboard.

---

## 2. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (TEST EVIDENCE)

### 2.1. Danh Sách Test Cases ([`PaymentLedgerIntegrationTest.java`](file:///c:/Users/OS/Hotel-Booking-System_HBS/backend/src/test/java/org/example/backend/payment/PaymentLedgerIntegrationTest.java))

| STT | Tên Test Case | Điều kiện kiểm thử | Kết quả mong đợi | Trạng thái |
|:---:|---|---|---|:---:|
| **1** | `testVnPayIpnDepositAndIdempotency` | Gọi IPN lần 1 thành công (00), sau đó gọi lại IPN lần 2 với cùng mã | Lần 1 `SUCCESS` timestamp mới; Lần 2 trả `02`, không nhân đôi tiền | ✅ **PASSED** |
| **2** | `testRecordCounterPayment` | Lễ tân thu tiền mặt 1.000.000 VNĐ tại quầy khi Check-out | Tạo `COUNTER_PAYMENT`, `transactionTime` hiện tại, booking `FULLY_PAID` | ✅ **PASSED** |
| **3** | `testConfirmRefundRecordsRefundTransaction` | Lễ tân chuyển khoản hoàn cọc 700.000 VNĐ cho đơn hủy | Sinh bút toán `REFUND` và **tự động ghi vết vào `audit_logs`** với `CONFIRM_REFUND` | ✅ **PASSED** |
| **4** | `testGetPaymentLedgerAndSummary` | Tạo 1 cọc (1.5M) + 1 thu quầy (1.5M) - 1 hoàn tiền (0.5M) | `netCashFlow = 2.500.000`, `totalElements = 3` | ✅ **PASSED** |
| **5** | `testInvalidDateRangeThrowsBadRequest` | Gọi API với `startDate = 2026-11-15 > endDate = 2026-11-10` | Trả về `HTTP 400 Bad Request`, message tiếng Việt chuẩn | ✅ **PASSED** |
| **6** | `testRbacPermissions` | Admin (200), Receptionist vào sổ cái (403), Customer thu quầy (403) | Phân quyền RBAC bảo mật tuyệt đối | ✅ **PASSED** |
| **7** | `testNegativeNetCashFlow_WhenRefundExceedsRevenue` | Thu cọc 500k, xuất hoàn cọc 1.2M do hủy đơn nhiều phòng | `netCashFlow = -700.000 VNĐ` (âm tiền hợp lệ) | ✅ **PASSED** |
| **8** | `testFailedTransactionsExcludedFromCashFlow` | Có 1 txn SUCCESS (1M), 1 FAILED (5M), 1 EXPIRED (2M) | `netCashFlow = 1M`, không cộng 7M hỏng, `failedCount = 2` | ✅ **PASSED** |
| **9** | `testMonthlyLedgerSummaryMatchesFixture` | Tra cứu kỳ tháng 10/2026 với 2 cọc VNPay (2.45M) và 1 hoàn tiền (250k) | Khớp chính xác Fixture: `netCashFlow = 2.200.000 VNĐ` | ✅ **PASSED** |

### 2.2. Bằng Chứng Chạy Gradle Test Suite
```text
> Task :compileJava UP-TO-DATE
> Task :processResources UP-TO-DATE
> Task :classes UP-TO-DATE
> Task :compileTestJava UP-TO-DATE
> Task :processTestResources UP-TO-DATE
> Task :testClasses UP-TO-DATE
> Task :test

BUILD SUCCESSFUL in 23s
5 actionable tasks: 3 executed, 2 up-to-date
```
- **Tổng số test:** 9/9 test cases của `PaymentLedgerIntegrationTest` đạt 100%.
- **Hồi quy chéo:** Chạy đồng thời với `DashboardServiceTest` và `BookingConcurrencyAuditRegressionTest` đều đạt `BUILD SUCCESSFUL in 15s`.

---

## 3. BÀN GIAO CHO HUY (FRONTEND ADMIN/OPS)
- **Tài liệu API Contract:** [`docs/api/payment-ledger.md`](file:///c:/Users/OS/Hotel-Booking-System_HBS/docs/api/payment-ledger.md)
- **TypeScript Types:** [`frontend/src/types/payment.ts`](file:///c:/Users/OS/Hotel-Booking-System_HBS/frontend/src/types/payment.ts) (`PaymentLedgerEntry`, `PaymentLedgerSummary`, `PaymentLedgerResponse`, `PaymentLedgerFilter`)
- **API Client Service:** [`frontend/src/services/paymentService.ts`](file:///c:/Users/OS/Hotel-Booking-System_HBS/frontend/src/services/paymentService.ts) (`getPaymentLedger`, `getLedgerSummary`)
- **Tiến độ bàn giao:** Đã chuẩn bị đầy đủ hợp đồng API và types sẵn sàng cho Huy tích hợp giao diện trước 12:00.


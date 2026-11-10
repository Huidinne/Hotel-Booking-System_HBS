# API Contract: Sổ Cái Thanh Toán & Đối Soát Giao Dịch (Payment Ledger API)

> **Mã tính năng:** `FR-19: Mở rộng Thanh toán & Sổ cái Hoàn cọc (Extended Payment & Refund Ledger)`  
> **Phiên bản:** MVP 1.0  
> **Người phụ trách:** Nguyễn Đức Anh (Backend) — Bàn giao cho Huy (PM) & Thành (Dashboard)  
> **Nhánh triển khai:** `Ducanh_devBE`  
> **Quyền truy cập:**
> - Tra cứu Sổ Cái & Báo cáo dòng tiền: `ROLE_ADMIN`
> - Ghi nhận thu tiền tại quầy & Xác nhận hoàn tiền: `ROLE_RECEPTIONIST`, `ROLE_ADMIN`

---

## 1. Mục Đích Nghiệp Vụ & Nguyên Tắc Sổ Cái

### 1.1. Mục đích nghiệp vụ (SRS §FR-19)
- **FR-19.1 (Sổ cái Đối soát Giao dịch):** Quản lý chi tiết từng lượt giao dịch tiền phát sinh thực tế: tiền cọc online qua VNPay Sandbox (50%), thanh toán tiền mặt/chuyển khoản tại quầy Lễ tân khi Check-in / Check-out, và các khoản xuất chuyển khoản hoàn tiền cọc (REFUND).
- **FR-19.2 (Minh bạch Luồng Tiền):** Tính toán dòng tiền ròng (Net Cash Flow) độc lập với doanh thu kế toán dồn tích (Accrual Revenue):
  $$\text{Dòng tiền thực thu} = \text{Tổng tiền cọc online} + \text{Tổng tiền thu tại quầy} - \text{Tổng tiền đã hoàn cọc}$$
- **FR-19.3 (Cơ chế Đối soát Idempotent Đa kênh):** Đảm bảo không trùng lặp khi ghi nhận thanh toán bổ sung khi khách dùng thêm dịch vụ trong thời gian lưu trú hoặc thanh toán nhiều đợt.

### 1.2. NGUYÊN TẮC CỐT LÕI (Tiêu chí nghiệm thu SP2-1110-ANH)
> ⚠️ **TIÊU CHÍ BẮT BUỘC TỪ PM:**  
> *"Contract xác định cọc + thu quầy - hoàn tiền và nguồn thời điểm giao dịch; **tuyệt đối không suy đoán thu quầy từ giá booking**."*

Hệ thống áp dụng 4 nguyên tắc kế toán dòng tiền nghiêm ngặt sau:

1. **Nguồn Thời Điểm Giao Dịch Thực Tế (`transactionTime`):**
   - Mọi dòng bút toán trong Sổ Cái phải được neo theo **thời điểm thực tế giao dịch phát sinh** (`transaction_time` hoặc `created_at` trong bảng `payment_transactions`).
   - Tuyệt đối **không** dùng ngày tạo booking (`booking.created_at`) để làm mốc thời gian cho khoản tiền thu tại quầy lúc Check-in hoặc Check-out (vốn xảy ra sau đó nhiều ngày hoặc nhiều tuần).

2. **KHÔNG SUY ĐOÁN THU QUẦY TỪ GIÁ BOOKING:**
   - Tuyệt đối **không** áp dụng công thức suy diễn ảo: $\text{Tiền thu quầy} = \text{booking.total_price} - \text{deposit_amount}$.
   - Lý do: Khách có thể thanh toán từng phần, phát sinh thêm dịch vụ phụ thu, được áp voucher giảm giá, hoặc chưa thanh toán hết lúc check-in. Nếu tự động trừ lùi từ giá trị booking sẽ gây lệch số liệu kiểm toán tiền mặt trong két của Lễ tân.
   - **Quy tắc:** Chỉ ghi nhận số tiền thu quầy khi Lễ tân thao tác tạo bản ghi giao dịch thực tế (`PaymentTransaction` với `paymentMethod = CASH` hoặc `BANK_TRANSFER`, trạng thái `SUCCESS`).

3. **Ghi Nhận Giao Dịch Hoàn Tiền (Refund Outflow):**
   - Khi Lễ tân chuyển khoản hoàn cọc cho khách (`confirmRefund`), hệ thống ghi nhận một bút toán giao dịch loại `REFUND` có giá trị dương vào bảng `payment_transactions` với dấu dòng tiền `-1`, có ghi chú ủy nhiệm chi và email nhân viên thực hiện.

4. **Phân Định Rõ Ràng Hai Khái Niệm Doanh Thu:**
   - **Doanh thu dồn tích (Room Revenue / Accrual Basis - Dashboard của Thành):** Doanh thu được phân bổ theo từng đêm phòng thực tế khách lưu trú trong kỳ $[CheckIn, CheckOut)$, bất kể tiền đã thu trước hay thu sau.
   - **Dòng tiền thực thu (Cash Flow / Cash Basis - Sổ Cái của Đức Anh):** Tiền thực tế chảy vào tài khoản ngân hàng và két tiền mặt trong kỳ báo cáo $[startDate, endDate]$.

---

## 2. Cấu Trúc Cơ Sở Dữ Liệu & Mô Hình Thực Thể

Bảng `payment_transactions` (Migration `V1__init_schema.sql`):

| Tên cột | Kiểu dữ liệu | Ràng buộc | Ý nghĩa đối soát Sổ Cái |
|---|---|---|---|
| `id` | `BIGINT` | `PK`, `AUTO_INCREMENT` | Định danh bút toán giao dịch |
| `booking_id` | `BIGINT` | `FK` $\to$ `bookings(id)` | Liên kết đơn đặt phòng |
| `transaction_code` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | Mã giao dịch nội bộ duy nhất (`TXN-...`, `COUNTER-...`, `REFUND-...`) |
| `vnp_transaction_no` | `VARCHAR(100)` | `NULL`, `UNIQUE` | Mã giao dịch cổng VNPay (chống lặp IPN Webhook) |
| `amount` | `DECIMAL(12, 2)` | `NOT NULL`, `CHECK(amount > 0)` | Số tiền phát sinh (luôn là số dương) |
| `payment_method` | `VARCHAR(20)` | `ENUM('VNPAY', 'CASH', 'BANK_TRANSFER')` | Kênh thanh toán dòng tiền |
| `status` | `VARCHAR(20)` | `ENUM('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED')` | Trạng thái giao dịch (chỉ `SUCCESS` tính vào thực thu) |
| `response_code` | `VARCHAR(20)` | `NULL` | Mã phản hồi ('00', 'COUNTER_CONFIRMED', 'REFUND_CONFIRMED') |
| `transaction_time` | `DATETIME` | `NULL` | **Thời điểm thực tế giao dịch phát sinh** |
| `expires_at` | `DATETIME` | `NULL` | Hạn giữ chỗ thanh toán online (15 phút) |
| `created_at` | `DATETIME` | `NOT NULL`, Default `NOW()` | Thời điểm tạo bản ghi hệ thống |

---

## 3. Phân Loại Giao Dịch (`PaymentTransactionType`)

```java
public enum PaymentTransactionType {
    DEPOSIT,            // Tiền cọc online qua VNPay Sandbox (50%)
    COUNTER_PAYMENT,    // Tiền thu tại quầy Lễ tân (tiền mặt / POS quẹt thẻ / chuyển khoản)
    REFUND,             // Tiền xuất chuyển khoản hoàn cọc cho khách
    ADDITIONAL_SERVICE  // Phụ thu dịch vụ phát sinh (minibar, giặt ủi, ăn uống)
}
```

### Quy tắc ánh xạ dấu dòng tiền (Cash Flow Sign):
- `DEPOSIT`: Thu vào $\to$ `cashFlowSign = +1`
- `COUNTER_PAYMENT`: Thu vào $\to$ `cashFlowSign = +1`
- `ADDITIONAL_SERVICE`: Thu vào $\to$ `cashFlowSign = +1`
- `REFUND`: Chi ra $\to$ `cashFlowSign = -1`

---

## 4. Đặc Tả REST API Sổ Cái

### 4.1. Tra cứu Danh sách Sổ Cái & Thống kê Dòng Tiền (Admin Ledger)

- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/payment-ledger`
- **Quyền:** `ROLE_ADMIN` (Các role khác nhận `403 Forbidden`)
- **Query Parameters:**
  - `startDate` *(YYYY-MM-DD, optional)*: Ngày bắt đầu khoảng thời gian giao dịch (mặc định ngày đầu tháng hiện tại).
  - `endDate` *(YYYY-MM-DD, optional)*: Ngày kết thúc khoảng thời gian giao dịch (mặc định ngày hiện tại).
    > ⚠️ **Validate:** `startDate <= endDate`. Nếu sai trả về `HTTP 400 Bad Request`.
  - `type` *(PaymentTransactionType, optional)*: Lọc theo loại (`DEPOSIT`, `COUNTER_PAYMENT`, `REFUND`).
  - `paymentMethod` *(PaymentMethod, optional)*: Lọc theo kênh (`VNPAY`, `CASH`, `BANK_TRANSFER`).
  - `status` *(TransactionStatus, optional)*: Mặc định trả về `SUCCESS` khi tính sổ cái.
  - `bookingCode` *(string, optional)*: Lọc theo mã đơn phòng (tìm kiếm gần đúng `%bookingCode%`).
  - `page` *(int, default: 0)*: Số thứ tự trang.
  - `size` *(int, default: 20, max: 100)*: Số lượng bản ghi mỗi trang.
  - **Sắp xếp mặc định:** `transactionTime DESC, id DESC` (mới nhất hiển thị trước).

#### Response thành công (`HTTP 200 OK`):
```json
{
  "page": 0,
  "size": 20,
  "totalElements": 48,
  "totalPages": 3,
  "summary": {
    "periodStart": "2026-11-01",
    "periodEnd": "2026-11-10",
    "totalDepositOnline": 38500000.00,
    "totalCounterCash": 14200000.00,
    "totalCounterTransfer": 8500000.00,
    "totalCounterRevenue": 22700000.00,
    "totalRefunded": 2400000.00,
    "netCashFlow": 58800000.00,
    "successfulTransactionCount": 45,
    "failedTransactionCount": 3
  },
  "entries": [
    {
      "transactionId": 105,
      "transactionCode": "COUNTER-BK-20261108-003-17199201",
      "bookingCode": "BK-20261108-003",
      "type": "COUNTER_PAYMENT",
      "amount": 950000.00,
      "cashFlowSign": 1,
      "paymentMethod": "CASH",
      "status": "SUCCESS",
      "transactionTime": "2026-11-10T11:45:00",
      "responseCode": "COUNTER_CONFIRMED",
      "actorEmail": "receptionist@grandaurora.com",
      "reference": {
        "bookingId": 24,
        "bookingCode": "BK-20261108-003",
        "customerName": "Trần Thị Mai",
        "customerEmail": "mai.tran@example.com",
        "customerPhone": "0912345678",
        "roomTypeName": "Deluxe Double Room",
        "checkInDate": "2026-11-08",
        "checkOutDate": "2026-11-10",
        "totalBookingPrice": 1900000.00,
        "externalTransactionNo": null,
        "referenceNote": "Thu nốt 50% tiền phòng khi khách Check-out"
      }
    },
    {
      "transactionId": 104,
      "transactionCode": "REFUND-BK-20261105-001-17199180",
      "bookingCode": "BK-20261105-001",
      "type": "REFUND",
      "amount": 500000.00,
      "cashFlowSign": -1,
      "paymentMethod": "BANK_TRANSFER",
      "status": "SUCCESS",
      "transactionTime": "2026-11-10T09:15:22",
      "responseCode": "REFUND_CONFIRMED",
      "actorEmail": "receptionist@grandaurora.com",
      "reference": {
        "bookingId": 19,
        "bookingCode": "BK-20261105-001",
        "customerName": "Nguyễn Văn An",
        "customerEmail": "an.nguyen@example.com",
        "customerPhone": "0987654321",
        "roomTypeName": "Standard Single Room",
        "checkInDate": "2026-11-07",
        "checkOutDate": "2026-11-09",
        "totalBookingPrice": 1000000.00,
        "externalTransactionNo": "FT2611108861",
        "referenceNote": "Ủy nhiệm chi BIDV số FT2611108861 hoàn cọc hủy trước 24h"
      }
    },
    {
      "transactionId": 101,
      "transactionCode": "TXN-BK-20261110-001-17199002",
      "bookingCode": "BK-20261110-001",
      "type": "DEPOSIT",
      "amount": 900000.00,
      "cashFlowSign": 1,
      "paymentMethod": "VNPAY",
      "status": "SUCCESS",
      "transactionTime": "2026-11-10T08:42:15",
      "responseCode": "00",
      "actorEmail": "customer@example.com",
      "reference": {
        "bookingId": 25,
        "bookingCode": "BK-20261110-001",
        "customerName": "Lê Hoàng Long",
        "customerEmail": "customer@example.com",
        "customerPhone": "0905123456",
        "roomTypeName": "Executive Suite Luxury",
        "checkInDate": "2026-11-15",
        "checkOutDate": "2026-11-17",
        "totalBookingPrice": 1800000.00,
        "externalTransactionNo": "14567890",
        "referenceNote": "Thanh toán cọc 50% qua cổng VNPay Sandbox"
      }
    }
  ]
}
```

---

### 4.2. Tra cứu Nhanh Tổng Hợp Dòng Tiền (Summary for Dashboard)

- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/payment-ledger/summary`
- **Quyền:** `ROLE_ADMIN`
- **Query Parameters:** `startDate` *(YYYY-MM-DD)*, `endDate` *(YYYY-MM-DD)*.
- **Mục đích:** API siêu nhẹ phục vụ riêng Dashboard của Thành hiển thị 4 thẻ KPI tài chính:
  1. Tổng cọc Online
  2. Tổng thu quầy
  3. Tổng hoàn tiền
  4. Thực thu ròng (Net Cash Flow)

#### Response thành công (`HTTP 200 OK`):
```json
{
  "periodStart": "2026-11-01",
  "periodEnd": "2026-11-10",
  "totalDepositOnline": 38500000.00,
  "totalCounterCash": 14200000.00,
  "totalCounterTransfer": 8500000.00,
  "totalCounterRevenue": 22700000.00,
  "totalRefunded": 2400000.00,
  "netCashFlow": 58800000.00,
  "successfulTransactionCount": 45,
  "failedTransactionCount": 3
}
```

---

### 4.3. Ghi Nhận Giao Dịch Thu Tiền Tại Quầy (Counter Payment)

- **Method:** `POST`
- **Endpoint:** `/api/v1/receptionist/payments/counter`
- **Quyền:** `ROLE_RECEPTIONIST`, `ROLE_ADMIN`
- **Mục đích:** Khi Lễ tân thu tiền mặt hoặc quẹt thẻ POS của khách (lúc Check-in, Check-out, hoặc phụ thu), Lễ tân gọi API này để hệ thống tạo bản ghi `PaymentTransaction` chính thức, lưu nguồn thời điểm thực tế, không suy đoán từ booking.

#### Request Body:
```json
{
  "bookingId": 24,
  "amount": 950000.00,
  "paymentMethod": "CASH",
  "type": "COUNTER_PAYMENT",
  "referenceNote": "Thu nốt 50% tiền phòng khi khách Check-out"
}
```

#### Response thành công (`HTTP 201 Created`):
```json
{
  "transactionId": 105,
  "transactionCode": "COUNTER-BK-20261108-003-17199201",
  "bookingCode": "BK-20261108-003",
  "type": "COUNTER_PAYMENT",
  "amount": 950000.00,
  "cashFlowSign": 1,
  "paymentMethod": "CASH",
  "status": "SUCCESS",
  "transactionTime": "2026-11-10T11:45:00",
  "responseCode": "COUNTER_CONFIRMED",
  "actorEmail": "receptionist@grandaurora.com"
}
```

---

## 5. Hướng Dẫn Tích Hợp Bàn Giao (Huy - PM & Thành - Dashboard)

### 5.1. Bàn giao cho Thành (Backend / Dashboard Service)
- **Điểm phân biệt sống còn:**
  - `DashboardSummaryResponse.roomRevenue`: Là doanh thu lưu trú tính theo **số đêm phòng thực tế dồn tích** trong khoảng ngày chọn.
  - `PaymentLedgerSummaryDTO.netCashFlow`: Là dòng tiền thực tế chảy vào tài khoản ngân hàng và két tiền mặt trong khoảng ngày chọn.
  - Hai con số này **không nhất thiết phải bằng nhau** do khách có thể cọc tiền từ tháng trước nhưng tháng này mới đến nghỉ, hoặc khách nghỉ tháng này nhưng thanh toán trả sau.
- **Tích hợp:** Thành có thể gọi trực tiếp `paymentLedgerService.getLedgerSummary(startDate, endDate)` để gắn vào trường `netRevenue` của `DashboardSummaryResponse` mà không cần viết lại câu truy vấn.

### 5.2. Bàn giao cho Huy (PM / Frontend Dashboard)
- Trên giao diện Quản trị Dashboard Sprint 3:
  - Tab 1: **Báo cáo Doanh thu Hoạt động (Accrual)**: Dựa trên số đêm phòng đã khai thác.
  - Tab 2: **Sổ Cái Dòng Tiền Đối Soát (Cash Flow)**: Hiển thị bảng chi tiết từng bút toán cọc, thu quầy, hoàn tiền theo đúng mốc thời gian giao dịch thực tế.
- **Bộ lọc giao diện:** Hỗ trợ chọn nhanh `Hôm nay`, `Tuần này`, `Tháng này`, hoặc tùy chọn `[startDate, endDate]`.

---

## 6. Xử Lý Ngoại Lệ Chuẩn (SRS §NFR-09)

Mọi lỗi trả về theo cấu trúc `ErrorResponse` thống nhất:

```json
{
  "timestamp": "2026-11-10T16:45:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Khoảng thời gian không hợp lệ: startDate không được lớn hơn endDate",
  "path": "/api/v1/admin/payment-ledger"
}
```


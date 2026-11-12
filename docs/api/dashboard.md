# Tài Liệu Hợp Đồng API & Chỉ Số Dashboard Quản Trị (Grand Aurora)
> **Mã công việc:** `[SP2-1109-THANH] [Chatbot/Dashboard] 09/11 | Thành | Chốt Chat và contract chỉ số Dashboard (6h)`  
> **Phụ trách Backend:** Phan Thuận Thành — Backend  
> **Người tiếp nhận Frontend:** Nguyễn Thị Yến (Frontend UI) — Bàn giao trước 12:00  
> **Reviewer nghiệp vụ:** Huy  
> **Kiểm thử chất lượng:** Trung (QA/Tester)  
> **Nhánh phát triển:** `thanh_devBE`  

---

## 1. Tổng Quan & Kiến Trúc Chỉ Số Quản Trị

Tài liệu này định nghĩa hợp đồng API (API Contract), công thức chuẩn kế toán khách sạn quốc tế (USALI) và các bộ dữ liệu mẫu (Fixtures) cho **Admin Dashboard** thuộc Khách sạn 5 sao Grand Aurora Luxury Hotel theo đặc tả **SRS §2.7, §11.6 & FR-14**:

1. **Phân biệt rạch ròi Doanh thu lưu trú vs Dòng tiền:**
   - **Doanh thu lưu trú (Room Revenue / Accrual Basis):** Giá trị phòng thực tế được tiêu dùng trong kỳ theo ngày khách lưu trú. Booking vắt qua tháng được tách chính xác số đêm thuộc kỳ báo cáo. Đơn hủy phòng **không** phát sinh doanh thu lưu trú.
   - **Dòng tiền thực thu (Net Cash Flow / Cash Basis):** Dòng tiền vào qua cổng thanh toán VNPay/tiền mặt trong kỳ trừ đi tổng tiền cọc đã hoàn trả (`totalPaid - refundTotal`).
2. **Bộ chỉ số hiệu suất chuẩn ngành khách sạn (Hotel KPIs):**
   - **ADR (Average Daily Rate):** Giá bán phòng bình quân mỗi đêm đã bán.
   - **RevPAR (Revenue Per Available Room):** Doanh thu trên mỗi phòng khả dụng trong khách sạn.
   - **Occupancy Rate:** Tỷ lệ lấp đầy phòng khả dụng trong kỳ.
   - **Room Nights:** Tổng đêm phòng khả dụng (`totalAvailableRoomNights`) và Đêm phòng đã bán (`soldRoomNights`).
3. **An toàn mẫu số 0 (Zero Denominator Safety):** Khi khách sạn không có khách ở hoặc không có phòng khả dụng, ADR, RevPAR và Occupancy Rate tự động trả về `0.0` an toàn, không bao giờ gây lỗi chia cho 0 (`ArithmeticException`).
4. **Chuỗi dữ liệu biểu đồ theo ngày (`revenueSeries`):** Cung cấp chuỗi điểm dữ liệu từng ngày phục vụ vẽ biểu đồ đường/cột xu hướng đa chiều trên giao diện (FR-14.2).

---

## 2. Bảng Công Thức Tính Chuẩn Nghiệp Vụ

| Chỉ số | Tên tiếng Anh | Công thức tính toán | Ý nghĩa & Xử lý biên |
| :--- | :--- | :--- | :--- |
| **Doanh thu lưu trú** | `roomRevenue` | $\sum (\text{Số đêm trong kỳ} \times \text{Đơn giá phòng/đêm})$ | Chỉ tính đơn `CHECKED_IN`, `CHECKED_OUT`. Đơn qua tháng chỉ tính số đêm thuộc kỳ. |
| **Dòng tiền ròng** | `netCashFlow` | $\text{totalPaid} - \text{refundTotal}$ | Tiền vào từ transaction `SUCCESS` trừ đi tiền cọc đã hoàn cho khách `REFUNDED`. |
| **Doanh thu dự kiến** | `expectedRevenue` | $\sum \text{totalPrice (CONFIRMED, CHECKED\_IN, CHECKED\_OUT)}$ | Tổng giá trị các đơn hợp lệ giao cắt với kỳ. |
| **Đêm phòng khả dụng** | `totalAvailableRoomNights` | $\text{activeRooms} \times \text{totalDays}$ | `activeRooms` = Tổng phòng trừ phòng bảo trì (`MAINTENANCE`). |
| **Đêm phòng đã bán** | `soldRoomNights` | $\sum (\text{Số đêm thực ở trong kỳ} \times \text{quantity})$ | Tổng số đêm phòng thực tế khách đã ở trong kỳ. |
| **Tỷ lệ lấp đầy** | `occupancyRate` | $\frac{\text{soldRoomNights}}{\text{totalAvailableRoomNights}}$ | Giá trị từ `0.0` đến `1.0` (Ví dụ: `0.75` = 75%). Mẫu số 0 trả về `0.0`. |
| **Giá bán bình quân** | `adr` | $\frac{\text{roomRevenue}}{\text{soldRoomNights}}$ | Giá bình quân mỗi đêm phòng bán ra. Nếu `soldRoomNights == 0` trả về `0.00`. |
| **Doanh thu / phòng** | `revpar` | $\frac{\text{roomRevenue}}{\text{totalAvailableRoomNights}} = \text{ADR} \times \text{Occupancy}$ | Hiệu suất khai thác buồng phòng. Nếu `availableRoomNights == 0` trả về `0.00`. |

---

## 3. Chi Tiết Endpoint API

### `GET /api/v1/admin/dashboard/summary`
- **Mô tả:** Lấy toàn bộ số liệu KPI, doanh thu lưu trú, dòng tiền, cơ cấu phòng và chuỗi dữ liệu biểu đồ xu hướng theo ngày.
- **Quyền truy cập:** `ADMIN` (`hasRole('ADMIN')` kèm Bearer Token).
- **Query Parameters:**
  - `dateFrom` *(Tùy chọn, ISO Date: `YYYY-MM-DD`)*: Ngày bắt đầu kỳ (Mặc định: ngày 1 đầu tháng hiện tại).
  - `dateTo` *(Tùy chọn, ISO Date: `YYYY-MM-DD`)*: Ngày kết thúc kỳ (Mặc định: ngày cuối cùng của tháng hiện tại).

---

## 4. Cấu Trúc Response (JSON Schema)

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "dateFrom": "2026-11-01",
    "dateTo": "2026-11-30",
    "roomRevenue": 28500000.00,
    "netCashFlow": 24200000.00,
    "expectedRevenue": 35000000.00,
    "actualRevenue": 24200000.00,
    "totalPaid": 26000000.00,
    "refundTotal": 1800000.00,
    "adr": 950000.00,
    "revpar": 380000.00,
    "occupancyRate": 0.40,
    "soldRoomNights": 30,
    "totalAvailableRoomNights": 75,
    "totalRooms": 10,
    "activeRooms": 9,
    "totalBookings": 12,
    "confirmedBookings": 10,
    "roomCounts": {
      "AVAILABLE": 5,
      "OCCUPIED": 3,
      "CLEANING": 1,
      "MAINTENANCE": 1
    },
    "revenueSeries": [
      {
        "date": "2026-11-01",
        "roomRevenue": 1900000.00,
        "netCashFlow": 950000.00,
        "soldRoomNights": 2,
        "availableRooms": 9,
        "occupancyRate": 0.2222,
        "adr": 950000.00,
        "revpar": 211111.11
      }
    ],
    "roomTypeRevenues": [
      {
        "roomTypeId": 2,
        "roomTypeName": "Deluxe Double Room",
        "roomRevenue": 19000000.00,
        "soldRoomNights": 20,
        "revenueShare": 0.6667
      }
    ]
  }
}
```

---

## 5. Bốn Bộ Fixtures Kiểm Thử Đặc Thù (Dành Cho Yến & Tester)

### Fixture 1: Tháng Hoạt Động Tiêu Chuẩn (Standard Month)
Dữ liệu mẫu cho tháng 10/2026 đầy đủ doanh thu, tỷ lệ lấp đầy ổn định:
```json
{
  "dateFrom": "2026-10-01",
  "dateTo": "2026-10-31",
  "roomRevenue": 57000000.00,
  "netCashFlow": 52500000.00,
  "expectedRevenue": 60000000.00,
  "actualRevenue": 52500000.00,
  "totalPaid": 55000000.00,
  "refundTotal": 2500000.00,
  "adr": 950000.00,
  "revpar": 570000.00,
  "occupancyRate": 0.60,
  "soldRoomNights": 60,
  "totalAvailableRoomNights": 100,
  "totalRooms": 10,
  "activeRooms": 10,
  "totalBookings": 25,
  "confirmedBookings": 22,
  "roomCounts": {
    "AVAILABLE": 4,
    "OCCUPIED": 4,
    "CLEANING": 1,
    "MAINTENANCE": 1
  }
}
```

### Fixture 2: Booking Vắt Qua Tháng (Cross-Month Booking)
Khách ở từ `2026-10-28` đến `2026-11-03` (6 đêm phòng Deluxe giá 950.000 VNĐ/đêm):
- Kỳ tháng 10 chỉ tính 4 đêm (`28, 29, 30, 31/10`): $\text{roomRevenue} = 4 \times 950.000 = 3.800.000\text{ VNĐ}$.
- Kỳ tháng 11 chỉ tính 2 đêm (`01, 02/11`): $\text{roomRevenue} = 2 \times 950.000 = 1.900.000\text{ VNĐ}$.
- Dòng tiền: Khách thanh toán cọc vào tháng 10 nên tháng 10 nhận dòng tiền cọc; tháng 11 nhận tiền tất toán còn lại khi trả phòng.
```json
{
  "dateFrom": "2026-10-01",
  "dateTo": "2026-10-31",
  "roomRevenue": 3800000.00,
  "netCashFlow": 2850000.00,
  "adr": 950000.00,
  "revpar": 126666.67,
  "occupancyRate": 0.1333,
  "soldRoomNights": 4,
  "totalAvailableRoomNights": 30
}
```

### Fixture 3: Có Hủy Phòng & Hoàn Tiền Cọc (Cancellation & Refund)
Khách hủy phòng trước 24h so với mốc 14:00, được hoàn trả 100% tiền cọc 950.000 VNĐ:
- Doanh thu lưu trú: Bằng 0 (vì khách không ở thực tế).
- Dòng tiền: `netCashFlow` bị trừ 950.000 VNĐ tiền hoàn trả (`refundTotal = 950000.00`).
```json
{
  "dateFrom": "2026-11-01",
  "dateTo": "2026-11-07",
  "roomRevenue": 0.00,
  "netCashFlow": 0.00,
  "totalPaid": 950000.00,
  "refundTotal": 950000.00,
  "adr": 0.00,
  "revpar": 0.00,
  "occupancyRate": 0.00,
  "soldRoomNights": 0,
  "totalAvailableRoomNights": 70
}
```

### Fixture 4: Biên Mẫu Số 0 (Zero Denominator)
Kỳ không có khách lưu trú (`soldRoomNights = 0`) hoặc toàn bộ phòng đang bảo trì (`activeRooms = 0`):
- Hệ thống trả về `0.0` an toàn cho ADR, RevPAR, Occupancy Rate mà **không bị treo hay văng lỗi hệ thống**.
```json
{
  "dateFrom": "2026-05-01",
  "dateTo": "2026-05-07",
  "roomRevenue": 0.00,
  "netCashFlow": 0.00,
  "expectedRevenue": 0.00,
  "actualRevenue": 0.00,
  "totalPaid": 0.00,
  "refundTotal": 0.00,
  "adr": 0.00,
  "revpar": 0.00,
  "occupancyRate": 0.00,
  "soldRoomNights": 0,
  "totalAvailableRoomNights": 0,
  "totalRooms": 2,
  "activeRooms": 0,
  "totalBookings": 0,
  "confirmedBookings": 0
}
```

---

## 6. Hướng Dẫn Tích Hợp Frontend (Dành Cho Yến)

1. Cập nhật `frontend/src/types/dashboard.ts` để nhận thêm các trường `roomRevenue`, `netCashFlow`, `adr`, `revpar`, `soldRoomNights`, `revenueSeries`.
2. Trên giao diện `AdminDashboardPage.jsx`:
   - Hiển thị song song 2 thẻ doanh thu: **Doanh thu lưu trú (Accrual)** và **Dòng tiền thực thu (Net Cash Flow)**.
   - Hiển thị 2 chỉ số chuyên sâu **ADR** và **RevPAR** trong thẻ KPI hoặc biểu đồ phụ.
   - Vẽ biểu đồ đường xu hướng doanh thu từ mảng `data.revenueSeries`.

---

## 7. Tối Ưu Hóa Truy Vấn Theo Khoảng Ngày & Spring Data JPA Projections (SP2-1110-THANH)

> **Mã công việc:** `[SP2-1110-THANH] [Dashboard] 10/11 | Thành | Truy vấn thống kê theo khoảng ngày (6h)`  
> **Mục tiêu:** Giảm `findAll()`, tính room nights, series theo khoảng ngày, giữ summary tương thích; test đầu/cuối ngày, qua tháng, checkout không thêm đêm. Phối hợp với team khi sửa repository chung.

### 7.1. Triệt để loại bỏ `findAll()` và bảo vệ tài nguyên RAM/I-O
- **Trước đây:** Hệ thống gọi `bookingRepository.findAll()`, `paymentTransactionRepository.findAll()`, `roomRepository.findAll()` rồi stream lọc trong bộ nhớ RAM Java. Khi dữ liệu lên hàng nghìn bản ghi, điều này gây nghẽn cổ chai bộ nhớ và độ trễ cao.
- **Giải pháp tối ưu:**
  1. **Tách riêng `DashboardRepository`:** Định nghĩa các câu truy vấn JPQL chỉ lấy booking giao cắt với kỳ `[dateFrom, dateTo]`. Không can thiệp các method dùng chung trên `BookingRepository` để tránh xung đột với module của Đức Anh.
  2. **Dùng Spring Data JPA Projections:**
     - `BookingPeriodProjection`: Trích xuất tinh gọn chỉ các trường cần tính toán (`checkInDate`, `checkOutDate`, `quantity`, `totalPrice`, `depositAmount`, `roomTypeId`, `roomTypeName`).
     - `RoomStatusCountProjection`: Sử dụng `GROUP BY r.status` trực tiếp dưới database để đếm số phòng khả dụng/bảo trì thay vì nạp toàn bộ danh sách entity Room.
     - `RefundBookingProjection`: Trích xuất đơn hủy/hoàn cọc trong kỳ.
  3. **Repository chung bổ sung an toàn:**
     - `PaymentTransactionRepository.findSuccessfulTransactionsBetween(startDateTime, endDateTime)`: Lọc giao dịch thành công trong kỳ ngay tại tầng DB.
     - `RoomRepository.countRoomsGroupByStatus()`: Đếm nhóm theo trạng thái phòng.

### 7.2. Quy tắc nghiệp vụ tính Room Nights & Series theo ngày
1. **Ngày Check-out không tính đêm lưu trú:**
   - Theo tiêu chuẩn ngành khách sạn, khách trả phòng vào sáng ngày check-out (trước 12:00), do đó ngày check-out tuyệt đối **không** được tính thêm đêm lưu trú.
   - Trong chuỗi `revenueSeries`, điểm ngày `checkOutDate` không ghi nhận đêm phòng của đơn đó.
2. **Xử lý biên đầu ngày & cuối ngày (Boundary Dates):**
   - Đơn checkout đúng ngày `dateFrom`: Không tính đêm nào trong kỳ `[dateFrom, dateTo]`.
   - Đơn check-in đúng ngày `dateTo`: Tính đúng 1 đêm (đêm ngày `dateTo`).
3. **Phân bổ đơn lưu trú vắt qua tháng (Cross-month Booking):**
   - Đơn từ `28/10` đến `03/11`: Tháng 10 tính đúng 4 đêm (`28, 29, 30, 31/10`), tháng 11 tính đúng 2 đêm (`01, 02/11`). Doanh thu lưu trú dồn tích được phân bổ chuẩn xác theo từng kỳ.
4. **Duy trì tương thích 100% hợp đồng API:**
   - DTO `DashboardSummaryResponse`, `DashboardDailyRevenuePoint`, `DashboardRoomTypeRevenue` được bảo toàn nguyên vẹn cấu trúc và kiểu dữ liệu, bảo đảm không làm vỡ Frontend.

---

## 8. API Doanh Thu 12 Tháng & Phân Tích Hiệu Suất Theo Tháng (SP3-1111-THANH)

> **Mã công việc:** `[SP3-1111-THANH] [Dashboard] 11/11 | Thành | API ADR/RevPAR và doanh thu 12 tháng (6h)`  
> **Người bàn giao:** Phan Thuận Thành — Backend  
> **Người tiếp nhận:** Nguyễn Thị Yến (Frontend UI) — Bàn giao trước 15:00  
> **Reviewer:** Huy (Lead) & Trung (QA/Tester)  

### 8.1. Chi tiết Endpoint
- **URL:** `GET /api/v1/admin/dashboard/monthly-revenue`
- **Quyền:** `ADMIN` (`hasRole('ADMIN')` kèm Bearer Token).
- **Query Parameters:**
  - `year` *(Tùy chọn, Integer, ví dụ `2026`)*: Năm cần thống kê 12 tháng (Mặc định: Năm hiện tại).
  - `startDate` *(Tùy chọn, ISO Date: `YYYY-MM-DD`)*: Ngày bắt đầu chu kỳ (nếu xem chu kỳ tùy chọn).
  - `endDate` *(Tùy chọn, ISO Date: `YYYY-MM-DD`)*: Ngày kết thúc chu kỳ (nếu xem chu kỳ tùy chọn).

### 8.2. Cấu trúc Response (JSON Schema)
```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "year": 2026,
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "totalRevenue": 904000000.00,
    "totalRoomRevenue": 904000000.00,
    "totalNetCashFlow": 880000000.00,
    "averageAdr": 950000.00,
    "averageRevpar": 450000.00,
    "averageOccupancyRate": 0.47,
    "totalSoldRoomNights": 950,
    "totalAvailableRoomNights": 2000,
    "monthly": [
      {
        "month": "Tháng 01/2026",
        "monthKey": "2026-01",
        "monthIndex": 1,
        "year": 2026,
        "revenue": 45000000.00,
        "roomRevenue": 45000000.00,
        "netCashFlow": 42000000.00,
        "totalPaid": 45000000.00,
        "refundTotal": 3000000.00,
        "soldRoomNights": 45,
        "availableRoomNights": 90,
        "adr": 1000000.00,
        "revpar": 500000.00,
        "occupancyRate": 0.50
      }
    ],
    "roomTypes": [
      {
        "roomTypeId": 2,
        "roomTypeName": "Deluxe Double Room",
        "roomRevenue": 410000000.00,
        "revenue": 410000000.00,
        "soldRoomNights": 400,
        "revenueShare": 0.4651,
        "percentage": 46.51
      }
    ]
  }
}
```

### 8.3. Hướng Dẫn Tích Hợp Cho Nguyễn Thị Yến (Frontend)
- API trả về trực tiếp `monthly` (mảng 12 tháng từ Tháng 01 đến Tháng 12) và `roomTypes` (cơ cấu loại phòng kèm `percentage` và `revenue`).
- Giao diện `AdminDashboardPage.jsx` có thể thay thế trực tiếp Mock Service `revenueAnalyticsMockService.fetchAnalytics(...)` bằng `dashboardService.getMonthlyRevenue({ year: 2026 })`.
- Mọi trường dữ liệu đã được tính toán an toàn mẫu số 0 (Zero Denominator), không bao giờ gặp lỗi `NaN` hay `Infinity`.

---

## 9. API Xuất Báo Cáo Thống Kê CSV Quản Trị (SP3-1112-THANH)

> **Mã công việc:** `[SP3-1112-THANH] [Dashboard] 12/11 | Thành | CSV và kiểm thử số liệu (6h)`  
> **Người bàn giao:** Phan Thuận Thành — Backend  
> **Người tiếp nhận:** Nguyễn Thị Yến (Frontend UI) — Bàn giao trước 12:00  
> **Reviewer:** Huy (Lead) & Trung (QA/Tester)  

### 9.1. Chi tiết Endpoint
- **URL:** `GET /api/v1/admin/dashboard/export-csv`
- **Quyền truy cập:** `ADMIN` (`hasRole('ADMIN')` kèm Bearer Token).
- **Mã HTTP Response:**
  - `200 OK`: Xuất file CSV thành công.
  - `400 Bad Request`: Khi ngày sai (`dateFrom > dateTo` hoặc sai định dạng `YYYY-MM-DD`).
  - `401 Unauthorized`: Chưa đăng nhập.
  - `403 Forbidden`: Người dùng không có quyền Quản trị viên (ROLE_ADMIN).
- **Headers trả về:**
  - `Content-Type: text/csv; charset=UTF-8`
  - `Content-Disposition: attachment; filename="dashboard_report_{dateFrom}_{dateTo}.csv"`
  - `Cache-Control: no-cache, no-store, must-revalidate`
- **Query Parameters:**
  - `dateFrom` *(Tùy chọn, ISO Date: `YYYY-MM-DD`)*: Ngày bắt đầu kỳ báo cáo (Mặc định: ngày 1 đầu tháng hiện tại).
  - `dateTo` *(Tùy chọn, ISO Date: `YYYY-MM-DD`)*: Ngày kết thúc kỳ báo cáo (Mặc định: ngày cuối tháng hiện tại).
  - `startDate`, `endDate` *(Tùy chọn fallback)*: Tham số tương thích ngược nếu Frontend dùng `startDate`/`endDate`.
  - `reportType` *(Tùy chọn, String: `full` | `summary` | `daily` | `room-types`, mặc định: `full`)*: Chọn loại báo cáo mong muốn.

### 9.2. Tiêu chuẩn Kỹ Thuật & Nghiệp Vụ Cốt Lõi
1. **Chuẩn UTF-8 with BOM (`\uFEFF`):**
   - File CSV bắt đầu với chuỗi 3-byte Byte Order Mark `\uFEFF` (`0xEF, 0xBB, 0xBF`).
   - Đảm bảo Microsoft Excel trên Windows khi mở trực tiếp file CSV sẽ hiển thị chuẩn xác 100% tiếng Việt có dấu, không bị lỗi font/ký tự lạ.
2. **Chống CSV Formula Injection (CWE-1236 / OWASP CSV Injection):**
   - Mọi ô dữ liệu (cell) bắt đầu bằng các ký tự công thức Excel nguy hiểm: `=`, `@`, `\t`, `\r`, `%`, hoặc `+`, `-` (không phải số) được tự động prepend dấu nháy đơn (`'`) và bọc dấu ngoặc kép theo chuẩn RFC 4180.
   - Các số âm hoặc dương bình thường (ví dụ: `-500000`, `+12345`) được bảo toàn giá trị số học.
3. **An toàn mẫu số 0 (Zero Denominator Safety):**
   - Khi khách sạn có 0 phòng hoặc kỳ báo cáo không có booking, các chỉ số ADR, RevPAR, Occupancy rate hiển thị `0` hoặc `0.00%`, tuyệt đối không gây lỗi `ArithmeticException` chia cho 0.
4. **Cấu trúc nội dung file CSV báo cáo:**
   - **Phần I - Chỉ số hiệu suất vận hành & tài chính (KPIs):** Doanh thu lưu trú, Dòng tiền thực thu, Tổng thanh toán, Tổng hoàn cọc, ADR, RevPAR, Tỷ lệ lấp đầy %, Đêm phòng đã bán/khả dụng, Tổng phòng, Phòng hoạt động, Tổng đơn và Đơn xác nhận.
   - **Phần II - Chi tiết theo từng ngày (Daily Series):** Ngày, Doanh thu lưu trú, Dòng tiền thực thu, Đêm phòng đã bán, Phòng khả dụng, Tỷ lệ lấp đầy %, ADR, RevPAR.
   - **Phần III - Cơ cấu loại phòng (Room Types):** Mã loại phòng, Tên loại phòng, Doanh thu lưu trú, Đêm phòng đã bán, Tỷ trọng doanh thu %.

### 9.3. Hướng Dẫn Tích Hợp Cho Nguyễn Thị Yến (Frontend)
- Trong `frontend/src/services/dashboardService.ts`, gọi hàm:
  ```typescript
  const blob = await dashboardService.exportDashboardCsv(dateFrom, dateTo, 'full');
  dashboardService.downloadCsvFile(blob, `bao-cao-dashboard-${dateFrom}-${dateTo}.csv`);
  ```
- Nút "Xuất CSV" đã được bổ sung trực tiếp trên thanh công cụ của [`AdminDashboardPage.jsx`](file:///c:/Users/pc/Downloads/Hotel-Booking-System_HBS/frontend/src/pages/admin/AdminDashboardPage.jsx).





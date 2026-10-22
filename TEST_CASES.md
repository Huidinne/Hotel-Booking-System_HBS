# 📋 KẾ HOẠCH & MA TRẬN KỊCH BẢN KIỂM THỬ (TEST CASES SPECIFICATION)
## DỰ ÁN: HOTEL BOOKING SYSTEM (MVP)

> **Mã tài liệu:** QA-TEST-SPEC-HBS-01  
> **Phiên bản:** 2.0  
> **Người thực hiện:** Đội ngũ DevOps & QA  
> **Phạm vi kiểm thử:** Backend REST API, Phân quyền RBAC, Nghiệp vụ Tìm kiếm phòng, Đặt phòng & Chống Overbooking (Pessimistic Lock), Hủy phòng phạt cọc theo mốc 14:00, và Vận hành Lễ tân Check-in/Check-out.  
> **Chuẩn áp dụng:** ISTQB / IEEE 829 Standard for Software Test Documentation.

---

## 📌 1. Quy Ước Phân Loại Lỗi & Mức Độ Ưu Tiên (Defect Severity & Priority)

### 1.1. Mức độ nghiêm trọng của lỗi (Severity)
* **🔴 BLOCKER (S1):** Lỗi làm sập hệ thống, treo server, rò rỉ dữ liệu tài khoản, hỏng luồng thanh toán VNPay, hoặc cho phép Overbooking (bán vượt quá số phòng vật lý thực tế). Không thể tiếp tục kiểm thử.
* **🟠 CRITICAL (S2):** Lỗi sai lệch logic nghiệp vụ cốt lõi: Tính sai tiền cọc 50%, tính sai bậc phạt cọc khi hủy, không khóa được phòng khi check-in, hoặc bypass phân quyền RBAC (Customer gọi được API Lễ tân/Admin).
* **🟡 MAJOR (S3):** Chức năng hoạt động nhưng sai điều kiện biên, trả về HTTP Status Code không chuẩn (trả về 500 thay vì 400/409), lỗi validation đầu vào nhưng không có thông báo rõ ràng cho người dùng.
* **🟢 MINOR (S4):** Lỗi nhỏ về định dạng ngày giờ, chính tả thông báo, giao diện format hiển thị số tiền chưa có dấu phân cách hàng nghìn.

### 1.2. Mức độ ưu tiên khắc phục (Priority)
* **P1 (High):** Phải khắc phục ngay lập tức trong sprint hiện tại trước khi merge vào nhánh `develop`/`main`.
* **P2 (Medium):** Cần khắc phục trước khi release bản thử nghiệm (Staging / UAT).
* **P3 (Low):** Có thể xếp vào backlog cải tiến trong các phiên bản sau.

---

## 📑 2. Bảng Danh Sách Chi Tiết Các Kịch Bản Kiểm Thử (Detailed Test Cases)

### Module 1: Xác Thực & Phân Quyền (Authentication & RBAC)

| Test ID | Tên luồng nghiệp vụ | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Payload / Params) | Kết quả mong đợi (Expected Output) | Mức độ lỗi (Severity) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_AUTH_01** | Đăng ký tài khoản Customer mới thành công | Functional (Happy Path) | Email chưa từng tồn tại trong hệ thống | 1. Gửi request `POST /api/v1/auth/register`<br>2. Kiểm tra response body và CSDL | `{ "email": "customer_new@test.com", "password": "Password@123", "fullName": "Nguyễn Văn A", "phone": "0901234567" }` | HTTP `201 Created`<br>`success = true`<br>Trả về JWT `accessToken`, vai trò `ROLE_CUSTOMER`, mật khẩu lưu trong DB được hash BCrypt. | 🔴 Blocker |
| **TC_AUTH_02** | Đăng ký với email đã tồn tại | Validation (Negative) | Email `customer@gmail.com` đã có trong DB | 1. Gửi request `POST /api/v1/auth/register` với email trùng lặp | `{ "email": "customer@gmail.com", "password": "Password@123", "fullName": "Test User", "phone": "0901111222" }` | HTTP `409 Conflict`<br>`status = 409`<br>`message` thông báo email đã được đăng ký. | 🟡 Major |
| **TC_AUTH_03** | Đăng ký sai định dạng dữ liệu | Validation (Negative) | Không | 1. Gửi request `POST /api/v1/auth/register` với email sai format, mật khẩu ngắn hơn 6 ký tự | `{ "email": "not-an-email", "password": "123", "fullName": "", "phone": "abc" }` | HTTP `400 Bad Request`<br>Trả về danh sách các trường lỗi validation chi tiết. | 🟡 Major |
| **TC_AUTH_04** | Đăng nhập đúng thông tin | Functional (Happy Path) | Tài khoản đã active trong hệ thống | 1. Gửi request `POST /api/v1/auth/login` | `{ "email": "customer@gmail.com", "password": "Password@123" }` | HTTP `200 OK`<br>`accessToken` hợp lệ (thời hạn 30 phút), Set-Cookie chứa `refreshToken` HttpOnly (7 ngày). | 🔴 Blocker |
| **TC_AUTH_05** | Đăng nhập sai mật khẩu | Security (Negative) | Tài khoản tồn tại trong DB | 1. Gửi request `POST /api/v1/auth/login` với mật khẩu sai | `{ "email": "customer@gmail.com", "password": "WrongPassword@123" }` | HTTP `401 Unauthorized`<br>`status = 401`<br>Không lộ thông tin mật khẩu hay token. | 🟠 Critical |
| **TC_AUTH_06** | RBAC: Chặn Customer gọi API của Lễ tân | Security (Authorization) | Đăng nhập tài khoản `ROLE_CUSTOMER` | 1. Lấy token Customer<br>2. Gửi request `GET /api/v1/receptionist/bookings` kèm Bearer token | Header: `Authorization: Bearer <customer_token>` | HTTP `403 Forbidden`<br>`status = 403`<br>`message`: "Bạn không có quyền truy cập tài nguyên này". | 🟠 Critical |
| **TC_AUTH_07** | RBAC: Chặn Customer gọi API Admin Dashboard | Security (Authorization) | Đăng nhập tài khoản `ROLE_CUSTOMER` | 1. Gửi `GET /api/v1/admin/dashboard/summary` kèm token Customer | Header: `Authorization: Bearer <customer_token>` | HTTP `403 Forbidden` | 🟠 Critical |
| **TC_AUTH_08** | RBAC: Chặn truy cập không kèm Token | Security (Authentication) | Không | 1. Gửi `GET /api/v1/bookings/my-bookings` không có Authorization header | Không có header Authorization | HTTP `401 Unauthorized`<br>`status = 401` | 🟠 Critical |

---

### Module 2: Tra Cứu & Tìm Kiếm Phòng Trống (Room Catalog & Search)

| Test ID | Tên luồng nghiệp vụ | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Payload / Params) | Kết quả mong đợi (Expected Output) | Mức độ lỗi (Severity) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_ROOM_01** | Lấy toàn bộ danh mục loại phòng mở bán | Functional (Public API) | Có ít nhất 1 Loại phòng `is_active = true` | 1. Gửi `GET /api/v1/room-types` | Không | HTTP `200 OK`<br>Trả về mảng danh sách loại phòng kèm giá gốc, sức chứa, tiện ích, URL ảnh đại diện. | 🟠 Critical |
| **TC_ROOM_02** | Tìm kiếm phòng trống hợp lệ theo ngày | Functional (Search) | Loại phòng Deluxe có 5 phòng vật lý, 1 phòng đã đặt ngày 10-15 | 1. Gửi `GET /api/v1/room-types/search`<br>2. Kiểm tra `availableRooms` | Query: `checkIn=2026-11-10&checkOut=2026-11-15&guests=2&quantity=1` | HTTP `200 OK`<br>`availableRooms = 4`<br>`available = true`. | 🔴 Blocker |
| **TC_ROOM_03** | Tìm kiếm ngày nhận phòng trong quá khứ | Validation (Negative) | Không | 1. Gửi `GET /api/v1/room-types/search` với `checkIn` là ngày hôm qua | Query: `checkIn=2020-01-01&checkOut=2020-01-05&guests=2&quantity=1` | HTTP `400 Bad Request`<br>`message`: "Ngày nhận phòng không được là ngày trong quá khứ". | 🟡 Major |
| **TC_ROOM_04** | Tìm kiếm ngày trả phòng trước hoặc bằng ngày nhận phòng | Validation (Boundary) | Không | 1. Gửi `GET /api/v1/room-types/search` với `checkOut <= checkIn` | Query: `checkIn=2026-11-10&checkOut=2026-11-10&guests=2&quantity=1` | HTTP `400 Bad Request`<br>`message`: "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm". | 🟡 Major |
| **TC_ROOM_05** | Tìm kiếm với số khách vượt sức chứa loại phòng | Business Logic (Filter) | Loại phòng Standard chỉ chứa tối đa 2 người | 1. Gửi `GET /api/v1/room-types/search` với `guests=6` | Query: `checkIn=2026-11-10&checkOut=2026-11-12&guests=6&quantity=1` | HTTP `200 OK`<br>Loại phòng Standard bị lọc bỏ khỏi kết quả trả về. | 🟡 Major |
| **TC_ROOM_06** | Loại trừ phòng đang bảo trì (MAINTENANCE) khỏi năng lực phục vụ | Business Logic (Calculation) | Khách sạn có 3 phòng: 2 AVAILABLE, 1 MAINTENANCE | 1. Gửi request tra cứu phòng trống | Query: `checkIn=2026-11-10&checkOut=2026-11-12&guests=2&quantity=1` | HTTP `200 OK`<br>`availableRooms = 2` (phòng bảo trì tự động bị trừ khỏi tổng số phòng bán). | 🟠 Critical |

---

### Module 3: Đặt Phòng & Chống Trùng Lịch (Booking & Overbooking Prevention)

| Test ID | Tên luồng nghiệp vụ | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Payload / Params) | Kết quả mong đợi (Expected Output) | Mức độ lỗi (Severity) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_BOOK_01** | Khách hàng đặt phòng thành công (CASH) | Functional (Happy Path) | Loại phòng còn phòng trống trong khoảng lưu trú | 1. Đăng nhập Customer<br>2. Gửi request `POST /api/v1/bookings`<br>3. Kiểm tra DB | `{ "roomTypeId": 1, "checkIn": "2026-12-01", "checkOut": "2026-12-04", "quantity": 1, "guests": 2, "paymentMethod": "CASH", "note": "Tầng cao" }` | HTTP `201 Created`<br>Sinh `bookingCode` dạng `BK-YYYYMMDD-XXXXXX`<br>`totalPrice = 3 * đơn giá`<br>`depositAmount = 50% totalPrice`<br>`bookingStatus = PENDING`<br>`holdExpiresAt` được gán mốc 18:00 ngày check-in. | 🔴 Blocker |
| **TC_BOOK_02** | Đặt phòng chọn VNPay sinh URL thanh toán | Integration (Third-party) | Cổng VNPay Sandbox khả dụng | 1. Gửi `POST /api/v1/bookings` với `paymentMethod = "VNPAY"` | Payload tương tự `TC_BOOK_01` nhưng `"paymentMethod": "VNPAY"` | HTTP `201 Created`<br>Trả về trường `paymentUrl` hợp lệ chứa các query params: `vnp_Amount`, `vnp_TxnRef`, `vnp_SecureHash`.<br>`holdExpiresAt = created_at + 15 phút`. | 🔴 Blocker |
| **TC_BOOK_03** | Chống Overbooking: Chặn đặt phòng khi hết phòng khả dụng | Business Logic (Concurrency Rule) | Khách sạn chỉ có duy nhất 1 phòng Deluxe. Khách 1 đã đặt ngày 20-23/12 | 1. Khách 2 gửi request đặt phòng Deluxe ngày 21-24/12 (trùng 2 ngày) | `{ "roomTypeId": 1, "checkIn": "2026-12-21", "checkOut": "2026-12-24", "quantity": 1, "guests": 2, "paymentMethod": "CASH" }` | HTTP `409 Conflict`<br>`status = 409`<br>`message`: "Số phòng trống không đủ. Hiện còn 0 phòng, bạn yêu cầu 1 phòng".<br>Không tạo bản ghi rác trong DB. | 🔴 Blocker |
| **TC_BOOK_04** | Đặt phòng nối tiếp (Check-in ngày khách trước Check-out) | Business Logic (Interval Boundary) | Khách 1 đặt $[20/12, 23/12)$ | 1. Khách 2 gửi request đặt phòng ngày $[23/12, 25/12)$ | `{ "roomTypeId": 1, "checkIn": "2026-12-23", "checkOut": "2026-12-25", "quantity": 1, "guests": 2, "paymentMethod": "CASH" }` | HTTP `201 Created`<br>Hệ thống cho phép đặt thành công vì ngày 23/12 khách trước đã trả phòng trước 12:00. | 🟠 Critical |
| **TC_BOOK_05** | Đặt số lượng phòng vượt quá tổng số phòng của khách sạn | Validation (Boundary) | Khách sạn chỉ có tổng cộng 5 phòng Deluxe | 1. Khách gửi request đặt số lượng `quantity = 10` | `{ "roomTypeId": 1, "checkIn": "2026-12-10", "checkOut": "2026-12-12", "quantity": 10, "guests": 2, "paymentMethod": "CASH" }` | HTTP `409 Conflict`<br>`message`: "Số phòng trống không đủ...". | 🟠 Critical |
| **TC_BOOK_06** | Đặt loại phòng đã bị Admin vô hiệu hóa (`is_active = false`) | Business Logic (Integrity) | Loại phòng đã bị tắt mở bán | 1. Gửi request đặt loại phòng đã tắt | `{ "roomTypeId": 99, ... }` | HTTP `400 Bad Request` hoặc `404 Not Found`<br>`message`: "Loại phòng không tồn tại hoặc đã ngừng bán". | 🟡 Major |

---

### Module 4: Hủy Đặt Phòng & Chính Sách Phạt Cọc Mốc 14:00 (Cancellation & Refund)

| Test ID | Tên luồng nghiệp vụ | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Payload / Params) | Kết quả mong đợi (Expected Output) | Mức độ lỗi (Severity) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_CANCEL_01** | Hủy đơn PENDING chưa thanh toán tiền cọc | Functional (Happy Path) | Booking đang ở trạng thái `PENDING`, tiền đã trả = 0đ | 1. Customer gửi `POST /api/v1/bookings/{code}/cancel` | URL: `/api/v1/bookings/BK-001/cancel`<br>`{ "reason": "Bận việc đột xuất" }` | HTTP `200 OK`<br>`bookingStatus = CANCELLED`<br>`penaltyAmount = 0`<br>`refundAmount = 0`<br>Giải phóng quota phòng ngay lập tức. | 🔴 Blocker |
| **TC_CANCEL_02** | Hủy đơn trước Check-in $\ge 7$ ngày (Bậc 1: Miễn phí hủy) | Business Logic (Penalty Rule) | Đã cọc 50% VNPay (1,500,000đ). Thời điểm hủy cách check-in 10 ngày | 1. Customer gửi yêu cầu hủy phòng kèm thông tin tài khoản ngân hàng | `{ "reason": "Hủy sớm", "bankName": "MBBank", "accountNumber": "0987654321", "accountHolder": "NGUYEN VAN A" }` | HTTP `200 OK`<br>`penaltyAmount = 0đ`<br>`refundAmount = 1,500,000đ`<br>`paymentStatus = REFUND_PENDING`. | 🟠 Critical |
| **TC_CANCEL_03** | Hủy đơn trước Check-in từ 3 đến 7 ngày (Bậc 2: Phạt 30% tiền cọc) | Business Logic (Penalty Rule) | Đã cọc 50% (1,000,000đ). Thời điểm hủy cách check-in 4 ngày | 1. Customer gửi yêu cầu hủy phòng | Payload tương tự `TC_CANCEL_02` | HTTP `200 OK`<br>`penaltyAmount = 300,000đ` (30% cọc)<br>`refundAmount = 700,000đ`<br>`paymentStatus = REFUND_PENDING`. | 🟠 Critical |
| **TC_CANCEL_04** | Hủy đơn trước Check-in từ 1 đến 3 ngày (Bậc 3: Phạt 70% tiền cọc) | Business Logic (Penalty Rule) | Đã cọc 50% (1,000,000đ). Thời điểm hủy cách check-in 2 ngày | 1. Customer gửi yêu cầu hủy phòng | Payload tương tự `TC_CANCEL_02` | HTTP `200 OK`<br>`penaltyAmount = 700,000đ` (70% cọc)<br>`refundAmount = 300,000đ`<br>`paymentStatus = REFUND_PENDING`. | 🟠 Critical |
| **TC_CANCEL_05** | Hủy đơn trong vòng 24h hoặc sau mốc 14:00 (Bậc 4: Phạt 100% tiền cọc) | Business Logic (Penalty Rule) | Đã cọc 50% (1,000,000đ). Thời điểm hủy là 15:00 ngày check-in | 1. Customer gửi yêu cầu hủy phòng | Payload tương tự `TC_CANCEL_02` | HTTP `200 OK`<br>`penaltyAmount = 1,000,000đ`<br>`refundAmount = 0đ`<br>`paymentStatus = PARTIALLY_PAID` (giữ nguyên, không hoàn tiền). | 🟠 Critical |
| **TC_CANCEL_06** | Chặn Customer hủy đơn của tài khoản khác | Security (IDOR Prevention) | Booking của Customer A | 1. Customer B gửi request hủy booking của Customer A | Token: `Bearer <customer_B_token>`<br>URL: `/api/v1/bookings/<code_of_A>/cancel` | HTTP `403 Forbidden`<br>`message`: "Bạn không có quyền hủy đặt phòng này". | 🔴 Blocker |
| **TC_CANCEL_07** | Chặn hủy đơn khi đã hoàn tất Check-in | Business Logic (Integrity) | Booking đang ở trạng thái `CHECKED_IN` | 1. Customer cố tình gọi API hủy | URL: `/api/v1/bookings/<code_checked_in>/cancel` | HTTP `400 Bad Request`<br>`message`: "Không thể hủy đặt phòng ở trạng thái CHECKED_IN". | 🟠 Critical |

---

### Module 5: Vận Hành Lễ Tân & Gán Phòng Vật Lý (Receptionist Operations)

| Test ID | Tên luồng nghiệp vụ | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Payload / Params) | Kết quả mong đợi (Expected Output) | Mức độ lỗi (Severity) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_RECP_01** | Lễ tân xác nhận đơn đặt phòng PENDING | Functional (Operation) | Booking đặt tại quầy (CASH) trạng thái `PENDING` | 1. Lễ tân gửi `PUT /api/v1/receptionist/bookings/{id}/confirm` | ID booking cần xác nhận | HTTP `200 OK`<br>`bookingStatus` chuyển thành `CONFIRMED`. | 🟠 Critical |
| **TC_RECP_02** | Lễ tân làm thủ tục Check-in và gán phòng vật lý | Functional (Check-in) | Booking `CONFIRMED`, phòng vật lý 201 đang `AVAILABLE` | 1. Lễ tân gửi `POST /api/v1/receptionist/bookings/{id}/check-in` kèm danh sách phòng | `{ "roomIds": [ 201 ] }` | HTTP `200 OK`<br>`bookingStatus = CHECKED_IN`<br>Tạo bản ghi trong `booking_rooms`<br>Trạng thái phòng 201 chuyển sang `OCCUPIED`. | 🔴 Blocker |
| **TC_RECP_03** | Chặn gán phòng vật lý đang có khách hoặc đang dọn dẹp | Business Logic (Validation) | Phòng 201 đang `OCCUPIED` hoặc `CLEANING` | 1. Lễ tân cố tình chọn phòng 201 để check-in | `{ "roomIds": [ 201 ] }` | HTTP `409 Conflict`<br>`message` thông báo phòng 201 hiện không sẵn sàng tiếp đón khách. | 🔴 Blocker |
| **TC_RECP_04** | Gán thiếu hoặc thừa số lượng phòng so với đơn | Validation (Quantity Match) | Đơn đặt số lượng `quantity = 2` | 1. Lễ tân chỉ gán 1 phòng `roomIds: [201]` | `{ "roomIds": [ 201 ] }` | HTTP `400 Bad Request`<br>`message`: "Số lượng phòng gán phải khớp với số lượng phòng đã đặt (yêu cầu 2 phòng)". | 🟡 Major |
| **TC_RECP_05** | Check-out trả phòng và chuyển trạng thái dọn dẹp | Functional (Check-out) | Booking đang `CHECKED_IN`, phòng 201 đang `OCCUPIED` | 1. Lễ tân gọi `POST /api/v1/receptionist/bookings/{id}/check-out` | ID booking | HTTP `200 OK`<br>`bookingStatus = CHECKED_OUT`<br>Tất toán công nợ 50% còn lại<br>Phòng 201 tự động chuyển sang `CLEANING`. | 🟠 Critical |
| **TC_RECP_06** | Đánh dấu No-Show cho khách không đến nhận phòng | Business Logic (No-Show) | Booking `CONFIRMED`, quá 12:00 ngày check-in + 1 | 1. Lễ tân hoặc Cronjob gọi `POST /api/v1/receptionist/bookings/{id}/no-show` | ID booking | HTTP `200 OK`<br>`bookingStatus = NO_SHOW`<br>Tịch thu toàn bộ 100% tiền đặt cọc theo quy định. | 🟠 Critical |

---

### Module 6: Kiểm Thử Đồng Thời & Khả Năng Chịu Tải (Concurrency & Stress Testing)

| Test ID | Tên luồng nghiệp vụ | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Payload / Params) | Kết quả mong đợi (Expected Output) | Mức độ lỗi (Severity) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_CONC_01** | Kiểm thử Race Condition chống Overbooking (10 Luồng đồng thời) | Concurrency / Non-functional | Khách sạn chỉ còn duy nhất 1 phòng trống cuối cùng | 1. Sử dụng `ExecutorService` kích hoạt 10 threads đồng thời cùng gửi request đặt phòng trong 1 mili-giây | 10 requests giống hệt nhau cùng đặt 1 phòng vào cùng khoảng ngày | **Đúng 1 request thành công (HTTP 201)**.<br>**9 requests còn lại nhận HTTP 409 Conflict**.<br>Trong DB chỉ tồn tại đúng 1 booking được ghi nhận. Không xảy ra Deadlock. | 🔴 Blocker |
| **TC_CONC_02** | Xử lý Webhook VNPay IPN lặp lại (Idempotency Test) | Concurrency / Idempotency | Giao dịch thanh toán cọc VNPay đã được xử lý thành công trước đó | 1. Giả lập VNPay gửi lại request IPN lần thứ 2 với cùng `vnp_TxnRef` và `vnp_TransactionNo` | Payload IPN lặp lại từ VNPay | HTTP `200 OK` với mã phản hồi `{"RspCode":"02","Message":"Order already confirmed"}`.<br>Không cập nhật lại trạng thái hay cộng dồn tiền 2 lần. | 🔴 Blocker |

---

## 📊 3. Ma Trận Bao Phủ Kiểm Thử (Test Coverage Matrix)

| Nhóm chức năng (Module) | Số lượng Test Cases | Automated Test File | Postman Collection Request | Tỷ lệ tự động hóa |
| :--- | :---: | :--- | :--- | :---: |
| **1. Auth & Phân quyền RBAC** | 8 | `AuthIntegrationTest.java`<br>`SecurityRbacTest.java`<br>`HotelBookingFlowIntegrationTest.java` | Mục `01. Authentication & RBAC` | 100% |
| **2. Tra cứu & Lọc Loại phòng** | 6 | `RoomAvailabilityTest.java`<br>`HotelBookingFlowIntegrationTest.java` | Mục `02. Room Search & Catalog` | 100% |
| **3. Đặt phòng & Chống Overbooking** | 6 | `BookingConcurrencyTest.java`<br>`HotelBookingFlowIntegrationTest.java` | Mục `03. Booking & Overbooking Prevention` | 100% |
| **4. Hủy phòng & Phạt cọc 14:00** | 7 | `HotelBookingFlowIntegrationTest.java` | Mục `03. Booking & Overbooking Prevention` | 100% |
| **5. Vận hành Lễ tân (Check-in/Out)** | 6 | `ReceptionistBookingFilterTest.java` | Mục `04. Receptionist Operations` | 100% |
| **6. Chịu tải đồng thời (Race Condition)** | 2 | `BookingConcurrencyTest.java` | Script Stress Test đa luồng | 100% |
| **TỔNG CỘNG** | **35 Test Cases** | **Toàn bộ 35 Test Cases đều có mã kiểm thử tự động tương ứng** | | **100%** |

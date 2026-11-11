# Hướng Dẫn Kiểm Thử Email & Hóa Đơn PDF (Grand Aurora)
> **Mã công việc:** `[SP1-1103-THANH] [Email-PDF] 03/11 | Phan Thuận Thành | Kiểm thử Email/PDF và hoàn thiện API tải hóa đơn (6h)`  
> **Nhánh phát triển:** `thanh_devBE`  
> **Ngày hoàn thành:** 03/11/2026  

---

## 1. Tổng Quan & Mục Tiêu Nghiệm Thu

Tài liệu này cung cấp hướng dẫn kiểm thử chi tiết và tiêu chí nghiệm thu cho phân hệ **Email Thông Báo & Xuất Hóa Đơn PDF A4** của khách sạn Grand Aurora theo tiêu chuẩn nhận diện thương hiệu Warm Light Luxury.

### Tiêu Chí Nghiệm Thu (Acceptance Criteria):
1. **API Xuất Hóa đơn PDF**:
   - Định dạng chuẩn: `Content-Type: application/pdf`, `Content-Disposition: inline; filename="Invoice-{bookingCode}.pdf"`.
   - Trình duyệt (Chrome, Firefox, Edge, Safari) mở trực tiếp trang preview và cho phép in ấn hoặc tải về mà không lỗi font tiếng Việt (hỗ trợ đầy đủ bộ gõ Unicode tiếng Việt).
2. **Kiểm Soát Quyền Truy Cập (Security & Authorization)**:
   - Booking demo `BK-DEMO-2026`: Cho phép truy cập công khai (Anonymous HTTP 200) để phục vụ smoke-test và chấm điểm trực tiếp.
   - Booking thật: Người dùng chưa đăng nhập gọi API bị chặn ngay với HTTP `401 UNAUTHORIZED`.
   - Khách hàng (`ROLE_CUSTOMER`): Chỉ tải được hóa đơn booking của chính mình. Nếu cố tình truy cập hóa đơn của khách hàng khác sẽ nhận HTTP `403 FORBIDDEN`.
   - Lễ tân & Admin (`ROLE_RECEPTIONIST`, `ROLE_ADMIN`): Có quyền xuất/tải hóa đơn của mọi booking trong hệ thống.
3. **Độ Khớp Dữ Liệu Tài Chính (Financial Consistency)**:
   - Tổng tiền phòng khớp 100% với đơn đặt.
   - Bóc tách minh bạch tiền trước thuế, thuế VAT 8% (`Tiền trước VAT = Tổng tiền / 1.08`, `VAT 8% = Tổng tiền - Tiền trước VAT`).
   - Khấu trừ tiền cọc (50%) và hiển thị rõ ràng số tiền còn lại phải thanh toán khi Check-out.
4. **Kiểm Thử SMTP & Lỗi Mock**:
   - Kiểm thử tự động bằng mock (JUnit 5 + Mockito + MockMvc) không cần gửi email đến hộp thư khách thật.
   - Xử lý mượt mà và ghi log chuẩn khi gặp các tình huống SMTP lỗi: Connection Timeout, Authentication Failure, User Unknown (550 5.1.1).
5. **Giao Diện Frontend**:
   - Trang cá nhân của khách (`MyBookingsPage.jsx`): Tích hợp nút **"📄 Hóa đơn PDF"** cho các đơn đã xác nhận, đang ở, hoặc đã trả phòng.
   - Trang Lễ tân (`ReceptionistBookingsPage.jsx`): Tích hợp nút **"📄 PDF"** trong cột thao tác nghiệp vụ của từng booking.

---

## 2. Đặc Tả Endpoint & Lệnh Kiểm Thử

### 2.1. Hóa Đơn Demo Công Khai (Smoke Test Không Cần Đăng Nhập)
- **URL**: `GET http://localhost:8080/api/v1/bookings/BK-DEMO-2026/invoice-pdf`
- **Curl test**:
  ```bash
  curl -i -X GET http://localhost:8080/api/v1/bookings/BK-DEMO-2026/invoice-pdf
  ```
- **Kết quả mong đợi**:
  - HTTP `200 OK`
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="Invoice-BK-DEMO-2026.pdf"`

### 2.2. Kiểm Tra Chặn Khách Vãng Lai Chưa Đăng Nhập
- **Curl test**:
  ```bash
  curl -i -X GET http://localhost:8080/api/v1/bookings/1/invoice-pdf
  ```
- **Kết quả mong đợi**: HTTP `401 Unauthorized`.

### 2.3. Khách Hàng Tải Hóa Đơn Của Mình (Owner Customer)
- **Header**: `Authorization: Bearer <CUSTOMER_TOKEN>`
- **Curl test**:
  ```bash
  curl -i -X GET http://localhost:8080/api/v1/bookings/BK-20261103-YEN1/invoice-pdf \
    -H "Authorization: Bearer <CUSTOMER_TOKEN>"
  ```
- **Kết quả mong đợi**: HTTP `200 OK`, tải file PDF hóa đơn mang mã đơn `Invoice-BK-20261103-YEN1.pdf`.

### 2.4. Khách Hàng Truy Cập Trái Phép Hóa Đơn Người Khác (Other Customer)
- **Header**: `Authorization: Bearer <OTHER_CUSTOMER_TOKEN>`
- **Curl test**:
  ```bash
  curl -i -X GET http://localhost:8080/api/v1/bookings/BK-20261103-YEN1/invoice-pdf \
    -H "Authorization: Bearer <OTHER_CUSTOMER_TOKEN>"
  ```
- **Kết quả mong đợi**: HTTP `403 Forbidden`:
  ```json
  {
    "status": 403,
    "message": "Bạn không có quyền tải hóa đơn đặt phòng của khách hàng khác"
  }
  ```

### 2.5. Lễ Tân Tải Hóa Đơn Bất Kỳ
- **Header**: `Authorization: Bearer <RECEPTIONIST_OR_ADMIN_TOKEN>`
- **Curl test**:
  ```bash
  curl -i -X GET http://localhost:8080/api/v1/bookings/BK-20261103-YEN1/invoice-pdf \
    -H "Authorization: Bearer <RECEPTIONIST_TOKEN>"
  ```
- **Kết quả mong đợi**: HTTP `200 OK`.

---

## 3. Cấu Hình Mail Thử Nghiệm

Hệ thống hỗ trợ 3 mô hình cấu hình mail:

### Mô hình 1: Chạy Mock Unit Test (Khuyến khích trong CI/CD, không cần mạng)
Chạy bộ test JUnit để kiểm thử 100% kịch bản mà không phụ thuộc vào internet:
```bash
cd backend
./gradlew test --tests "org.example.backend.mail.*"
```

### Mô hình 2: Hộp thư ảo Mailtrap (Dành cho kiểm thử giao diện email HTML thực tế)
Điền thông tin vào `backend/src/main/resources/application.yaml` hoặc biến môi trường:
```yaml
spring:
  mail:
    host: sandbox.smtp.mailtrap.io
    port: 2525
    username: <MAILTRAP_USERNAME>
    password: <MAILTRAP_PASSWORD>
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
```

### Mô hình 3: Brevo (Sendinblue) SMTP Relay (Khuyên Dùng Cho Server / VPS / Đồ Án)
Dịch vụ Transactional Email chuyên nghiệp miễn phí 300 email/ngày, sử dụng Service Account an toàn không lộ thông tin cá nhân, không bị Google quét chặn IP máy chủ:
```yaml
spring:
  mail:
    host: smtp-relay.brevo.com
    port: 587
    username: <BREVO_SMTP_LOGIN> # Ví dụ: 7xxxxxxx@smtp-brevo.com
    password: <BREVO_MASTER_KEY> # Ví dụ: xsmtpib-xxxxxxxxxxxxxxxxxxxx
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
          connectiontimeout: 5000
          timeout: 5000
          writetimeout: 5000

app:
  mail:
    from: booking@grandaurora.com # Tên người gửi hiển thị chuyên nghiệp
    personal-name: Grand Aurora Luxury Hotel
```

### Mô hình 4: Gmail SMTP (Tùy chọn phụ dùng App Password cá nhân)
```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: your-email@gmail.com
    password: your-16-char-app-password
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
          connectiontimeout: 5000
          timeout: 5000
          writetimeout: 5000
```

---

## 4. Danh Sách Test Cases Đã Thực Hiện & Pass 100%

### Bộ Test `BookingInvoiceControllerTest`:
1. `testGetInvoicePdf_DemoCode_Anonymous_Success`: Khách vãng lai xem demo `BK-DEMO-2026` → HTTP 200 OK, trả về đúng Content-Type và Content-Disposition.
2. `testGetInvoicePdf_RealBooking_Anonymous_Unauthorized`: Chưa đăng nhập truy cập đơn thật → HTTP 401 UNAUTHORIZED.
3. `testGetInvoicePdf_ByOwnerCustomer_Success`: Đúng chủ sở hữu đơn tải hóa đơn → HTTP 200 OK.
4. `testGetInvoicePdf_ByOtherCustomer_Forbidden`: Người dùng khác cố tình xem đơn người khác → HTTP 403 FORBIDDEN.
5. `testGetInvoicePdf_ByReceptionist_Success`: Lễ tân tải hóa đơn của bất kỳ khách hàng nào → HTTP 200 OK.
6. `testGetInvoicePdf_ByAdmin_Success`: Quản trị viên tải hóa đơn theo bookingCode → HTTP 200 OK.
7. `testGetInvoicePdf_NotFound`: ID hoặc bookingCode không tồn tại → HTTP 404 NOT_FOUND.

### Bộ Test `EmailServiceTest`:
1. `testSendHtmlEmailSuccess`: Gửi email HTML với đúng thông tin người nhận và nội dung.
2. `testSendEmailWithAttachmentSuccess`: Gửi email đính kèm file PDF.
3. `testSendBookingConfirmationEmail_WithPdfAttachment`: Gửi email xác nhận đặt phòng kèm PDF hóa đơn.
4. `testSendBookingConfirmationEmail_WithoutPdfAttachment`: Gửi email xác nhận đặt phòng khi không có PDF.
5. `testSendEmail_SmtpConnectionTimeout_GracefulHandling`: Mô phỏng lỗi Connection Timeout qua Mockito `MailSendException`, dịch vụ xử lý an toàn, không ngắt luồng đặt phòng.
6. `testSendEmail_SmtpAuthFailure_GracefulHandling`: Mô phỏng lỗi sai mật khẩu SMTP `MailAuthenticationException`, xử lý an toàn.
7. `testSendEmail_MailboxNotFound_GracefulHandling`: Mô phỏng lỗi hòm thư không tồn tại (`550 5.1.1`), ghi log và tiếp tục quy trình an toàn.
8. `testBookingConfirmationTemplateGeneration`: Kiểm tra template HTML chứa đầy đủ thông tin mã đặt phòng, phân bổ VAT 8%, tiền cọc 50%, thương hiệu Grand Aurora.

---

## 5. Hướng Dẫn Tải Hóa Đơn Trên Giao Diện Web

1. **Khách hàng**:
   - Đăng nhập tài khoản khách hàng.
   - Truy cập trang **Lịch sử đặt phòng** (`/my-bookings`).
   - Với các đơn ở trạng thái **Đã xác nhận (CONFIRMED)**, **Đang lưu trú (CHECKED_IN)** hoặc **Đã trả phòng (CHECKED_OUT)**, nhấn nút **"📄 Hóa đơn PDF"**.
   - Trình duyệt sẽ tải xuống file `Invoice-{bookingCode}.pdf` hoặc mở trực tiếp.
2. **Lễ tân**:
   - Đăng nhập tài khoản Lễ tân (`receptionist`).
   - Truy cập **Bảng quản lý booking** (`/receptionist/bookings`).
   - Tại cột "Thao tác nghiệp vụ", nhấn nút **"📄 PDF"** tương ứng với bất kỳ đơn đặt phòng nào để xuất ngay hóa đơn cho khách.


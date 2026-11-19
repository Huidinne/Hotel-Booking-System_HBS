# ĐẶC TẢ YÊU CẦU DỰ ÁN (SRS)
# HOTEL BOOKING SYSTEM (MVP)

**Mã dự án:** PRJ-HOTEL-BOOKING-HBS-01  
**Tên dự án:** Hotel Booking System (Grand Aurora Luxury Hotel)  
**Phiên bản tài liệu:** 2.3 – Bổ sung Dịch vụ phòng & Xe đưa đón  
**Loại tài liệu:** Software Requirements Specification (SRS) / Architectural Design  
**Quy mô nhóm:** 5 thành viên (1 Leader/Architect, 2 Backend, 1 Frontend, 1 QA/DevOps)  
**Phạm vi:** Hệ thống đặt phòng trực tuyến & quản lý lưu trú toàn diện cho khách sạn độc lập  
**Kiến trúc:** Modular Monolith (Spring Boot 3.3.5 + React 19/Vite + MySQL 8.0)  
**Trạng thái:** Bản đặc tả hoàn thiện sau Review 1, tích hợp hệ thống 4 Lược đồ chức năng chi tiết & 10 Module mở rộng Phase 2; FR-21 và FR-22 là yêu cầu bổ sung, chưa khẳng định đã triển khai

## Quy ước về nguồn yêu cầu

Tài liệu sử dụng hai nhãn để phân biệt nguồn yêu cầu:

- **[Mẫu]**: Yêu cầu hoặc định hướng kế thừa từ SRS Rikkei E-Commerce QuickShop (MVP) của giảng viên, bao gồm bố cục tài liệu, công nghệ nền tảng, Docker, GitHub Actions, yêu cầu bảo mật, hiệu năng, giao diện responsive và tiêu chí đánh giá (60% Chức năng / 40% Phi chức năng).
- **[Đề xuất]**: Nghiệp vụ và kiến trúc được thiết kế riêng cho Hotel Booking System: Mô hình đặt theo Loại phòng (Room Type) gán $N$ phòng vật lý khi Check-in; quy trình xác nhận đơn trước khi nhận phòng; tích hợp cọc VNPay Sandbox kèm kiểm tra Idempotent; chính sách hủy/phạt cọc chuẩn mốc 14:00; Cronjob hủy đơn chưa cọc lúc 18:00 và xử lý No-Show; chống Overbooking bằng Pessimistic Lock trên Loại phòng.

---

# 1. Tổng quan dự án (Project Overview)

## 1.1. Mục đích tài liệu

**[Mẫu]** Tài liệu SRS xác định phạm vi, yêu cầu chức năng, yêu cầu phi chức năng, công nghệ và tiêu chí đánh giá của sản phẩm MVP. Tài liệu được dùng làm căn cứ chính thức để phân chia công việc, phát triển song song giữa Frontend & Backend, kiểm thử và nghiệm thu đồ án.

**[Đề xuất]** Hotel Booking System cung cấp nền tảng quản lý và kinh doanh phòng nghỉ cho một khách sạn độc lập. Hệ thống hỗ trợ khách hàng tìm kiếm phòng theo khoảng ngày, đặt nhiều phòng cùng loại, thanh toán cọc 50% qua VNPay Sandbox (giữ chỗ 15 phút) hoặc thanh toán tại quầy, tự hủy phòng và hoàn cọc theo bậc thang thời gian. Hệ thống cung cấp công cụ cho Lễ tân xác nhận đơn, gán $N$ phòng vật lý khi Check-in, quản lý buồng phòng (`AVAILABLE`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`), xử lý trả phòng đối soát công nợ, duyệt hoàn cọc và theo dõi thống kê doanh thu/công suất phòng.

**[Đề xuất – Mở rộng]** Bổ sung dịch vụ phòng do Lễ tân ghi nhận cho khách đang lưu trú (đồ ăn, đồ uống và báo sự cố sửa chữa); khách có thể đăng ký xe đón về khách sạn khi đặt phòng. Admin quản lý danh mục món, gói xe và theo dõi vận hành; phí phát sinh được đối soát cùng booking.

## 1.2. Mục tiêu dự án

1. **Khách hàng:** Tìm phòng theo khoảng ngày lưu trú $[CheckIn, CheckOut)$; đặt từ 1 đến nhiều phòng thuộc Loại phòng; thanh toán cọc 50% qua VNPay hoặc chọn trả tại khách sạn; quản lý lịch sử đặt phòng và gửi yêu cầu hủy phòng hoàn cọc minh bạch.
2. **Lễ tân & Vận hành:** Xác nhận các đơn đặt phòng (`CONFIRMED`); thực hiện Check-in bằng cách gán đúng số lượng phòng vật lý còn trống; chuyển trạng thái phòng dọn dẹp sau Check-out; đối soát và tất toán booking; xử lý chuyển hoàn tiền cọc có bảo mật thông tin tài khoản.
3. **Kỹ thuật & Kiến trúc:** Áp dụng kiến trúc **Modular Monolith** với kiến trúc phân lớp (Layered Architecture); kiểm soát đồng thời và chống Overbooking bằng **Pessimistic Locking (`PESSIMISTIC_WRITE`)**; phân tách rõ ràng giữa trạng thái thanh toán tổng thể và trạng thái từng giao dịch; tích hợp VNPay IPN có xác thực chữ ký và Idempotency; bảo mật xác thực JWT.
4. **DevOps & Tự động hóa:** Đóng gói bằng **Docker & Docker Compose**; CI/CD tự động kiểm thử và triển khai lên **VPS** qua **GitHub Actions**; Cronjob định kỳ tự động xử lý đơn hết hạn.
5. **Dịch vụ bổ sung:** Gắn yêu cầu gọi món/sửa chữa với đúng lượt lưu trú và phòng vật lý; quản lý đăng ký xe ghép/đoàn hoặc xe riêng; minh bạch giá, trạng thái xử lý và khoản phải thu.

## 1.3. Phạm vi dự án

### 1.3.1. Phạm vi thực hiện (In-Scope MVP)
- **Xác thực & Người dùng:** Đăng ký, đăng nhập JWT (Access Token 15–30 phút + Refresh Token 7 ngày), phân quyền 3 vai trò: `ROLE_CUSTOMER`, `ROLE_RECEPTIONIST`, `ROLE_ADMIN`.
- **Danh mục Loại phòng & Phòng vật lý:** Phân cấp rõ rệt giữa Loại phòng (Room Type - bán cho khách) và Phòng vật lý (Room - gán khi nhận phòng). Quản lý trạng thái buồng phòng gồm 4 trạng thái: `AVAILABLE`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`.
- **Tìm kiếm & Chống Overbooking:** Tìm kiếm phòng trống theo số khách và khoảng ngày $[CheckIn, CheckOut)$; Transaction kiểm tra quota với Pessimistic Lock trên Loại phòng; hỗ trợ đặt số lượng $N$ phòng; quản lý thời hạn giữ chỗ thống nhất qua `hold_expires_at` cho cả đơn online và đơn trả sau.
- **Thanh toán & Giao dịch:** Tích hợp cổng thanh toán **VNPay Sandbox** (đặt cọc 50%, thời hạn giữ chỗ 15 phút); ghi nhận thanh toán tiền mặt/chuyển khoản tại quầy; tách biệt `PaymentStatus` và `PaymentTransactionStatus`; kiểm tra chữ ký HMAC-SHA512 và chống trùng lặp IPN.
- **Quy trình Booking & Lưu trú:** Quy định bắt buộc đơn phải được xác nhận (`CONFIRMED`) trước khi Check-in; gán đủ $N$ phòng vật lý khi Check-in; đối soát thanh toán đủ 100% khi Check-out; chuyển phòng sang `CLEANING` trước khi sẵn sàng đón khách mới.
- **Chính sách Hủy phòng & Xử lý No-Show:**
  - Hủy phòng tính phạt chuẩn mốc **14:00 ngày Check-in** (trước $\ge 24h$: hoàn 100%; 12h–24h: phạt 30% cọc; < 12h: phạt 50% cọc; sau 14:00: phạt 100% cọc).
  - Quy định hoàn tiền khi đã thanh toán nhiều hơn cọc/100%: chỉ phạt trên hạn mức cọc 50%, hoàn 100% phần thanh toán vượt cọc.
  - Chặn tuyệt đối việc hủy đơn đối với booking đã `CHECKED_IN`, `CHECKED_OUT`, hoặc `NO_SHOW`.
  - Tự động hủy đơn chưa cọc / chưa xác nhận khi quá hạn `hold_expires_at` (sau 24h với đơn đặt trước hoặc sau 18:00 ngày Check-in).
  - Xử lý No-Show đối với đơn nhiều đêm: giữ phòng đêm đầu đến 12:00 ngày $CheckIn + 1$; đúng 12:00 chuyển `NO_SHOW`, giải phóng toàn bộ quota các đêm còn lại ngay lập tức; giữ 100% cọc (50%), hoàn lại tiền các đêm chưa ở nếu khách đã thanh toán 100%.
- **Dashboard Quản trị:** Báo cáo doanh thu dự kiến, doanh thu thực thu (đã trừ hoàn cọc), tỷ lệ lấp đầy phòng (Occupancy Rate) và cơ cấu buồng phòng.
- **Đóng gói & CI/CD:** Docker Compose (Frontend, Backend, MySQL), GitHub Actions kiểm tra tự động và triển khai VPS.
- **Mở rộng sau MVP (FR-21, FR-22):** Dịch vụ phòng qua Lễ tân; danh mục món và giá; phiếu báo sự cố; đăng ký xe đón gắn booking; danh mục gói xe, điều phối thủ công và quyết toán phí dịch vụ. Chi tiết trong mục 5.4; không mặc định các chức năng này đã hoàn thành.

### 1.3.2. Ngoài phạm vi MVP (Out-of-Scope)
- Chuỗi nhiều khách sạn (Multi-property).
- Gọi API tự động hoàn tiền trực tiếp của VNPay (sử dụng quy trình duyệt hoàn cọc thủ công để đảm bảo an toàn).
- Ứng dụng di động native (tập trung Web Responsive).
- Quản lý kho nguyên liệu, định lượng món, mini-bar tự động và hệ thống nhà hàng/POS đầy đủ. Gọi món qua Lễ tân, báo sự cố phòng và đăng ký xe đưa đón thuộc phần mở rộng FR-21, FR-22.
- Điều phối đội xe tự động, GPS, tài khoản tài xế và tích hợp hãng vận tải bên ngoài; chưa triển khai chuyến trả khách sau Check-out trong đợt mở rộng này.
- Kiến trúc Microservices phân tán.

## 1.4. Đối tượng sử dụng (Actors)

| Actor            | Mô tả                    | Quyền hạn chính                                                                                                                                                                                                                                                                                    |
|------------------|--------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Customer**     | Khách hàng của khách sạn | Đăng ký, đăng nhập, tìm kiếm phòng, tạo booking (chọn số lượng phòng), thanh toán cọc VNPay, xem lịch sử đặt phòng, gửi yêu cầu hủy phòng nhận lại tiền hoàn theo chính sách.                                                                                                                            |
| **Receptionist** | Nhân viên lễ tân         | Xem bảng danh sách booking; duyệt xác nhận đơn (`PENDING` $\to$ `CONFIRMED`); thực hiện Check-in và gán $N$ phòng vật lý; Check-out và đối soát thu tiền; cập nhật trạng thái phòng dọn dẹp (`CLEANING` $\to$ `AVAILABLE`); thực hiện chuyển khoản hoàn cọc và xác nhận `REFUNDED`; xử lý No-Show. |
| **Admin**        | Quản lý khách sạn        | Toàn quyền như Lễ tân; quản lý danh mục Loại phòng (giá cơ bản, tiện nghi, upload ảnh Cloudinary); quản lý danh sách Phòng vật lý và bảo trì; quản lý tài khoản nhân viên; xem Dashboard tài chính và công suất phòng.                                                                             |

**Quyền bổ sung Phase 2:** Customer chọn/tra cứu yêu cầu xe của booking cá nhân và xem khoản phí trên chi tiết booking; Receptionist lập đơn món, phiếu sự cố, duyệt và cập nhật yêu cầu xe, đối soát phí; Admin có toàn bộ quyền vận hành và quản trị món/gói xe. Không thêm vai trò Bếp, Kỹ thuật hoặc Tài xế trong phiên bản này; Lễ tân cập nhật kết quả sau khi phối hợp nhân viên ngoài hệ thống.

## 1.5. Phân công vai trò nhóm 5 thành viên

| Thành viên   | Vai trò                        | Trách nhiệm chính                                                                                                                                                                                                                                                                 |
|--------------|--------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Member 1** | Team Lead / Backend Architect  | Thiết kế kiến trúc Modular Monolith; thiết kế Database ERD & API Contract; phát triển module `auth` (Spring Security, JWT) và module `payment` (tích hợp VNPay, kiểm tra checksum HMAC, chống xử lý lặp IPN, quản lý giao dịch).                                                  |
| **Member 2** | Backend Developer              | Phát triển module `room` (CRUD RoomType, Room, trạng thái phòng) và module `booking` (Pessimistic Lock chống overbooking, logic đặt $N$ phòng, gán phòng khi check-in, hủy phòng hoàn cọc bậc thang, Cronjob quét `hold_expires_at` & No-Show 12:00).                                                    |
| **Member 3** | Frontend Developer (Customer)  | Xây dựng giao diện Khách hàng (ReactJS, Vite, Tailwind CSS): Trang chủ, tìm kiếm ngày & số khách, danh sách & chi tiết loại phòng, chọn số lượng phòng, chuyển hướng thanh toán VNPay, lịch sử booking, form hủy phòng nhập tài khoản ngân hàng.                                  |
| **Member 4** | Frontend Developer (Admin/Ops) | Xây dựng giao diện Quản trị: Bảng quản lý Booking (Table View với bộ lọc đa tiêu chí), Modal duyệt đơn & Check-in (chọn $N$ phòng trống), Modal Check-out đối soát, Quản lý trạng thái buồng phòng (dọn phòng), Màn hình đối soát hoàn cọc (che số tài khoản), Dashboard số liệu. |
| **Member 5** | QA / Tester & DevOps Engineer  | Viết Test Plan & Unit/Integration Tests (JUnit 5, Mockito); kiểm thử tải đồng thời bằng Apache JMeter; viết Dockerfile, docker-compose.yml; thiết lập GitHub Actions CI/CD tự động deploy VPS; cấu hình Nginx Reverse Proxy và SSL Let's Encrypt.                                 |

**Phân công phần bổ sung:** Leader chốt nghiệp vụ, ERD/API và review tích hợp; Backend chia module `roomservice` và `transfer`; Frontend triển khai form khách hàng cùng màn hình Lễ tân/Admin; QA/DevOps kiểm thử phân quyền, đồng thời, quyết toán và migration trên VPS. Giữ nguyên bảng vai trò ở trên; phân công người và giờ cụ thể trên Trello.

## 1.6. Sản phẩm bàn giao (Deliverables)

1. Mã nguồn hoàn chỉnh gồm `/frontend`, `/backend`, `/database` trên GitHub với lịch sử đóng góp cân đối từ cả 5 tài khoản cá nhân.
2. Tệp `compose.yaml` khởi chạy trơn tru 3 dịch vụ: Frontend (Nginx), Backend (Spring Boot), Database (MySQL 8).
3. Pipeline GitHub Actions hoàn thiện: CI kiểm thử tự động trên Pull Request và CD tự động triển khai lên VPS khi merge vào nhánh `main`.
4. Cơ sở dữ liệu MySQL với schema chuẩn và seed data mẫu quản lý qua Flyway (`V1__init_schema.sql`, `V2__seed_data.sql`).
5. Tài liệu đặc tả SRS v2.3, Database ERD Diagram, Swagger/OpenAPI Documentation.
6. Bộ Test Cases và Báo cáo kiểm thử kết quả (Test Report) đạt tỷ lệ Pass $\ge 80\%$.
7. Đường dẫn hệ thống hoạt động thực tế trên VPS có thể truy cập qua Internet.
8. Phần mở rộng bàn giao thêm migration, seed món/gói xe, API/DTO, giao diện dịch vụ phòng và xe đưa đón, cùng kết quả kiểm thử FR-21/FR-22. Các tệp ảnh sơ đồ `diagrams/*.png` và `*.svg` cần xuất lại từ mã Mermaid đã cập nhật trước nghiệm thu.

---

# 2. Phạm vi tính năng chi tiết (MVP Feature Scope)

## 2.1. Phân hệ Xác thực & Phân quyền (Authentication & Authorization)
- Đăng ký tài khoản khách hàng mới (xác thực email duy nhất, định dạng mật khẩu an toàn).
- Đăng nhập hệ thống, cấp phát **Access Token (thời hạn 15–30 phút)** và **Refresh Token (thời hạn 7 ngày)**.
- Endpoint làm mới token an toàn (`/api/v1/auth/refresh`), thu hồi Refresh Token khi đăng xuất.
- Phân quyền nghiêm ngặt tại Backend bằng `@PreAuthorize` cho 3 vai trò: `CUSTOMER`, `RECEPTIONIST`, `ADMIN`.

## 2.2. Phân hệ Danh mục & Tra cứu Phòng trống (Room Catalog & Search)
- Quản lý danh mục **Loại phòng (Room Type)**: Tên, mô tả, sức chứa tiêu chuẩn, tiện ích, giá cơ bản theo đêm, danh sách hình ảnh (lưu Cloudinary).
- Quản lý danh sách **Phòng vật lý (Room)**: Mã phòng (vd: 101, 102), tầng, thuộc Loại phòng nào.
- Trạng thái buồng phòng 4 mức: `AVAILABLE` (Sẵn sàng), `OCCUPIED` (Có khách), `CLEANING` (Đang dọn dẹp), `MAINTENANCE` (Đang sửa chữa).
- Bộ lọc tìm kiếm: Ngày nhận phòng, ngày trả phòng (ràng buộc `Check-out > Check-in` ít nhất 1 ngày) và số lượng khách $\to$ Backend tính toán số lượng phòng khả dụng theo từng loại phòng.
- **[Mở rộng] Danh mục dịch vụ:** Admin quản lý món ăn/đồ uống (tên, nhóm, đơn vị, giá VND, ảnh tùy chọn, trạng thái bán) và gói xe (tên, loại xe ghép/riêng, tuyến, số khách tối đa, cách tính giá, mức phí, trạng thái hoạt động). Ngừng bán thay vì xóa bản ghi đã được sử dụng.

## 2.3. Phân hệ Đặt phòng & Chống Overbooking (Booking Management)
- Khách hàng chọn Loại phòng và **số lượng phòng cần đặt ($N \ge 1$)**.
- Thuật toán kiểm tra khả dụng kết hợp **Pessimistic Lock (`PESSIMISTIC_WRITE`)** trên bản ghi `RoomType`. Chỉ cho phép tạo booking nếu số phòng khả dụng $\ge N$.
- Lưu Snapshot đơn giá tại thời điểm đặt (`price_per_night`) cho từng phòng vào bảng chi tiết đặt phòng, tính tổng tiền:
  $$\text{Tổng tiền phòng} = \text{Đơn giá snapshot} \times \text{Số đêm lưu trú} \times N$$
- Số tiền cọc quy chuẩn: Đúng **50% tổng tiền phòng**.
- **[Mở rộng] Đăng ký xe khi đặt phòng:** Form có lựa chọn Không sử dụng / Xe ghép hoặc theo đoàn / Xe riêng. Nếu sử dụng, chọn gói, thời gian, điểm đón, số người, số điện thoại liên hệ và ghi chú. Backend lưu yêu cầu `PENDING` cùng booking trong một transaction; xác nhận booking không đồng nghĩa xác nhận có xe. Giá xe tách riêng, không tham gia cọc 50% tiền phòng.

## 2.4. Phân hệ Thanh toán & Quản lý Giao dịch (Payment & Transactions)
- **Tách biệt trạng thái:**
  - Trạng thái tổng thể của Booking (`PaymentStatus`): `UNPAID`, `PARTIALLY_PAID` (Đã cọc 50%), `FULLY_PAID` (Đã đủ 100%), `REFUND_PENDING` (Chờ hoàn cọc/tiền thừa), `REFUNDED` (Đã hoàn tiền).
  - Trạng thái từng giao dịch (`PaymentTransactionStatus`): `PENDING`, `SUCCESS`, `FAILED`, `EXPIRED`.
- **Thanh toán Online (VNPay Sandbox) & Xử lý Giữ chỗ 15 phút:**
  - Khách chọn VNPay $\to$ Hệ thống sinh URL thanh toán cọc 50% với thời hạn giữ chỗ đúng **15 phút** (`hold_expires_at = created_at + 15m`).
  - Xử lý IPN Webhook: Xác minh chữ ký bảo mật HMAC-SHA512, đối soát đúng số tiền cọc, kiểm tra mã giao dịch duy nhất (Idempotent - không cộng trùng nếu VNPay gửi IPN nhiều lần).
  - **Trường hợp thanh toán đúng hạn (< 15 phút):** Giao dịch chuyển `SUCCESS`, `PaymentStatus` chuyển `PARTIALLY_PAID`, Booking tự động chuyển `CONFIRMED`.
  - **Trường hợp hết hạn 15 phút mà chưa thanh toán:** Giao dịch tự động chuyển `EXPIRED`, Booking tự động chuyển `CANCELLED` (Lý do: `PAYMENT_EXPIRED`), quota phòng được giải phóng ngay lập tức cho người khác.
  - **Trường hợp Thanh toán đến muộn (Late IPN Handling):** Nếu VNPay gửi IPN báo thanh toán thành công sau khi giao dịch đã bị đánh dấu `EXPIRED` hoặc Booking đã bị `CANCELLED`:
    - Backend mở Transaction có Pessimistic Lock kiểm tra lại khả dụng phòng ($AvailableRooms$):
      - *Nếu vẫn còn phòng:* Tái kích hoạt Booking $\to$ Giao dịch chuyển `SUCCESS`, `PaymentStatus` chuyển `PARTIALLY_PAID`, Booking chuyển `CONFIRMED`.
      - *Nếu đã hết phòng (người khác đã đặt mất):* Hệ thống **tuyệt đối không xác nhận booking** (ngăn chặn Overbooking). Giao dịch được ghi nhận `SUCCESS`, Booking giữ nguyên `CANCELLED`, và `PaymentStatus` tự động chuyển sang **`REFUND_PENDING`** (hoàn 100% tiền cọc) để Lễ tân/Admin ưu tiên chuyển khoản hoàn trả tiền cọc cho khách.
- **Thanh toán tại khách sạn & Quy định giữ chỗ:**
  - Khách chọn trả sau tại khách sạn $\to$ Booking được tạo ở trạng thái `PENDING`, `PaymentStatus` là `UNPAID`.
  - Hệ thống thiết lập thời hạn giữ chỗ tạm thời (`hold_expires_at`):
    - *Đặt trước ngày nhận phòng $\ge 24\text{ giờ}$ (ví dụ đặt cho tuần sau, tháng sau):* Hệ thống tạm giữ quota **24 giờ** kể từ thời điểm tạo đơn (`hold_expires_at = created_at + 24h`) để Lễ tân liên hệ khách xác nhận nhu cầu.
    - *Đặt sát ngày hoặc trong ngày nhận phòng ($< 24\text{ giờ}$ trước giờ check-in):* Hệ thống giữ quota tối đa đến **18:00 ngày Check-in** (`hold_expires_at = min(created_at + 2h, check_in_date 18:00)`).
  - Trong thời gian `hold_expires_at` còn hiệu lực, đơn giữ nguyên quota cho toàn bộ khoảng lưu trú $[CheckIn, CheckOut)$ để tránh bị đặt trùng.
  - Khi Lễ tân liên hệ khách thành công và bấm "Xác nhận đơn" $\to$ Booking chuyển sang `CONFIRMED`, tiếp tục giữ quota phòng suốt khoảng lưu trú cho tới khi Check-in / Check-out.
  - Nếu quá `hold_expires_at` mà Lễ tân chưa bấm xác nhận $\to$ Cronjob tự động chuyển Booking sang `CANCELLED` (Lý do: `UNCONFIRMED_TIMEOUT`), giải phóng quota phòng cho khách khác.
- **Thanh toán đối soát tại quầy:** Lễ tân ghi nhận thu tiền mặt / chuyển khoản đối soát khi nhận phòng hoặc trả phòng.
- **[Mở rộng] Quyết toán dịch vụ:** Giữ `total_price`/`totalAmount` là tiền phòng; bổ sung `roomServiceAmount`, `transferAmount`, `grandTotal`, `netPaidAmount`, `remainingAmount`. Chỉ đơn món `DELIVERED` và chuyến xe `COMPLETED` được ghi nhận phải thu; yêu cầu sửa chữa không có phí mặc định.
- `grandTotal = totalAmount + roomServiceAmount + transferAmount`; `netPaidAmount = tổng giao dịch SUCCESS − tổng hoàn tiền đã thực hiện`; `remainingAmount = grandTotal − netPaidAmount`. Nếu số dư âm, hiển thị tiền cần hoàn và đối soát trước khi đóng booking. Không cộng lại phí tại mỗi lần tải trang hoặc retry.
- `FULLY_PAID` phản ánh đủ tổng nghĩa vụ hiện tại. Khi phát sinh dịch vụ tính phí làm tăng công nợ, Backend tính lại `PaymentStatus` trong cùng transaction (`UNPAID` nếu chưa trả, `PARTIALLY_PAID` nếu trả chưa đủ); không thay đổi `deposit_amount` hay snapshot giá phòng.
- Phí dịch vụ thu tại quầy theo FR-19, chưa mở thêm luồng VNPay riêng cho dịch vụ. Không tự khấu trừ phí dịch vụ vào tiền cọc/phạt hủy phòng.

## 2.5. Phân hệ Quy trình Lưu trú & Vận hành Lễ tân (Check-in / Check-out)
- **Quy tắc bắt buộc:** Booking phải ở trạng thái **`CONFIRMED`** mới được phép Check-in.
  - Với đơn online đã cọc: Hệ thống đã tự động chuyển `CONFIRMED`.
  - Với đơn trả sau tại quầy (`PENDING`): Lễ tân liên hệ khách xác minh nhu cầu, sau đó bấm nút "Xác nhận đơn" để chuyển sang `CONFIRMED`.
- **Nghiệp vụ Check-in (Gán $N$ phòng vật lý):**
  - Khách đến quầy làm thủ tục nhận phòng $\to$ Lễ tân mở đơn `CONFIRMED` và bấm "Check-in".
  - Giao diện mở Modal hiển thị danh sách các phòng vật lý đang `AVAILABLE` thuộc Loại phòng đã đặt.
  - Lễ tân tích chọn đủ $N$ phòng cụ thể tương ứng với số lượng đặt $\to$ Bấm "Xác nhận Check-in".
  - Hệ thống lưu các phòng được gán vào bảng `booking_rooms`, chuyển Booking sang `CHECKED_IN`, đồng thời cập nhật trạng thái $N$ phòng đó từ `AVAILABLE` sang `OCCUPIED`.
- **Nghiệp vụ Check-out & Đối soát tất toán:**
  - Khách trả phòng $\to$ Lễ tân bấm "Check-out".
  - Hệ thống tính công nợ còn lại: $\text{Số tiền phải thu} = \text{Tổng tiền phòng + Phí dịch vụ hợp lệ} - \text{Tiền đã thanh toán ròng}$.
  - Lễ tân thu tiền còn lại, ghi nhận phương thức thanh toán $\to$ `PaymentStatus` chuyển `FULLY_PAID`, Booking chuyển `CHECKED_OUT`.
  - Toàn bộ $N$ phòng vật lý vừa trả được tự động chuyển sang trạng thái **`CLEANING`** (Đang dọn dẹp).
- **Quy trình Buồng phòng (Housekeeping flow):**
  - Sau khi dọn dẹp xong, nhân viên/lễ tân bấm nút "Đã dọn xong" $\to$ Phòng chuyển từ `CLEANING` về `AVAILABLE` để đón lượt khách tiếp theo.
- **[Mở rộng] Dịch vụ phòng:** Chỉ phòng `OCCUPIED` có liên kết `booking_rooms` thuộc booking `CHECKED_IN` mới hiện nút **Dịch vụ phòng**. Popup có tab Gọi món, Báo sự cố và Lịch sử; mọi yêu cầu lưu cả `booking_id` và `booking_room_id` để không lẫn giữa các lượt khách ở cùng phòng.
- **[Mở rộng] Trước Check-out:** Đơn món phải `DELIVERED` hoặc `CANCELLED`, chuyến xe phải `COMPLETED` hoặc `CANCELLED`; chưa xử lý xong thì trả `409 Conflict`. Phiếu sự cố được phép tiếp tục xử lý sau Check-out, không làm phát sinh tiền và không tự đóng. Phòng có sự cố cần sửa phải được chặn chuyển từ `CLEANING` về `AVAILABLE` cho tới khi đã xử lý hoặc chuyển `MAINTENANCE` theo quy trình hiện hữu.

## 2.6. Phân hệ Hủy phòng, Hoàn cọc & Tự động hóa No-Show

### Chính sách phạt hủy cọc (Căn cứ duy nhất mốc 14:00 ngày Check-in)
Khách hàng có thể tự hủy đơn trực tuyến trên trang cá nhân. Gọi $T$ là khoảng thời gian tính từ thời điểm khách bấm xác nhận hủy đến đúng **14:00 ngày Check-in** (đơn vị: giờ). Mức phạt và số tiền hoàn được tính toán tự động theo công thức bậc thang:

| Khoảng thời gian hủy ($T$)                                                 | Tỷ lệ phạt cọc | Tỷ lệ hoàn cọc | Diễn giải & Ví dụ mốc thời gian                                                                       |
|----------------------------------------------------------------------------|:--------------:|:--------------:|-------------------------------------------------------------------------------------------------------|
| **$T \ge 24\text{ giờ}$** (Trước $\ge$ 24h)                                |     **0%**     |    **100%**    | Hủy trước 14:00 ngày hôm trước $\to$ Hoàn 100% cọc.                                                   |
| **$12\text{ giờ} \le T < 24\text{ giờ}$** (Từ đủ 12h đến dưới 24h)         |    **30%**     |    **70%**     | Thu phí hủy muộn 30% tiền cọc. *(Trường hợp đúng 12 giờ 00 phút trước giờ nhận phòng thuộc mức này)*. |
| **$0\text{ giờ} < T < 12\text{ giờ}$** (Dưới 12h đến trước giờ nhận phòng) |    **50%**     |    **50%**     | Thu phí hủy sát giờ 50% tiền cọc.                                                                     |
| **$T \le 0$** (Tại hoặc sau 14:00 ngày Check-in)                           |    **100%**    |     **0%**     | Không hoàn lại tiền cọc (khách sạn thu 100% cọc).                                                     |

### Quy định Hoàn tiền cho Booking đã thanh toán nhiều hơn cọc (hoặc đủ 100%)
- Mức phạt hủy phòng được tính toán nghiêm ngặt dựa trên **tiền cọc quy chuẩn (50% tổng giá trị tiền phòng)**:
  $$\text{Tiền phạt} = \text{Tỷ lệ phạt theo mốc } T \times \text{Tiền cọc quy chuẩn (50\% tổng giá trị)}$$
- Số tiền thực tế hoàn trả lại cho khách:
  $$\text{Số tiền hoàn} = \text{Tổng số tiền khách thực tế đã thanh toán} - \text{Tiền phạt}$$
- **Nguyên tắc bảo vệ quyền lợi khách hàng:** Toàn bộ phần tiền thanh toán vượt trên mức cọc 50% (ví dụ: 50% tiền phòng của các ngày còn lại khi khách trả 100% trước) luôn được bảo lưu và hoàn lại 100% cho khách, khách sạn chỉ áp dụng khấu trừ phạt trên hạn mức tiền cọc cam kết ban đầu.
- **Ví dụ minh họa:** Booking có tổng tiền 2.000.000đ, khách đã thanh toán 100% (2.000.000đ), tiền cọc quy chuẩn là 1.000.000đ (50%):
  - *Hủy trước $\ge 24h$:* Phạt 0% $\to$ Phạt = 0đ. Số tiền hoàn = $2.000.000 - 0 = 2.000.000\text{đ}$ (Hoàn 100%).
  - *Hủy từ 12h đến < 24h:* Phạt 30% cọc $\to$ Phạt = $30\% \times 1.000.000 = 300.000\text{đ}$. Số tiền hoàn = $2.000.000 - 300.000 = 1.700.000\text{đ}$.
  - *Hủy dưới 12h đến trước 14:00:* Phạt 50% cọc $\to$ Phạt = $50\% \times 1.000.000 = 500.000\text{đ}$. Số tiền hoàn = $2.000.000 - 500.000 = 1.500.000\text{đ}$.
  - *Hủy sau 14:00 ngày Check-in:* Phạt 100% cọc $\to$ Phạt = $1.000.000\text{đ}$. Khách sạn giữ 1.000.000đ tiền cọc, hoàn lại $1.000.000\text{đ}$ (tiền phòng các đêm tiếp theo) cho khách.

### Ràng buộc Chặn hủy booking sau khi đã nhận/trả phòng
- **Chặn tuyệt đối:** Hệ thống nghiêm cấm và từ chối xử lý hủy đơn (HTTP `400 Bad Request`) đối với các booking đã ở trạng thái:
  - `CHECKED_IN`: Khách đã làm thủ tục nhận phòng và đang lưu trú. Mọi yêu cầu rời đi sớm hơn dự kiến thuộc quy trình **Early Check-out** (Lễ tân tính toán thực tế tại quầy), không được dùng luồng tự hủy đơn.
  - `CHECKED_OUT`: Booking đã hoàn tất kỳ lưu trú và đối soát tất toán.
  - `NO_SHOW`: Booking đã bị đánh dấu vắng mặt.
  - `CANCELLED`: Đơn đã bị hủy trước đó.

### Quy tắc Tự hủy đơn chưa cọc / chưa xác nhận khi quá hạn `hold_expires_at`
- **Cronjob** chạy định kỳ mỗi 5–15 phút quét các đơn `PENDING` có `hold_expires_at < NOW()`:
  - Đơn VNPay quá 15 phút: Giao dịch chuyển `EXPIRED`, Booking chuyển `CANCELLED` (Lý do: `PAYMENT_EXPIRED`).
  - Đơn thanh toán tại khách sạn quá hạn giữ chỗ (sau 24h với đơn đặt trước, hoặc sau 18:00 ngày Check-in với đơn trong ngày) mà chưa được Lễ tân xác nhận: Booking tự động chuyển `CANCELLED` (Lý do: `UNCONFIRMED_TIMEOUT`).
  - Toàn bộ quota phòng được giải phóng ngay lập tức cho các khách hàng khác.

### Quy tắc Xử lý Khách có cọc nhưng không đến (No-Show) với Booking Nhiều Đêm
- **Thời hạn giữ phòng đảm bảo:** Khách sạn cam kết giữ phòng cho khách qua đêm đầu tiên cho đến đúng **12:00 trưa ngày hôm sau ($CheckIn + 1\text{ ngày}$)**.
- **Thời điểm chuyển NO_SHOW & Giải phóng Quota các đêm còn lại:**
  - Nếu đến 12:00 ngày $CheckIn + 1$ mà khách không đến nhận phòng và không thông báo gia hạn giờ đến:
    - Cronjob (chạy lúc 12:05 hàng ngày) hoặc Lễ tân thao tác chuyển Booking sang trạng thái **`NO_SHOW`**.
    - **Ngay lập tức giải phóng toàn bộ quota của các đêm còn lại:** Từ 12:00 ngày $CheckIn + 1$ đến $CheckOut$, toàn bộ số lượng phòng của booking này bị loại bỏ khỏi $BookedRoomsCount$. Khách sạn mở bán lại ngay lập tức các đêm còn lại cho khách mới, tránh giữ quota không cần thiết hoặc giải phóng phòng quá sớm trong đêm đầu.
- **Xử lý tài chính khi No-Show:**
  - *Nếu khách mới thanh toán cọc 50% quy chuẩn:* Khách sạn giữ lại toàn bộ 100% số tiền cọc đã thu làm phí bồi thường giữ phòng đêm đầu tiên. `PaymentStatus` giữ nguyên `PARTIALLY_PAID`, không hoàn tiền.
  - *Nếu khách đã thanh toán trước 100% tổng tiền phòng:* Khách sạn chỉ giữ lại 50% tiền cọc quy chuẩn (tương đương tiền phòng đêm đầu), 50% tiền phòng của các đêm còn lại chưa sử dụng sẽ được hoàn trả lại cho khách $\to$ Hệ thống chuyển `PaymentStatus` sang **`REFUND_PENDING`** với `refund_amount = 50% tổng tiền phòng` để Lễ tân thực hiện hoàn tiền theo quy trình.

## 2.7. Phân hệ Báo cáo & Dashboard Quản trị (Admin)
- **Doanh thu dự kiến:** Tổng giá trị của các đơn đang ở trạng thái `CONFIRMED` và `CHECKED_IN` trong khoảng thời gian chọn.
- **Doanh thu thực thu:** Tổng số tiền thực nhận từ các giao dịch thanh toán thành công (`PaymentTransactionStatus = SUCCESS`) trừ đi các khoản tiền cọc đã thực tế hoàn trả (`REFUNDED`) trong kỳ thống kê.
- **Tỷ lệ lấp đầy phòng (Occupancy Rate):**
  $$\text{Tỷ lệ lấp đầy (\%)} = \frac{\text{Tổng số đêm phòng có khách thực tế (OCCUPIED)}}{\text{Tổng số đêm phòng khả dụng khai thác (ACTIVE)}} \times 100\%$$
- **Cơ cấu buồng phòng hiện tại:** Số lượng phòng `AVAILABLE`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`.
- **[Mở rộng] Phí phát sinh:** Hiển thị riêng tổng phí món đã giao và phí xe đã hoàn thành theo thời điểm hoàn thành dịch vụ. Đây là giá trị dịch vụ phát sinh, không mặc định là tiền đã thu. Doanh thu thực thu vẫn lấy từ giao dịch trừ hoàn tiền; không cộng phí dịch vụ thêm lần nữa. ADR/RevPAR chỉ dùng tiền phòng.

# 3. Kiến trúc & Thiết kế hệ thống (Architecture & Design)

# 3. Lược đồ Chức năng & Kiến trúc Quy trình Hệ thống (System Diagrams & Workflows)

Phần này cung cấp toàn bộ lược đồ trực quan chuẩn hóa công nghệ phần mềm mô tả cấu trúc chức năng, tương tác người dùng, quy trình nghiệp vụ và vòng đời dữ liệu của Hotel Booking System (bao gồm cả phạm vi MVP và 10 tính năng mở rộng Phase 2).

---

## 3.1. Lược đồ Phân rã Chức năng Tổng thể (Functional Decomposition Diagram - FDD)

Lược đồ thể hiện cấu trúc phân cấp chức năng 3 tầng: từ hệ thống chung đến 3 phân hệ người dùng chính và hạ tầng mở rộng kỹ thuật:

![Lược đồ Phân rã Chức năng Tổng thể (FDD)](diagrams/fdd_diagram.png)
*([🔍 Xem ảnh gốc vector SVG](diagrams/fdd_diagram.svg))*

<details>
<summary><b>Xem mã nguồn Mermaid</b></summary>

```mermaid
graph TD
    HBS["🏨 Hotel Booking System (HBS)<br>Grand Aurora Luxury Hotel"]
    
    CUST["👤 Phân hệ Khách hàng<br>(Customer Portal)"]
    RECEP["🛎️ Phân hệ Lễ tân & Vận hành<br>(Receptionist Operations)"]
    ADMIN["👑 Phân hệ Quản trị viên<br>(Admin & Analytics)"]
    CORE["⚙️ Module Kỹ thuật & Hạ tầng<br>(Cross-cutting & DevOps)"]
    
    HBS --> CUST
    HBS --> RECEP
    HBS --> ADMIN
    HBS --> CORE

    CUST --> C1["Tra cứu phòng trống thời gian thực"]
    CUST --> C2["Giữ chỗ 15p & Đặt cọc VNPay"]
    CUST --> C3["Lịch sử Booking & Tự hủy hoàn cọc"]
    CUST --> C4["🤖 Trợ lý AI Chatbot tư vấn đặt phòng"]
    CUST --> C5["📄 Tải Hóa đơn & Phiếu đặt phòng PDF"]
    CUST --> C6["Đăng ký xe đón khi đặt phòng"]

    RECEP --> R1["Quản lý Danh sách Booking đa tiêu chí"]
    RECEP --> R2["📅 Lịch phòng trực quan Ma trận Timeline"]
    RECEP --> R3["Check-in: Gán N phòng vật lý"]
    RECEP --> R4["Check-out: Thu tiền còn lại & Xuất hóa đơn"]
    RECEP --> R5["Quản lý dọn phòng (Housekeeping)"]
    RECEP --> R6["Đối soát hoàn cọc & Xử lý No-Show"]
    RECEP --> R7["Dịch vụ phòng: Gọi món và báo sự cố"]
    RECEP --> R8["Duyệt và điều phối xe đón"]

    ADMIN --> A1["Quản lý Loại phòng & Upload ảnh Cloudinary"]
    ADMIN --> A2["Quản lý Phòng vật lý & Lịch bảo trì"]
    ADMIN --> A3["📊 Dashboard Thống kê nâng cao & Doanh thu"]
    ADMIN --> A4["🛡️ Audit Log: Nhật ký thao tác hệ thống"]
    ADMIN --> A5["Quản lý tài khoản & phân quyền nhân viên"]
    ADMIN --> A6["Quản lý danh mục món và gói xe"]

    CORE --> S1["Khóa chống Overbooking (Pessimistic Lock)"]
    CORE --> S2["Hệ thống Email tự động (JavaMailSender)"]
    CORE --> S3["Tự động sao lưu MySQL định kỳ (Cronjob)"]
    CORE --> S4["Giám sát hệ thống (Spring Actuator & Metrics)"]
    CORE --> S5["CI/CD GitHub Actions & Triển khai VPS"]
```
</details>

---

> **Cập nhật FR-21/FR-22:** Mã Mermaid trong tài liệu đã bổ sung hai chức năng. Các liên kết ảnh PNG/SVG được giữ nguyên; cần xuất lại ảnh từ mã nguồn khi đóng gói tài liệu để ảnh không còn thể hiện bản cũ.

## 3.2. Lược đồ Use Case Chi tiết Theo Vai trò (Use Case Diagrams)

### 3.2.1. Use Case Phân hệ Khách hàng (Customer)

![Use Case Phân hệ Khách hàng (Customer)](diagrams/usecase_customer.png)
*([🔍 Xem ảnh gốc vector SVG](diagrams/usecase_customer.svg))*

<details>
<summary><b>Xem mã nguồn Mermaid</b></summary>

```mermaid
graph LR
    Customer(("👤 Customer"))

    subgraph Customer_Portal["Customer Portal Use Cases"]
        UC_C1["Đăng ký / Đăng nhập"]
        UC_C2["Tìm kiếm & Lọc phòng trống"]
        UC_C3["Xem chi tiết loại phòng & tiện ích"]
        UC_C4["Tạo đơn đặt phòng (N phòng)"]
        UC_C5["Thanh toán cọc 50% VNPay"]
        UC_C6["Xem lịch sử đặt phòng"]
        UC_C7["Gửi yêu cầu hủy đơn & Nhận cọc"]
        UC_C8["Tải Hóa đơn xác nhận PDF"]
        UC_C9["Trò chuyện cùng AI Chatbot"]
        UC_C10["Khóa giữ chỗ 15 phút"]
        UC_C11["Nhập thông tin tài khoản hoàn tiền"]
    end

    Customer --> UC_C1
    Customer --> UC_C2
    Customer --> UC_C3
    Customer --> UC_C4
    Customer --> UC_C6
    Customer --> UC_C8
    Customer --> UC_C9
    Customer --> UC_C12["Đăng ký và xem trạng thái xe đón"]
    UC_C12 -.->|gắn với| UC_C4

    UC_C4 -.->|include| UC_C10
    UC_C4 -.->|extend| UC_C5
    UC_C6 -.->|extend| UC_C7
    UC_C7 -.->|include| UC_C11
```
</details>

### 3.2.2. Use Case Phân hệ Lễ tân (Receptionist)

![Use Case Phân hệ Lễ tân (Receptionist)](diagrams/usecase_receptionist.png)
*([🔍 Xem ảnh gốc vector SVG](diagrams/usecase_receptionist.svg))*

<details>
<summary><b>Xem mã nguồn Mermaid</b></summary>

```mermaid
graph LR
    Receptionist(("🛎️ Receptionist"))

    subgraph Recep_Ops["Receptionist Operations Use Cases"]
        UC_R1["Xem & Lọc danh sách Booking"]
        UC_R2["Xác nhận đơn thanh toán tại quầy"]
        UC_R3["Xem Lịch phòng Ma trận Timeline"]
        UC_R4["Thực hiện Check-in (Gán N phòng)"]
        UC_R5["Thực hiện Check-out & Quyết toán"]
        UC_R6["In / Xuất Hóa đơn VAT PDF cho khách"]
        UC_R7["Cập nhật trạng thái dọn phòng"]
        UC_R8["Xác nhận chuyển khoản Hoàn cọc"]
        UC_R9["Xử lý No-Show & Giải phóng phòng"]
        UC_R10["Khóa ghi Room vật lý (FOR UPDATE)"]
        UC_R11["Chuyển trạng thái CLEANING"]
    end

    Receptionist --> UC_R1
    Receptionist --> UC_R2
    Receptionist --> UC_R3
    Receptionist --> UC_R4
    Receptionist --> UC_R5
    Receptionist --> UC_R6
    Receptionist --> UC_R7
    Receptionist --> UC_R8
    Receptionist --> UC_R9
    Receptionist --> UC_R12["Lập đơn món và cập nhật giao món"]
    Receptionist --> UC_R13["Ghi nhận và theo dõi sự cố phòng"]
    Receptionist --> UC_R14["Duyệt, bố trí và hoàn thành xe đón"]

    UC_R4 -.->|include| UC_R10
    UC_R5 -.->|include| UC_R11
```
</details>

### 3.2.3. Use Case Phân hệ Quản trị viên (Admin)

![Use Case Phân hệ Quản trị viên (Admin)](diagrams/usecase_admin.png)
*([🔍 Xem ảnh gốc vector SVG](diagrams/usecase_admin.svg))*

<details>
<summary><b>Xem mã nguồn Mermaid</b></summary>

```mermaid
graph LR
    Admin(("👑 Admin"))

    subgraph Admin_UseCases["Admin & System Administration Use Cases"]
        UC_A1["Quản lý Danh mục Loại phòng"]
        UC_A2["Upload & Quản lý ảnh Cloudinary"]
        UC_A3["Quản lý Danh sách Phòng vật lý"]
        UC_A4["Chuyển phòng sang trạng thái BẢO TRÌ"]
        UC_A5["Xem Dashboard Thống kê Doanh thu & Tỷ lệ lấp đầy"]
        UC_A6["Tra cứu Audit Log (Nhật ký thao tác)"]
        UC_A7["Theo dõi Health Check & Hiệu năng hệ thống"]
        UC_A8["Thực hiện toàn bộ quyền hạn của Lễ tân"]
    end

    Admin --> UC_A1
    Admin --> UC_A3
    Admin --> UC_A5
    Admin --> UC_A6
    Admin --> UC_A7
    Admin --> UC_A8
    Admin --> UC_A9["Quản lý món ăn, đồ uống và gói xe"]

    UC_A1 -.->|include| UC_A2
    UC_A3 -.->|extend| UC_A4
```
</details>

---

## 3.3. Lược đồ Quy trình Nghiệp vụ Cốt lõi (Activity & Process Diagrams)

### 3.3.1. Quy trình Đặt phòng & Khóa giữ chỗ 15 phút chống Overbooking

![Quy trình Đặt phòng & Khóa giữ chỗ 15 phút](diagrams/activity_booking_lock.png)
*([🔍 Xem ảnh gốc vector SVG](diagrams/activity_booking_lock.svg))*

<details>
<summary><b>Xem mã nguồn Mermaid</b></summary>

```mermaid
sequenceDiagram
    autonumber
    actor C as Khach hang (Customer)
    participant FE as Frontend (React 19)
    participant BE as Backend (Spring Boot 3)
    participant DB as Database (MySQL 8)
    participant VN as Cong VNPay Sandbox
    participant Mail as Mail Service

    C->>FE: Chon Loai phong, Ngay o, So luong N phong
    FE->>BE: POST /api/v1/bookings
    activate BE
    Note over BE,DB: Mo Transaction & Pessimistic Lock tren RoomType
    BE->>DB: SELECT * FROM room_types WHERE id = ? FOR UPDATE
    BE->>DB: Kiem tra Quota con lai
    alt Khong du phong trong
        BE-->>FE: HTTP 409 Conflict (Het phong)
        FE-->>C: Thong bao loai phong da het
    else Du phong trong
        BE->>DB: INSERT booking (PENDING, hold_expires_at = NOW + 15m)
        BE->>VN: Sinh URL thanh toan coc 50% (HMAC-SHA512)
        BE-->>FE: Tra ve Payment URL & Booking ID
        deactivate BE
        FE-->>C: Chuyen huong sang VNPay Checkout
        C->>VN: Nhap the / Quet QR thanh toan coc
        VN->>BE: Webhook IPN (Ky HMAC & Ma phan hoi 00)
        activate BE
        Note over BE,DB: Idempotency Check & Cap nhat Booking
        BE->>DB: SELECT * FROM payment_transactions FOR UPDATE
        BE->>DB: UPDATE booking SET CONFIRMED, PARTIALLY_PAID
        BE->>Mail: Gui Email xac nhan kem Hoa don PDF
        BE-->>VN: HTTP 200 (Confirm Success)
        deactivate BE
        VN-->>C: Chuyen huong ve trang Success tren Frontend
    end
```
</details>

### 3.3.2. Quy trình Check-in (Gán phòng vật lý) & Check-out (Quyết toán & Hóa đơn)

![Quy trình Check-in & Check-out](diagrams/activity_checkin_checkout.png)
*([🔍 Xem ảnh gốc vector SVG](diagrams/activity_checkin_checkout.svg))*

<details>
<summary><b>Xem mã nguồn Mermaid</b></summary>

```mermaid
flowchart TD
    StartCheckIn([Khách đến quầy Lễ tân nhận phòng]) --> CheckStatus{Đơn ở trạng thái CONFIRMED?}
    CheckStatus -- Không --> ErrConfirm[Từ chối Check-in: Phải duyệt đơn trước]
    CheckStatus -- Đúng --> OpenModal[Lễ tân mở Modal Check-in]
    OpenModal --> SelectRooms[Hệ thống lọc danh sách N phòng vật lý AVAILABLE]
    SelectRooms --> ChooseRooms[Lễ tân chọn đủ N phòng vật lý cụ thể]
    ChooseRooms --> ConfirmCheckIn[Lễ tân bấm Xác nhận Check-in]
    
    ConfirmCheckIn --> LockRooms[Backend mở Transaction: Khóa SELECT FOR UPDATE]
    LockRooms --> VerifyAvail{Toàn bộ N phòng vẫn AVAILABLE?}
    VerifyAvail -- Bị gán trùng --> ErrAssign[Báo lỗi xung đột phòng, chọn lại]
    VerifyAvail -- Hợp lệ --> AssignSuccess[Gán N phòng vào booking_rooms]
    AssignSuccess --> UpdateStatus[Đổi N phòng sang OCCUPIED & Booking sang CHECKED_IN]
    UpdateStatus --> InStay([Khách lưu trú tại khách sạn])

    InStay --> StartCheckOut([Khách yêu cầu Check-out trả phòng])
    StartCheckOut --> CheckServices{"Đơn món và xe đã hoàn thành hoặc hủy?"}
    CheckServices -- Không --> PendingServices["Yêu cầu Lễ tân xử lý trước khi tất toán"]
    CheckServices -- Có --> CalcDue["Tính tiền phòng và phí dịch vụ trừ tiền đã trả ròng"]
    CalcDue --> PayDue[Khách thanh toán nốt khoản tiền còn lại tại quầy]
    PayDue --> FinalizeBooking[Booking chuyển CHECKED_OUT, PaymentStatus chuyển FULLY_PAID]
    FinalizeBooking --> ReleaseRooms[Giải phóng N phòng: Chuyển sang CLEANING]
    FinalizeBooking --> GenPDF[Backend tự động sinh Hóa đơn VAT PDF]
    GenPDF --> PrintSend[Lễ tân in hóa đơn hoặc tải file PDF gửi email]
    ReleaseRooms --> EndFlow([Hoàn tất thủ tục trả phòng])
```
</details>

### 3.3.3. Quy trình Tự hủy phòng & Thuật toán Phạt cọc 4 bậc mốc 14:00

![Quy trình Tự hủy phòng & Phạt cọc 4 bậc](diagrams/activity_cancellation_refund.png)
*([🔍 Xem ảnh gốc vector SVG](diagrams/activity_cancellation_refund.svg))*

<details>
<summary><b>Xem mã nguồn Mermaid</b></summary>

```mermaid
flowchart TD
    A[Khách hàng bấm Hủy đặt phòng] --> B{Trạng thái Booking là gì?}
    B -- CHECKED_IN / CHECKED_OUT / NO_SHOW --> C[HTTP 400: Không thể hủy sau khi nhận phòng]
    B -- CANCELLED --> D[HTTP 400: Đơn đã bị hủy trước đó]
    B -- PENDING Chưa cọc --> E[Hủy ngay: Chuyển CANCELLED, giải phóng Quota]
    
    B -- CONFIRMED Đã cọc 50% --> F[Tính mốc thời gian so với 14:00 ngày Check-in]
    F --> G{Thời điểm hủy phòng?}
    
    G -- Trước >= 24 giờ --> H1[Phạt 0% Cọc - Hoàn 100% tiền đã đóng]
    G -- Từ 12h đến < 24 giờ --> H2[Phạt 30% Tiền cọc 50% quy chuẩn]
    G -- Dưới 12h đến trước 14:00 --> H3[Phạt 50% Tiền cọc 50% quy chuẩn]
    G -- Sau 14:00 ngày Check-in --> H4[Phạt 100% Cọc - Hoàn tiền các đêm sau nếu có]
    
    H1 --> Calc[Số tiền hoàn = Tổng tiền đã trả - Tiền phạt]
    H2 --> Calc
    H3 --> Calc
    H4 --> Calc

    Calc --> PromptBank[Khách hàng nhập STK, Tên ngân hàng, Chủ tài khoản]
    PromptBank --> SubmitCancel[Xác nhận hủy đơn]
    SubmitCancel --> UpdateRefund[Chuyển CANCELLED & REFUND_PENDING - Giải phóng Quota]
    UpdateRefund --> RecepAction[Lễ tân kiểm tra STK và thực hiện chuyển khoản]
    RecepAction --> ConfirmRefund[Lễ tân bấm Xác nhận đã hoàn cọc -> REFUNDED]
```
</details>

### 3.3.4. Quy trình Tự động hóa bằng Cronjob (Quét hết hạn & Xử lý No-Show)

![Quy trình Tự động hóa bằng Cronjob](diagrams/activity_cronjob_noshow.png)
*([🔍 Xem ảnh gốc vector SVG](diagrams/activity_cronjob_noshow.svg))*

<details>
<summary><b>Xem mã nguồn Mermaid</b></summary>

```mermaid
flowchart TD
    Cron1[Cronjob quét định kỳ mỗi 5 phút] --> Q1[SELECT bookings WHERE status = PENDING AND hold_expires_at < NOW]
    Q1 --> Loop1{Có đơn hết hạn?}
    Loop1 -- Có --> Expire[Cập nhật CANCELLED, hoàn trả Quota vào kho]
    Loop1 -- Không --> Sleep1[Chờ chu kỳ tiếp theo]

    Cron2[Cronjob quét lúc 12:05 hàng ngày] --> Q2[SELECT bookings WHERE status = CONFIRMED AND check_in_date < TODAY]
    Q2 --> CheckNoShow{Khách không đến Check-in?}
    CheckNoShow -- Đúng --> ActNoShow[Chuyển Booking sang NO_SHOW]
    ActNoShow --> ReleaseFutureNights[Giải phóng Quota của tất cả các đêm tiếp theo ngay]
    ActNoShow --> FineNoShow[Giữ 100% cọc đêm đầu; hoàn phần dư nếu có]
    CheckNoShow -- Đã đến --> Skip[Bỏ qua]
```
</details>

---

## 3.4. Lược đồ Máy Trạng thái Vòng đời (State Machine Diagrams)

### 3.4.1. Vòng đời Trạng thái Đặt phòng (Booking Lifecycle)

![Vòng đời Trạng thái Đặt phòng](diagrams/state_booking_lifecycle.png)
*([🔍 Xem ảnh gốc vector SVG](diagrams/state_booking_lifecycle.svg))*

<details>
<summary><b>Xem mã nguồn Mermaid</b></summary>

```mermaid
stateDiagram-v2
    [*] --> PENDING: Khách tạo booking mới (Giữ chỗ 15p)
    
    PENDING --> CONFIRMED: Thanh toán cọc VNPay thành công / Lễ tân duyệt đơn
    PENDING --> CANCELLED: Quá hạn hold_expires_at / Khách tự hủy đơn
    
    CONFIRMED --> CHECKED_IN: Lễ tân thực hiện Check-in (Gán đủ N phòng vật lý)
    CONFIRMED --> CANCELLED: Khách gửi yêu cầu hủy (Phạt cọc mốc 14:00)
    CONFIRMED --> NO_SHOW: Quá 12:00 ngày CheckIn+1 mà khách không đến
    
    CHECKED_IN --> CHECKED_OUT: Khách làm thủ tục Check-out (Tất toán đủ tiền)
    
    CANCELLED --> [*]
    CHECKED_OUT --> [*]
    NO_SHOW --> [*]
```
</details>

### 3.4.2. Vòng đời Trạng thái Phòng vật lý (Physical Room Lifecycle)

![Vòng đời Trạng thái Phòng vật lý](diagrams/state_room_lifecycle.png)
*([🔍 Xem ảnh gốc vector SVG](diagrams/state_room_lifecycle.svg))*

<details>
<summary><b>Xem mã nguồn Mermaid</b></summary>

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE: Khởi tạo phòng mới trong danh mục
    
    AVAILABLE --> OCCUPIED: Lễ tân gán phòng khi Check-in đơn đặt phòng
    AVAILABLE --> MAINTENANCE: Đưa phòng vào bảo trì / sửa chữa trang thiết bị
    
    OCCUPIED --> CLEANING: Khách Check-out trả phòng (Tự động chuyển dọn dẹp)
    
    CLEANING --> AVAILABLE: Nhân viên buồng phòng dọn xong (Bấm Đã dọn xong)
    
    MAINTENANCE --> AVAILABLE: Hoàn tất công tác bảo trì kỹ thuật
```
</details>

---

# 4. Kiến trúc & Thiết kế hệ thống (Architecture & Design)

## 4.1. Kiến trúc Modular Monolith & Phân lớp (Layered Architecture)

Hệ thống tuân thủ kiến trúc phân lớp rõ ràng bên trong một khối Monolith duy nhất:

```text
backend/src/main/java/com/hotel/
├── auth/                 # Controller, Service, JwtProvider, UserDetailsServiceImpl
├── user/                 # UserController, UserService, UserRepository, Entity User, Role
├── room/                 # RoomTypeController, RoomController, RoomService, Entity RoomType, Room
├── booking/              # BookingController, BookingService, Entity Booking, BookingRoom
├── payment/              # PaymentController, VnPayService, Entity PaymentTransaction
├── dashboard/            # DashboardController, DashboardService
└── common/
    ├── config/           # SecurityConfig, CorsConfig, CloudinaryConfig, VnPayConfig
    ├── exception/        # Custom Exceptions, GlobalExceptionHandler
    ├── response/         # ApiResponse<T>, PageResponse<T>
    └── schedule/         # AutoCancelScheduleJob (Cronjob 15m & 18:00)
```

**Module bổ sung:** `roomservice` quản lý danh mục món, đơn món và phiếu sự cố; `transfer` quản lý gói/yêu cầu xe. Hai module tuân thủ Controller → Service → Repository và gọi nghiệp vụ `booking`/`payment` qua service trong cùng Monolith. Không tạo microservice mới.

## 4.2. Mô hình Thực thể & Trạng thái Hệ thống

### 1. Trạng thái Phòng vật lý (`RoomStatus`)
`AVAILABLE` (Trống sẵn sàng) $\rightleftharpoons$ `OCCUPIED` (Đang có khách) $\rightarrow$ `CLEANING` (Đang dọn dẹp) $\rightarrow$ `AVAILABLE`.  
*(Phòng có thể chuyển sang `MAINTENANCE` từ bất kỳ trạng thái trống nào khi cần sửa chữa).*

### 2. Trạng thái Đặt phòng (`BookingStatus`)
- `PENDING`: Đơn mới tạo (chờ cọc VNPay trong 15 phút hoặc chờ Lễ tân xác nhận).
- `CONFIRMED`: Đơn đã được xác nhận (đã cọc hoặc lễ tân duyệt). **Chỉ đơn CONFIRMED mới được Check-in.**
- `CHECKED_IN`: Khách đã nhận phòng (đã gán đủ $N$ phòng vật lý).
- `CHECKED_OUT`: Khách đã trả phòng và đối soát hoàn tất.
- `CANCELLED`: Đơn đã bị hủy (khách tự hủy, hết hạn 15 phút, hoặc tự hủy 18:00).
- `NO_SHOW`: Khách đã cọc nhưng không đến nhận phòng suốt kỳ lưu trú.

### 3. Trạng thái Thanh toán tổng thể (`PaymentStatus`)
- `UNPAID`: Chưa thanh toán đồng nào.
- `PARTIALLY_PAID`: Đã thanh toán một phần nghĩa vụ hiện tại (thông thường là cọc 50% tiền phòng), còn số dư phải thu.
- `FULLY_PAID`: Đã tất toán đủ tổng tiền phòng và mọi phí dịch vụ đã ghi nhận; khi chưa có dịch vụ, tương đương đủ 100% tiền phòng.
- `REFUND_PENDING`: Đang chờ lễ tân chuyển khoản hoàn cọc.
- `REFUNDED`: Đã hoàn tất chuyển khoản trả cọc cho khách.

### 4. Trạng thái Giao dịch Thanh toán (`PaymentTransactionStatus`)
- `PENDING`: Giao dịch đang chờ khách thanh toán trên cổng VNPay.
- `SUCCESS`: Khách thanh toán thành công (xác thực chữ ký hợp lệ).
- `FAILED`: Giao dịch bị lỗi, hủy bỏ hoặc ngân hàng từ chối.
- `EXPIRED`: Giao dịch quá thời hạn 15 phút mà không hoàn tất.

### Sơ đồ Lớp Thực thể Dữ liệu (ERD Core Entities)

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "places"
    ROOM_TYPES ||--o{ ROOMS : "contains"
    ROOM_TYPES ||--o{ BOOKINGS : "reserved_for"
    BOOKINGS ||--|{ BOOKING_ROOMS : "allocates"
    ROOMS ||--o{ BOOKING_ROOMS : "assigned_to"
    BOOKINGS ||--o{ PAYMENT_TRANSACTIONS : "has"

    USERS {
        bigint id PK
        string email UK
        string password
        string full_name
        string phone
        string role
    }

    ROOM_TYPES {
        bigint id PK
        string name
        int capacity
        decimal base_price
        text description
        boolean is_active
    }

    ROOMS {
        bigint id PK
        string room_number UK
        bigint room_type_id FK
        string status "AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE"
    }

    BOOKINGS {
        bigint id PK
        string booking_code UK
        bigint user_id FK
        bigint room_type_id FK
        int quantity "So luong phong dat"
        date check_in_date
        date check_out_date
        decimal price_per_night "Snapshot don gia theo dem"
        decimal total_price "Tong tien phong"
        decimal deposit_amount "Tien coc 50%"
        string booking_status "PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW"
        string payment_status "UNPAID, PARTIALLY_PAID, FULLY_PAID, REFUND_PENDING, REFUNDED"
        datetime hold_expires_at "Het han giu quota"
        string bank_account_masked
        decimal refund_amount
        datetime created_at
    }

    BOOKING_ROOMS {
        bigint id PK
        bigint booking_id FK
        bigint room_id FK "Gan khi Check-in"
        datetime assigned_at
        bigint assigned_by FK "Le tan thuc hien"
    }

    PAYMENT_TRANSACTIONS {
        bigint id PK
        bigint booking_id FK
        string transaction_code UK "Ma giao dich he thong"
        string vnp_transaction_no UK "Ma duy nhat tu VNPay"
        decimal amount
        string payment_method "VNPAY, CASH, BANK_TRANSFER"
        string status "PENDING, SUCCESS, FAILED, EXPIRED"
        datetime expires_at "Han 15 phut"
        datetime transaction_time
    }
```

**[Mở rộng] Dữ liệu FR-21/FR-22 (bổ sung vào ERD hiện hữu):**

| Bảng | Trường chính và liên kết |
|---|---|
| `service_items` | `id`, `name`, `category` (`FOOD`/`DRINK`), `unit`, `price` (VND ≥ 0), `image_url`, `is_active`, `version`, timestamps |
| `room_service_orders` | `id`, `booking_id` FK, `booking_room_id` FK, `status`, `note`, `total_amount`, `created_by` FK Users, `created_at`, `delivered_at`, `cancel_reason`, `version` |
| `room_service_order_items` | `id`, `order_id` FK, `service_item_id` FK, `name_snapshot`, `unit_snapshot`, `unit_price_snapshot`, `quantity` (> 0), `line_total` |
| `maintenance_requests` | `id`, `booking_id` FK, `booking_room_id` FK, `description`, `priority` (`NORMAL`/`URGENT`), `status`, `blocks_resale`, `resolution_note`, `created_by` FK Users, `created_at`, `resolved_at`, `version` |
| `transfer_packages` | `id`, `name`, `transfer_type` (`SHARED`/`PRIVATE`), `route_description`, `max_passengers`, `pricing_unit` (`PER_PERSON`/`PER_TRIP`), `price`, `is_active`, `version`, timestamps |
| `transfer_requests` | `id`, `booking_id` FK (unique), `package_id` FK, `package_name_snapshot`, `transfer_type_snapshot`, `pricing_unit_snapshot`, `unit_price_snapshot`, `total_amount`, `passenger_count`, `pickup_location`, `pickup_at`, `contact_phone`, `note`, `status`, `vehicle_info`, `driver_name`, `driver_phone`, `cancel_reason`, `created_by` FK Users, `completed_at`, timestamps, `version` |

- Quan hệ: Booking 1–N đơn món và phiếu sự cố; mỗi đơn/phiếu thuộc đúng một BookingRoom. Đơn món 1–N dòng món; ServiceItem 1–N dòng lịch sử. Booking 1–0..1 yêu cầu xe; TransferPackage 1–N yêu cầu xe. Yêu cầu xe gắn cả booking, không nhân phí theo số phòng.
- Snapshot bất biến sau khi tạo; đổi giá/tên hoặc ngừng bán danh mục không thay đổi đơn đã có. Không hard-delete danh mục hoặc lịch sử đã được tham chiếu. `total_amount` do Backend tính bằng tổng dòng món hoặc đơn giá xe nhân số người/lượt theo gói.
- Bổ sung `payment_allocations`: `id`, `transaction_id` FK, `charge_type` (`ROOM`/`ROOM_SERVICE`/`TRANSFER`), `source_id`, `amount`; tổng phân bổ phải bằng số tiền giao dịch. Backend phân bổ tự động theo thứ tự tiền phòng, đơn món đã giao (ID tăng dần), xe đã hoàn thành; VNPay cọc chỉ phân bổ ROOM. Không cho client tự đổi phân bổ.
- Bổ sung `payment_transactions.purpose` (`ROOM`/`TRANSFER`/`SETTLEMENT`) và `source_id` (yêu cầu xe khi purpose=TRANSFER); các khoản hoàn giữ liên kết giao dịch gốc. Thu tổng khi lưu trú dùng `SETTLEMENT`; khi hủy booking có dịch vụ đã dùng, dùng bảng phân bổ để đối soát riêng tiền phòng/phí xe trước hoàn.
- Giữ nguyên `bookings.total_price` và `deposit_amount`; các tổng dịch vụ được tính từ trạng thái hợp lệ, không nhân bản khoản phải thu sang bảng thanh toán. Bổ sung `version` cho Booking để kiểm soát snapshot đối soát; mọi ghi phí, tạo yêu cầu và Check-out phải khóa cùng bản ghi Booking trước khi kiểm tra trạng thái.
- Enum đơn món: `PENDING → PREPARING → DELIVERED`; được `CANCELLED` từ `PENDING` hoặc `PREPARING` khi Lễ tân xác nhận chưa giao, bắt buộc lý do. Enum sự cố: `OPEN → IN_PROGRESS → RESOLVED`; cho phép `OPEN → CANCELLED` nếu báo nhầm và có lý do. Enum xe: `PENDING → CONFIRMED → COMPLETED`; cho phép hủy từ `PENDING`/`CONFIRMED` khi chưa thực hiện, bắt buộc lý do. Trạng thái cuối không được mở lại qua API thông thường.
- Index: đơn món và sự cố theo `(booking_id, status)`, `(booking_room_id, created_at)`; xe theo `(pickup_at, status)`; unique `transfer_requests.booking_id`. Không tạo FK cascade xóa lịch sử tài chính.
- Idempotency lưu `actor_id`, `operation`, `idempotency_key`, `request_hash`, `resource_id`, response và trạng thái xử lý; unique `(actor_id, operation, idempotency_key)`. Lặp khóa và cùng payload trả kết quả cũ; khác payload trả `409`. Ghi nhận khóa và nghiệp vụ trong cùng transaction; không xóa khóa trong thời gian booking còn mở.
- Flyway tạo các bảng bổ sung bằng migration mới; booking cũ không có dịch vụ trả tổng phí bằng 0, yêu cầu xe `null`. Seed tối thiểu món ăn, đồ uống, một gói xe ghép và một gói xe riêng; không sửa migration đã chạy.

## 4.3. Thuật toán Kiểm tra Khả dụng & Chống Overbooking (Pessimistic Lock)

### Nguyên tắc tính Quota theo Loại phòng
Tại một thời điểm, số lượng phòng trống của một Loại phòng trong khoảng $[CheckIn, CheckOut)$ được xác định:
$$AvailableRooms = TotalActiveRooms - BookedRoomsCount$$
Trong đó:
- $TotalActiveRooms$: Đếm tổng số phòng vật lý thuộc loại phòng đó có `status != 'MAINTENANCE'` (các phòng đang có trạng thái hiện tại là `AVAILABLE`, `OCCUPIED`, `CLEANING` đều là tài nguyên buồng phòng active để phục vụ cho các lượt đặt trong tương lai; chỉ những phòng bảo trì dài hạn `MAINTENANCE` mới bị loại trừ khỏi tổng năng lực phục vụ).
- $BookedRoomsCount$: Tổng $\sum quantity$ của các Booking cùng loại phòng có khoảng thời gian giao nhau với $[CheckIn, CheckOut)$ theo điều kiện $A_{in} < B_{out} \text{ and } A_{out} > B_{in}$, đồng thời thỏa mãn một trong các điều kiện chiếm giữ quota hợp lệ:
  1. **Booking `CONFIRMED` hoặc `CHECKED_IN`:** Luôn giữ quota cho toàn bộ khoảng thời gian lưu trú $[CheckIn, CheckOut)$.
  2. **Booking `PENDING` (chờ cọc VNPay hoặc chờ Lễ tân xác nhận) CÒN TRONG HẠN GIỮ CHỖ ($T_{now} \le hold\_expires\_at$):** Bắt đầu giữ quota ngay từ thời điểm tạo đơn cho toàn bộ khoảng lưu trú $[CheckIn, CheckOut)$ (kể cả đơn cho tuần sau hay tháng sau):
     - Với Booking cọc VNPay: $hold\_expires\_at = created\_at + 15\text{ phút}$.
     - Với Booking thanh toán tại khách sạn đặt trước $\ge 24\text{ giờ}$ so với ngày nhận phòng: $hold\_expires\_at = created\_at + 24\text{ giờ}$ (thời hạn để Lễ tân liên hệ khách xác nhận đơn).
     - Với Booking thanh toán tại khách sạn đặt trong vòng $24\text{ giờ}$ hoặc trong ngày: $hold\_expires\_at = \min(created\_at + 2\text{ giờ}, \text{check\_in\_date } 18:00)$.
  3. **Giải phóng Quota:** Khi $T_{now} > hold\_expires\_at$ mà chưa hoàn tất xác nhận (VNPay chưa thanh toán hoặc Lễ tân chưa bấm xác nhận) $\to$ Cronjob tự động chuyển Booking sang `CANCELLED` (Lý do: `PAYMENT_EXPIRED` hoặc `UNCONFIRMED_TIMEOUT`), ngay lập tức loại khỏi $BookedRoomsCount$ để giải phóng quota phòng.
  4. **Loại trừ tuyệt đối:** Các Booking có trạng thái `CANCELLED`, `CHECKED_OUT`, hoặc `NO_SHOW` không bao giờ được tính vào $BookedRoomsCount$. (Đặc biệt với đơn nhiều đêm bị `NO_SHOW`: ngay tại mốc 12:00 ngày $CheckIn + 1$, khi chuyển sang `NO_SHOW`, toàn bộ quota của các đêm còn lại từ ngày $CheckIn + 1$ đến $CheckOut$ được giải phóng ngay lập tức để mở bán lại).

### Cơ chế Bảo vệ Đồng thời (Concurrency Control)
Để tránh hoàn toàn lỗi Race Condition giữa việc Khách đặt phòng online và Lễ tân gán phòng tại quầy, hệ thống áp dụng cơ chế khóa hai tầng:

1. **Khi Tạo Đặt phòng (Lock Quota Logic):**
   - Mở `@Transactional(isolation = Isolation.READ_COMMITTED)`.
   - Khóa ghi bản ghi Loại phòng: `SELECT * FROM room_types WHERE id = ? FOR UPDATE`.
   - Tính toán $AvailableRooms$ theo công thức trên.
   - Nếu $AvailableRooms \ge RequestedQuantity$:
     - Tạo bản ghi `Booking` với trạng thái `PENDING` và gán đúng giá trị `hold_expires_at`.
     - Sinh $N$ bản ghi dự kiến trong `booking_rooms` với đơn giá snapshot (`room_id` để `NULL`, sẽ gán khi Check-in).
     - Nếu chọn VNPay: Tạo `PaymentTransaction` trạng thái `PENDING` (thời hạn 15 phút) $\to$ Sinh URL VNPay.
     - Commit Transaction.
   - Nếu $AvailableRooms < RequestedQuantity$:
     - Rollback Transaction $\to$ Ném ngoại lệ `RoomNotAvailableException` ("Số lượng phòng trống không đủ").

2. **Khi Check-in (Lock Phòng Vật lý Cụ thể):**
   - Khi Lễ tân chọn danh sách $N$ phòng vật lý cụ thể (ví dụ: Phòng 101, 102), backend mở Transaction và thực hiện khóa trực tiếp các dòng phòng vật lý đó:
     ```sql
     SELECT * FROM rooms WHERE id IN (:roomIds) FOR UPDATE;
     ```
   - Kiểm tra nghiêm ngặt: Toàn bộ $N$ phòng này phải đang có `status = 'AVAILABLE'`.
   - Nếu có bất kỳ phòng nào đã bị Lễ tân ở quầy khác chọn gán trước đó trong cùng 1 thời điểm $\to$ Rollback Transaction và ném lỗi `RoomAlreadyAssignedException` yêu cầu chọn lại phòng khác, đảm bảo hai giao dịch không bao giờ cùng gán chung một phòng vật lý.
   - Nếu hợp lệ: Cập nhật $N$ phòng sang `OCCUPIED`, gán `room_id` vào `booking_rooms`, chuyển Booking sang `CHECKED_IN` $\to$ Commit Transaction.

---

# 5. Yêu cầu kỹ thuật chi tiết (Technical Requirements)

## 5.1. Chi tiết Tech Stack

| Tầng              | Công nghệ lựa chọn            | Phiên bản           | Mục đích & Ràng buộc kỹ thuật                                    |
|-------------------|-------------------------------|---------------------|------------------------------------------------------------------|
| **Backend**       | Spring Boot                   | 3.3.x (3.3.5)       | Framework Java chuẩn doanh nghiệp, kiến trúc phân lớp sạch       |
| **Ngôn ngữ**      | Java                          | 21 LTS              | Records, Virtual Threads, Pattern Matching, Temurin-21 Base      |
| **Frontend**      | ReactJS + Vite                | React 18/19, Vite 5 | SPA tối ưu, tốc độ build nhanh, HMR tức thì                      |
| **Styling**       | Tailwind CSS / CSS Modules    | 3.4.x / Vanilla     | Responsive trên mọi kích thước màn hình                          |
| **ORM**           | Spring Data JPA (Hibernate 6) | Mới nhất            | Transaction management, `@Lock(LockModeType.PESSIMISTIC_WRITE)`  |
| **Database**      | MySQL                         | 8.0                 | Lưu trữ ACID, Row-level Locking với InnoDB Engine                |
| **Database Migration** | Flyway                   | 10.x                | Quản lý phiên bản schema độc lập (`V1__init`, `V2__seed`)       |
| **Bảo mật**       | Spring Security + JJWT        | 0.12.x              | Stateless JWT, BCryptPasswordEncoder (strength 10)               |
| **Thanh toán**    | VNPay Sandbox API             | v2.1.0              | HMAC-SHA512 checksum, IPN Webhook với kiểm tra Idempotency       |
| **Media Cloud**   | Cloudinary Java SDK           | 1.36.x              | Quản lý và nén ảnh buồng phòng tự động                           |
| **Container**     | Docker & Docker Compose       | Engine 24+, Compose v2 | Môi trường container đồng nhất, networking nội bộ an toàn     |
| **CI / CD**       | GitHub Actions                | v4                  | Pipeline tự động: Build, Unit Test, SSH Deploy VPS               |
| **Reverse Proxy** | Nginx                         | Alpine Mới nhất     | Serve React static, SSL Termination, Proxy pass tới Backend 8080 |

## 5.2. Bảo mật Giao dịch VNPay (Security & Idempotency)
1. **Kiểm tra chữ ký (Checksum Verification):** Mọi request trả về từ VNPay (Return URL và IPN URL) đều bắt buộc băm toàn bộ tham số với `VNPAY_HASH_SECRET` bằng thuật toán HMAC-SHA512. Nếu chữ ký không khớp $\to$ Từ chối xử lý ngay lập tức (mã phản hồi `97`).
2. **Kiểm tra số tiền (Amount Matching):** So sánh `vnp_Amount / 100` với chính xác số tiền cọc đã ghi nhận trên hệ thống. Nếu sai lệch $\to$ Từ chối (mã phản hồi `04`).
3. **Chống xử lý lặp (Idempotent Handling):** VNPay có thể gửi IPN nhiều lần cho cùng 1 giao dịch. Backend kiểm tra trạng thái giao dịch trong DB: nếu đã là `SUCCESS` hoặc `FAILED` thì trả về kết quả thành công ngay mà không thực hiện cộng tiền hay đổi trạng thái lần 2 (mã phản hồi `02`).

---

# 6. Yêu cầu chức năng chi tiết (Functional Requirements)

## 6.1. Phân hệ Khách hàng (Customer)

### FR-01: Đăng ký, Đăng nhập & Token Lifecycle
- **FR-01.1:** Khách hàng đăng ký bằng Email (duy nhất), Mật khẩu (tối thiểu 6 ký tự), Họ tên, Số điện thoại. Mật khẩu mã hóa BCrypt.
- **FR-01.2:** Đăng nhập thành công trả về Access Token (15–30 phút) và Refresh Token (7 ngày, lưu `HttpOnly Cookie`).
- **FR-01.3:** Tự động gọi endpoint refresh token khi access token hết hạn; tự động đăng xuất nếu refresh token hết hạn.

### FR-02: Tra cứu Loại phòng & Kiểm tra phòng trống
- **FR-02.1:** Khách chọn ngày Check-in, ngày Check-out (bắt buộc `Check-out > Check-in`) và số khách.
- **FR-02.2:** Hệ thống trả về danh sách Loại phòng còn phòng trống, số lượng phòng còn lại khả dụng và giá/đêm.
- **FR-02.3:** Xem trang chi tiết Loại phòng: Hình ảnh Cloudinary, tiện nghi, mô tả, chính sách cọc và hủy phòng.

### FR-03: Đặt phòng & Thanh toán Cọc VNPay
- **FR-03.1:** Khách hàng chọn Loại phòng, ngày lưu trú và **số lượng phòng cần đặt ($N \ge 1$)**.
- **FR-03.2:** Khách chọn phương thức thanh toán:
  - *Phương thức A (Cọc VNPay):* Bắt buộc cọc đúng **50% tổng tiền phòng**. Hệ thống giữ quota trong 15 phút (`hold_expires_at = created_at + 15m`) và chuyển hướng đến trang thanh toán VNPay. Khách thanh toán thành công $\to$ Giao dịch `SUCCESS`, Booking tự động chuyển `CONFIRMED`, `PaymentStatus` chuyển `PARTIALLY_PAID`.
  - *Phương thức B (Thanh toán tại khách sạn):* Booking tạo ở trạng thái `PENDING`, `PaymentStatus` là `UNPAID`. Hệ thống tự động gán thời hạn giữ chỗ `hold_expires_at`: giữ 24 giờ cho đơn đặt trước $\ge 24h$ để Lễ tân liên hệ xác minh, hoặc giữ đến 18:00 ngày Check-in cho đơn đặt trong ngày. Đơn giữ quota cho toàn bộ khoảng lưu trú $[CheckIn, CheckOut)$ trong thời gian còn hạn. Lễ tân bấm "Xác nhận" $\to$ chuyển `CONFIRMED`. Quá hạn mà chưa duyệt $\to$ Cronjob tự động hủy (`UNCONFIRMED_TIMEOUT`), giải phóng quota.
- **FR-03.3 [Mở rộng]:** Chọn không dùng xe hoặc chọn gói xe ghép/đoàn, xe riêng; hiển thị riêng phí xe và nhãn Chờ Lễ tân xác nhận theo FR-22. Không lựa chọn mặc định dịch vụ có phí.

### FR-04: Lịch sử Đặt phòng & Tự Hủy phòng Hoàn cọc
- **FR-04.1:** Xem danh sách booking cá nhân theo từng tab trạng thái (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`).
- **FR-04.2:** Khách hàng gửi yêu cầu hủy đơn:
  - Đơn chưa cọc: Hủy ngay lập tức $\to$ Booking chuyển `CANCELLED`, giải phóng quota phòng.
  - Đơn đã cọc hoặc đã thanh toán đủ: Hệ thống tính số tiền phạt dựa trên mức cọc quy chuẩn 50% theo mốc **14:00 ngày Check-in** (0%, 30%, 50%, 100%). Số tiền hoàn = Tổng tiền đã trả - Tiền phạt (phần thanh toán vượt cọc luôn được hoàn 100%).
  - Nếu số tiền hoàn lại $> 0$: Khách hàng nhập thông tin tài khoản nhận hoàn (Ngân hàng, Số tài khoản, Tên thụ hưởng). Sau khi xác nhận $\to$ Booking chuyển `CANCELLED`, `PaymentStatus` chuyển `REFUND_PENDING`.
  - **Ràng buộc:** Chặn tuyệt đối việc hủy đơn nếu booking đang có trạng thái `CHECKED_IN`, `CHECKED_OUT`, hoặc `NO_SHOW` (báo lỗi HTTP `400 Bad Request`).

## 6.2. Phân hệ Lễ tân & Vận hành (Receptionist)

### FR-05: Quản lý Danh sách Booking (Table View)
- **FR-05.1:** Giao diện dạng Bảng với đầy đủ bộ lọc: Khoảng ngày, Trạng thái Booking, Trạng thái Thanh toán, tìm kiếm Mã booking / Tên / SĐT.
- **FR-05.2:** Thao tác duyệt đơn: Lễ tân bấm "Xác nhận" đối với đơn `PENDING` thanh toán tại quầy $\to$ Booking chuyển sang `CONFIRMED`.

### FR-06: Nghiệp vụ Check-in (Gán $N$ phòng vật lý)
- **FR-06.1:** Điều kiện tiên quyết: Booking bắt buộc phải ở trạng thái **`CONFIRMED`**.
- **FR-06.2:** Khi khách đến nhận phòng, Lễ tân bấm "Check-in". Modal hiển thị danh sách các phòng vật lý đang `AVAILABLE` thuộc Loại phòng đã đặt.
- **FR-06.3:** Lễ tân tích chọn đủ $N$ phòng cụ thể và bấm "Xác nhận Check-in". Backend mở transaction và khóa ghi các phòng vật lý (`FOR UPDATE`), xác thực toàn bộ $N$ phòng này vẫn đang ở trạng thái `AVAILABLE` trước khi gán vào `booking_rooms`, chuyển Booking sang `CHECKED_IN` và đổi trạng thái $N$ phòng sang `OCCUPIED`. Nếu có phòng bị gán trùng tại quầy khác trong cùng một thời điểm, hệ thống báo lỗi ngay để chọn phòng khác.

### FR-07: Nghiệp vụ Check-out & Đối soát Tất toán
- **FR-07.1:** Khách trả phòng $\to$ Lễ tân bấm "Check-out".
- **FR-07.2:** Modal tính toán công nợ: $\text{Số tiền còn lại} = \text{Tổng tiền phòng + Phí dịch vụ hợp lệ} - \text{Tiền đã thanh toán ròng}$.
- **FR-07.3:** Lễ tân ghi nhận thu tiền mặt/quẹt thẻ $\to$ `PaymentStatus` chuyển `FULLY_PAID`, Booking chuyển `CHECKED_OUT`.
- **FR-07.4:** Toàn bộ $N$ phòng vật lý tự động chuyển trạng thái sang **`CLEANING`**.
- **FR-07.5 [Mở rộng]:** Kiểm tra đơn món/chuyến xe chưa kết thúc trước khi Check-out, khóa Booking và tính lại công nợ từ Backend; xử lý đồng thời với lập đơn hoặc xác nhận giao món theo FR-21/FR-22. Nếu dữ liệu thay đổi sau khi mở modal, trả `409` để tải lại. Chỉ đóng booking khi số dư bằng 0.

### FR-08: Nghiệp vụ Dọn phòng (Housekeeping)
- **FR-08.1:** Màn hình danh sách phòng lọc theo trạng thái `CLEANING`.
- **FR-08.2:** Sau khi phòng được vệ sinh sạch sẽ, nhân viên bấm "Đã dọn xong" $\to$ Phòng chuyển sang `AVAILABLE` sẵn sàng đón khách mới.

### FR-09: Quản lý Hoàn tiền Cọc (Refund Management)
- **FR-09.1:** Tab hiển thị danh sách các đơn `REFUND_PENDING` kèm số tiền cần hoàn và số tài khoản ngân hàng (được che bảo mật dạng `**** **** 7890`).
- **FR-09.2:** Sau khi chuyển khoản cho khách ngoài đời thực, Lễ tân/Admin bấm "Xác nhận đã hoàn" kèm mã giao dịch ngân hàng $\to$ `PaymentStatus` chuyển sang `REFUNDED`.

### FR-10: Xử lý Khách không đến (No-Show) với Booking Nhiều Đêm
- **FR-10.1:** Với đơn đã cọc hoặc đã thanh toán trước mà khách không đến nhận phòng trước 12:00 trưa ngày hôm sau ($CheckIn + 1$): Lễ tân bấm hoặc Cronjob tự động chuyển trạng thái sang `NO_SHOW`.
- **FR-10.2:** Quota của toàn bộ các đêm còn lại (từ ngày $CheckIn + 1$ đến $CheckOut$) được giải phóng ngay lập tức lúc 12:00 ngày $CheckIn + 1$ để mở bán cho khách khác. Khách sạn giữ lại 100% tiền cọc đêm đầu; nếu khách đã trả trước 100%, 50% tiền phòng của các đêm còn lại chưa sử dụng được chuyển sang `REFUND_PENDING` để hoàn tiền cho khách.

## 6.3. Phân hệ Quản trị viên (Admin Only)

### FR-11: Quản trị Danh mục Buồng phòng
- **FR-11.1:** CRUD Loại phòng (Room Type): Tên, sức chứa, giá cơ bản theo đêm, tiện nghi, upload nhiều ảnh lên Cloudinary.
- **FR-11.2:** CRUD Phòng vật lý (Room): Số phòng, tầng, liên kết Loại phòng. Đưa phòng vào trạng thái `MAINTENANCE` khi cần sửa chữa.

### FR-12: Báo cáo & Dashboard Thống kê
- **FR-12.1:** Thống kê Doanh thu dự kiến, Doanh thu thực thu (đã trừ cọc hoàn).
- **FR-12.2:** Biểu đồ Tỷ lệ lấp đầy phòng (%) và cơ cấu trạng thái phòng (`AVAILABLE`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`).

## 6.4. Phân hệ Mở rộng Phase 2 (Phase 2 Expanded Feature Scope)

### FR-13: Lịch phòng trực quan Ma trận Timeline (Interactive Room Timeline Calendar)
- **FR-13.1 (Ma trận Buồng phòng PMS):** Giao diện bảng biểu 2 chiều: Trục dọc là danh sách toàn bộ Phòng vật lý (101, 102, 201...) phân nhóm theo Loại phòng/Tầng; Trục ngang là chuỗi ngày trong tháng (1 đến 30/31).
- **FR-13.2 (Mã màu trực quan):** Thể hiện tình trạng buồng phòng theo quy chuẩn PMS quốc tế:
  - `AVAILABLE`: Màu xám nhạt / trắng (phòng trống, sẵn sàng nhận khách).
  - `CONFIRMED`: Màu xanh dương (đã có đơn đặt giữ chỗ, hiển thị tên khách & mã booking).
  - `CHECKED_IN`: Màu xanh lá cây (khách đang lưu trú thực tế).
  - `CLEANING`: Màu cam cảnh báo (cần nhân viên buồng phòng dọn dẹp).
  - `MAINTENANCE`: Màu đỏ (phòng đang bảo trì thiết bị).
- **FR-13.3 (Thao tác nhanh trên Lịch):** Lễ tân nhấp chuột vào dải phòng bất kỳ để xem nhanh tóm tắt đơn đặt (Khách, SĐT, Ngày đến/đi, Tiền đã thanh toán), hoặc nhấp vào ô trống để tạo nhanh booking mới.
- **FR-13.4 (Backend Matrix API):** Endpoint `/api/v1/rooms/timeline?startDate=...&endDate=...` trả về mảng dữ liệu phòng kèm các khoảng booking/trạng thái tương ứng, tối ưu hóa truy vấn không bị N+1.
- **FR-13.5 [Mở rộng]:** Popup của phòng đang `OCCUPIED` và booking `CHECKED_IN` có nút **Dịch vụ phòng**; không chỉ kiểm tra màu ô Timeline. Hiển thị số đơn chưa giao và sự cố còn mở, cùng tổng phí đã phát sinh của lượt lưu trú hiện tại.

### FR-14: Dashboard Thống kê & Báo cáo Nâng cao (Advanced Analytics Dashboard)
- **FR-14.1 (Chỉ số Kinh doanh Khách sạn):**
  - **ADR (Average Daily Rate):** Giá bán phòng bình quân mỗi đêm: $\text{ADR} = \frac{\text{Doanh thu tiền phòng}}{\text{Số đêm phòng đã bán}}$.
  - **RevPAR (Revenue Per Available Room):** Doanh thu trên mỗi phòng khả dụng: $\text{RevPAR} = \text{ADR} \times \text{Occupancy Rate}$.
- **FR-14.2 (Biểu đồ Xu hướng Đa chiều):** Tích hợp biểu đồ đường/cột thể hiện doanh thu theo tuần, tháng, quý và so sánh giữa các loại phòng (Deluxe vs Suite vs Standard).
- **FR-14.3 (Xuất dữ liệu Excel/CSV):** Hỗ trợ xuất dữ liệu doanh thu và danh sách booking ra định dạng Excel/CSV phục vụ kế toán.

### FR-15: Email Thông báo Tự động & Xuất Hóa đơn PDF (Automated Email & PDF Invoices)
- **FR-15.1 (Email Giao dịch Tự động):**
  - Khi khách đặt cọc VNPay thành công: Tự động kích hoạt luồng bất đồng bộ (`@Async`) qua `JavaMailSender` gửi Email xác nhận đặt phòng kèm mã QR tra cứu đơn.
  - Khi đơn bị hủy hoặc hoàn tiền: Gửi thông báo chi tiết số tiền hoàn và thời gian dự kiến nhận tiền.
- **FR-15.2 (Sinh Hóa đơn PDF Chuẩn hóa):**
  - Sử dụng thư viện `OpenPDF` / `iText` tại Backend tạo hóa đơn PDF định dạng A4 chuyên nghiệp (Logo Grand Aurora, Thông tin khách, Chi tiết các đêm ở, Chiết khấu, Thuế VAT 8%, Số tiền cọc đã trả, Số tiền còn lại đã tất toán).
  - Hóa đơn được đính kèm trực tiếp trong Email khi khách Check-out, đồng thời cung cấp nút **"Tải Hóa đơn PDF"** trên giao diện Khách hàng và Lễ tân.
- **FR-15.3 [Mở rộng]:** PDF liệt kê tiền phòng, từng món/đồ uống đã giao (số lượng, đơn giá snapshot), chuyến xe đã hoàn thành, tổng phải trả, tiền đã thu/hoàn và số dư. Yêu cầu sửa chữa và dịch vụ hủy không tính phí. Phiếu xác nhận booking chỉ hiển thị xe ở dạng yêu cầu và mức phí dự kiến nếu chưa được duyệt.

### FR-16: Audit Log Hệ thống (Security & Activity Audit Logging)
- **FR-16.1 (Ghi vết Thao tác Tự động):** Sử dụng Spring AOP (`@Around` / `@AfterReturning`) ghi log toàn bộ các hành động nhạy cảm trong hệ thống vào bảng `audit_logs`:
  - Ai thực hiện (Email, Role, Địa chỉ IP).
  - Loại hành động: `CHECK_IN_ASSIGN_ROOM`, `CHECK_OUT_SETTLEMENT`, `CANCEL_BOOKING`, `CONFIRM_REFUND`, `CHANGE_ROOM_STATUS`, `UPDATE_PRICE`.
  - Dữ liệu trước và sau khi thay đổi (JSON Diff).
- **FR-16.2 (Giao diện Tra cứu Log cho Admin):** Bảng quản trị xem lịch sử thao tác, hỗ trợ lọc theo ngày, người thực hiện và loại hành động để đối soát khi có tranh chấp nghiệp vụ.
- **FR-16.3 [Mở rộng]:** Ghi Audit Log khi tạo/hủy/giao đơn món, cập nhật sự cố, sửa danh mục giá, duyệt/hủy/hoàn thành xe và quyết toán dịch vụ; lưu actor, thời điểm, mã booking, ID nguồn và trạng thái trước/sau. Che SĐT và không ghi địa chỉ đón chi tiết vào log chung.

### FR-17: Kiểm thử Tải & Chống Lỗi Đặt trùng (JMeter Concurrency Stress Testing)
- **FR-17.1 (Kịch bản Tranh chấp Cực hạn):** Thiết lập kịch bản kiểm thử tải bằng **Apache JMeter** mô phỏng 100 người dùng đồng thời gửi request đặt duy nhất 1 phòng còn lại trong cùng 1 giây.
- **FR-17.2 (Kiểm chứng Khóa Pessimistic):** Cam kết 100% không phát sinh Overbooking: Duy nhất 1 booking hợp lệ được tạo, 99 requests còn lại nhận phản hồi HTTP `409 Conflict` có thông báo rõ ràng.
- **FR-17.3 (Báo cáo Kết quả Đo kiểm):** Xuất báo cáo đồ thị JMeter (Throughput, Latency 95th percentile, Error Rate) làm bằng chứng kiểm thử bảo vệ đồ án.

### FR-18: Trợ lý AI Chatbot Tư vấn Đặt phòng (AI Hotel Concierge Assistant)
- **FR-18.1 (Tích hợp Google Gemini API):** Tích hợp Gemini 1.5 Flash thông qua Backend API proxy an toàn (bảo mật API Key trên máy chủ).
- **FR-18.2 (Khung Chat Widget Nổi):** Khách hàng có thể nhấp vào biểu tượng Chatbot ở góc dưới màn hình từ bất kỳ trang nào.
- **FR-18.3 (Khả năng Tư vấn Thông minh):**
  - Chatbot nắm bắt dữ liệu danh mục phòng thực tế của khách sạn (giá, sức chứa, tiện nghi hồ bơi/gym/buffet).
  - Tiếp nhận yêu cầu tự nhiên của khách (ví dụ: *"Gia đình 4 người đi 3 ngày 2 đêm cuối tuần cần phòng view biển, giá dưới 3 triệu/đêm thì chọn loại nào?"*).
  - Phân tích và đề xuất loại phòng tối ưu, giải thích chính sách cọc 50% và đưa link trực tiếp đến trang đặt phòng.

### FR-19: Mở rộng Thanh toán & Sổ cái Hoàn cọc (Extended Payment & Refund Ledger)
- **FR-19.1 (Sổ cái Đối soát Giao dịch):** Quản lý chi tiết từng lượt giao dịch cọc VNPay, thanh toán tiền mặt/chuyển khoản tại quầy, và các khoản xuất hoàn tiền cọc.
- **FR-19.2 (Minh bạch Luồng Tiền):** Tính toán dòng tiền ròng: $\text{Dòng tiền thực thu} = \text{Tổng tiền cọc online} + \text{Tổng tiền thu tại quầy} - \text{Tổng tiền đã hoàn cọc}$.
- **FR-19.3 (Cơ chế Đối soát Idempotent Đa kênh):** Đảm bảo không trùng lặp khi ghi nhận thanh toán bổ sung khi khách dùng thêm dịch vụ trong thời gian lưu trú.

### FR-20: Giám sát Hệ thống & Tự động Sao lưu Dữ liệu (System Monitoring & Automated Backup)
- **FR-20.1 (Health Check & Metrics với Spring Actuator):**
  - Kích hoạt endpoint `/actuator/health` giám sát trạng thái kết nối MySQL, dung lượng ổ đĩa, trạng thái các dịch vụ nền.
  - Endpoint `/actuator/metrics` đo lường số lượng HTTP requests, thời gian xử lý trung bình và mức chiếm dụng RAM JVM.
- **FR-20.2 (Tự động Sao lưu Cơ sở Dữ liệu):**
  - Thiết lập Cronjob trên máy chủ VPS chạy định kỳ vào **00:00 mỗi đêm**: Tự động thực thi `mysqldump`, nén tệp `.sql.gz` có gắn timestamp (ví dụ: `hotel_db_backup_20261027_0000.sql.gz`).
  - Chính sách lưu trữ giữ lại bản sao lưu của 30 ngày gần nhất và tự động dọn dẹp các bản ghi cũ hơn để tiết kiệm dung lượng ổ cứng.
  - Cung cấp kịch bản khôi phục 1 câu lệnh (`mysql < backup.sql`) đảm bảo RTO (Recovery Time Objective) dưới 5 phút.
- **FR-20.3 (Mở rộng Giám sát Nâng cao):** Cấu hình sẵn sàng cho Prometheus thu thập metrics và Grafana hiển thị dashboard trực quan khi cần thiết.

### FR-21: Dịch vụ phòng qua Lễ tân (Room Service & Maintenance Requests)
- **FR-21.1 (Điều kiện sử dụng):** Receptionist/Admin mở nút **Dịch vụ phòng** trên phòng có khách. Backend kiểm tra đồng thời phòng `OCCUPIED`, booking `CHECKED_IN` và BookingRoom thuộc chính booking đó. Không cho khách tự gọi món trên website trong phạm vi hiện tại; khách liên hệ Lễ tân, Lễ tân nhập yêu cầu.
- **FR-21.2 (Danh mục món):** Admin thêm/sửa/ngừng bán đồ ăn, đồ uống; tên, nhóm, đơn vị và giá là bắt buộc. Danh mục vận hành chỉ cho chọn món đang bán. Giá không âm; số lượng là số nguyên dương; đơn phải có ít nhất một dòng và không lặp `serviceItemId`. Tên/giá tại thời điểm gọi được lưu snapshot.
- **FR-21.3 (Lập đơn):** Popup hiển thị số phòng, mã booking, tên khách, danh sách món, đơn giá, ô số lượng, thành tiền và ghi chú. Backend tính tiền; nếu danh mục thay đổi sau lúc khách được báo giá thì báo xung đột để Lễ tân xác nhận lại. Mỗi lần gọi tạo đơn mới, không sửa đơn đã giao; hai phòng trong một booking có đơn riêng và tổng hợp chung khi trả phòng.
- **FR-21.4 (Theo dõi xử lý):** `PENDING → PREPARING → DELIVERED`; Lễ tân cập nhật sau khi phối hợp bếp/phục vụ. Cho hủy khi chưa giao, lưu lý do và người hủy. Không tự tạo khoản thu khi mới lập đơn. Chỉ `DELIVERED` được cộng vào công nợ đúng một lần; trạng thái cuối khóa chỉnh sửa nội dung.
- **FR-21.5 (Báo sự cố):** Tab Báo sự cố nhận mô tả bắt buộc, mức ưu tiên và cờ cần sửa trước khi bán lại (`blocksResale`). Lễ tân ghi nhận `OPEN`, chuyển `IN_PROGRESS` khi đã báo kỹ thuật và `RESOLVED` kèm kết quả xử lý. Đây là phiếu vận hành, không phải đơn món và không mặc định tính tiền khách.
- **FR-21.6 (Bảo toàn trạng thái phòng):** Tạo phiếu sự cố không tự chuyển phòng có khách sang `MAINTENANCE` hoặc giải phóng quota. Nếu cần đổi phòng phải qua nghiệp vụ riêng có kiểm tra khả dụng. Sau trả phòng, phiếu chưa xử lý có `blocksResale=true` ngăn phòng trở lại `AVAILABLE`; khi cần bảo trì chuyển từ trạng thái trống phù hợp theo quy trình hiện hữu.
- **FR-21.7 (Lịch sử và đối soát):** Lọc đơn/phiếu theo booking, phòng, trạng thái, ngày; không trộn dữ liệu khách cũ theo mỗi số phòng. Khách chỉ xem chi tiết phí của chính mình. Đơn món còn chờ xử lý phải được giao hoặc hủy trước Check-out; phiếu sự cố không chặn tất toán tiền nhưng vẫn được theo dõi sau khi khách trả phòng.
- **FR-21.8 (Đồng thời và retry):** Tạo đơn, giao món, hủy đơn và Check-out khóa cùng Booking, kiểm tra version và thực hiện transaction. Request tạo đơn có `Idempotency-Key` để double-click/retry không sinh hai đơn. Sau `CHECKED_OUT`, từ chối tạo hoặc ghi thêm phí; tranh chấp trả `409 Conflict`.

### FR-22: Đăng ký & Quản lý Xe đưa đón (Hotel Transfer Service)
- **FR-22.1 (Phạm vi triển khai):** Đợt mở rộng hỗ trợ **một chuyến đón khách về khách sạn cho mỗi booking**. Chọn xe ghép/theo đoàn (`SHARED`) hoặc xe riêng (`PRIVATE`); xe ghép không mặc định miễn phí. Chuyến trả khách sau Check-out, nhiều chặng, bán vé độc lập và định vị xe chưa thuộc đợt này.
- **FR-22.2 (Danh mục gói):** Admin quản lý tên gói, loại xe, mô tả tuyến/điểm phục vụ, số khách tối đa, đơn vị giá, mức giá và trạng thái hoạt động. `SHARED` tính `PER_PERSON`, `PRIVATE` tính `PER_TRIP`; giá có thể bằng 0 cho gói miễn phí đã công bố. Thay đổi giá chỉ áp dụng yêu cầu mới.
- **FR-22.3 (Form booking):** Mặc định Không sử dụng. Khi chọn xe, bắt buộc gói còn hoạt động, điểm đón, thời gian đón, số người (> 0, không vượt giới hạn gói), SĐT; mã chuyến bay/tàu và hành lý nhập ghi chú nếu có. Thời gian đón phải ở tương lai và cùng ngày Check-in theo `Asia/Ho_Chi_Minh`. Số người đi xe không mặc định bằng số phòng; lưu thành trường riêng.
- **FR-22.4 (Giá và xác nhận):** Backend tính `totalAmount = unitPriceSnapshot × passengerCount` cho xe ghép, hoặc `unitPriceSnapshot` cho một lượt xe riêng. Hiển thị mức phí trước khi gửi. Yêu cầu khởi tạo `PENDING`, tách trạng thái booking; Lễ tân chỉ xác nhận xe khi booking `CONFIRMED` và đã kiểm tra khả năng phục vụ. Không cam kết có xe chỉ vì booking đã xác nhận.
- **FR-22.5 (Vận hành):** Receptionist/Admin có bảng yêu cầu lọc theo ngày giờ, loại xe, trạng thái, mã booking; xem điểm đón, số khách, liên hệ và ghi chú. Lễ tân điều phối thủ công, nhập thông tin xe/biển số, tên và SĐT tài xế trước khi chuyển `CONFIRMED`; sau khi hoàn thành chuyển `COMPLETED`. Không tự cấp tài khoản cho tài xế hay gửi thông báo cho người ngoài.
- **FR-22.6 (Sửa/hủy):** Khách được hủy yêu cầu của mình khi `PENDING` và chưa tới giờ đón, có lý do; yêu cầu đã xác nhận cần liên hệ Lễ tân. Lễ tân được hủy `PENDING`/`CONFIRMED` nếu chưa thực hiện, lưu lý do; không thu phí hủy xe ở phiên bản này. Không sửa thông tin chuyến đã hoàn thành. Thay đổi lịch/địa điểm khi đã gửi được Lễ tân xử lý ngoài hệ thống; nếu phải thay gói/giá cần thống nhất contract bổ sung, không âm thầm đổi snapshot.
- **FR-22.7 (Hủy booking và No-Show):** Khi booking hủy/hết hạn/No-Show, hủy yêu cầu xe chưa hoàn thành trong cùng transaction và lưu lý do liên quan. Nếu chuyến đã hoàn thành, giữ lịch sử và khoản phí, chuyển đối soát thủ công; không gọi luồng hoàn tiền cọc tự động và không tự trừ phí xe vào tiền cọc. Lễ tân thu/xác nhận đủ phí xe riêng trước khi xác nhận hoàn tiền phòng. Công thức phạt cọc hiện hữu chỉ áp dụng tiền phòng.
- **FR-22.8 (Công nợ và chống trùng):** Chỉ chuyến `COMPLETED` mới cộng phí đúng một lần vào booking. Dữ liệu gói/giá snapshot được Backend xác thực; yêu cầu xe được tạo cùng booking hoặc thêm một lần khi booking `PENDING`/`CONFIRMED`, trước giờ đón. Ràng buộc unique theo `booking_id`, Idempotency và khóa Booking ngăn tạo trùng cũng như hoàn thành xe đồng thời với hủy booking/Check-out. Không mở lại yêu cầu đã hủy trong phạm vi hiện tại.

---

# 7. Yêu cầu phi chức năng (Non-Functional Requirements)

## 7.1. Hiệu năng & Khả năng chịu tải (Performance)
- **NFR-01 (API Latency):** Thời gian phản hồi cho các API tìm kiếm phòng trống và chi tiết phòng dưới **500ms** trong điều kiện cơ sở dữ liệu mẫu có 100 phòng và 500 booking. Đo bằng Postman Runner hoặc JMeter.
- **NFR-02 (Frontend Performance):** Điểm First Contentful Paint (FCP) dưới **2 giây** khi đo bằng Google Lighthouse trên môi trường mạng tiêu chuẩn (Fast 3G / 4G).
- **NFR-03 (Concurrency & Pessimistic Locking):** Hệ thống chịu tải tối thiểu **50 requests đồng thời** trên môi trường VPS tiêu chuẩn (2 vCPU, 4GB RAM). Khi giả lập 10 requests cùng đặt 1 phòng cuối cùng trong cùng 1 tích tắc, cơ chế Pessimistic Lock phải đảm bảo chỉ đúng 1 request thành công, 9 requests còn lại nhận lỗi `409 Conflict`.
- **[Mở rộng]** Danh mục món/gói xe và danh sách yêu cầu dùng phân trang theo mục 11.1, index theo ngày/trạng thái/booking; tránh truy vấn N+1 khi tổng hợp phí của booking nhiều phòng.

## 7.2. An toàn & Bảo mật (Security)
- **NFR-04 (Mã hóa):** Mật khẩu băm bằng `BCrypt` (strength 10). Không lưu mật khẩu thuần trong bất kỳ hoàn cảnh nào.
- **NFR-05 (Bảo vệ API):** Mọi API quản trị và booking đều kiểm tra JWT và phân quyền `@PreAuthorize`.
- **NFR-06 (Bảo vệ dữ liệu nhạy cảm):** Số tài khoản ngân hàng của khách khi hiển thị trên giao diện quản trị hoàn cọc bắt buộc phải che bớt (`**** **** 1234`). Toàn bộ API Keys (VNPay Secret, Cloudinary Key, JWT Secret) bắt buộc nạp qua biến môi trường.
- **NFR-07 (Chữ ký điện tử & Idempotency):** Xác thực chữ ký HMAC-SHA512 với mọi webhook IPN từ VNPay; chặn xử lý trùng lặp giao dịch.
- **[Mở rộng]** Mọi API dịch vụ kiểm tra quyền ở Backend; ID phòng/booking/item không thay thế kiểm tra liên kết và sở hữu. Chỉ nhân viên có quyền vận hành và khách sở hữu yêu cầu được xem thông tin xe cần thiết; SĐT và điểm đón không xuất hiện trong API công khai. Giá, tổng tiền và trạng thái tài chính do Backend quyết định.

## 7.3. Tiêu chuẩn mã nguồn & Kiến trúc phân lớp (Maintainability)
- **NFR-08 (Layered Architecture):** Tuân thủ kiến trúc phân lớp Controller $\to$ Service $\to$ Repository bên trong từng module của Modular Monolith. Sử dụng DTO phân tách với Entity để tránh lỗi serialize Jackson và lộ thông tin nhạy cảm.
- **NFR-09 (Global Exception Handling):** Mọi lỗi nghiệp vụ đều được trả về theo định dạng chuẩn thống nhất qua `@RestControllerAdvice`:
  ```json
  {
    "timestamp": "2026-10-19T18:00:00Z",
    "status": 400,
    "error": "Bad Request",
    "message": "Số lượng phòng trống không đủ",
    "path": "/api/v1/bookings"
  }
  ```

## 7.4. Giao diện người dùng & Khả năng tương thích (UI/UX)
- **NFR-10 (Responsive Design):** Tương thích hoàn chỉnh từ màn hình di động (375px), tablet (768px) đến màn hình desktop lớn (1920px).
- **NFR-11 (Cross-Browser):** Chạy mượt mà trên Chrome, Edge, Firefox, Safari.
- **[Mở rộng]** Form đặt phòng hiển thị phí xe riêng, nhãn chờ duyệt và lựa chọn không dùng; Popup dịch vụ phòng hiển thị số phòng/mã booking cố định, tổng tiền trước xác nhận và tiến độ từng yêu cầu. Vô hiệu hóa nút khi đang gửi và thông báo xung đột rõ ràng; vẫn phải có kiểm tra Backend để chống gửi lặp.

---

# 8. Tiêu chí nghiệm thu & Thang điểm (60/40)

```text
TỔNG ĐIỂM: 100 ĐIỂM
├── Yêu cầu Chức năng (Functional): 60 Điểm
└── Yêu cầu Phi chức năng & DevOps (Technical): 40 Điểm
```

|  STT   | Nhóm tiêu chí                     | Nội dung nghiệm thu cụ thể                                                                                   |  Điểm  |
|:------:|-----------------------------------|--------------------------------------------------------------------------------------------------------------|:------:|
| **I**  | **YÊU CẦU CHỨC NĂNG**             |                                                                                                              | **60** |
|   1    | Xác thực & Phân quyền             | Đăng ký, đăng nhập JWT, tự động refresh token, phân đúng 3 quyền CUSTOMER/RECEPTIONIST/ADMIN.                |   10   |
|   2    | Danh mục & Tìm kiếm               | Tìm phòng theo ngày nhận/trả và số khách; hiển thị đúng số phòng khả dụng theo Loại phòng.                   |   10   |
|   3    | Đặt $N$ phòng & Chống Overbooking | Đặt số lượng $N$ phòng thành công; Pessimistic Lock chặn đặt trùng phòng khi hết quota; snapshot giá đúng.   |   15   |
|   4    | Thanh toán VNPay & Giữ chỗ 15p    | Tích hợp thành công cọc 50% VNPay Sandbox; xác thực HMAC-SHA512; kiểm tra Idempotent IPN.                    |   10   |
|   5    | Vận hành Lễ tân (Check-in/out)    | Xác nhận đơn; Check-in gán đủ $N$ phòng vật lý; Check-out đối soát tất toán; luồng dọn phòng `CLEANING`.     |   10   |
|   6    | Hủy phòng, Hoàn cọc & No-Show     | Hủy phòng tính phạt chuẩn mốc 14:00; duyệt hoàn cọc thủ công; Cronjob 18:00 hủy đơn chưa cọc; xử lý No-Show. |   5    |
| **II** | **PHI CHỨC NĂNG & DEVOPS**        |                                                                                                              | **40** |
|   7    | Docker & Docker Compose           | Chạy toàn bộ hệ thống (Frontend Nginx, Backend, MySQL) qua `docker compose up -d` hoàn toàn không lỗi.       |   10   |
|   8    | CI/CD GitHub Actions              | Pipeline tự động build, test backend/frontend trên PR; tự động deploy VPS qua SSH khi merge `main`.          |   10   |
|   9    | Triển khai thực tế trên VPS       | Sản phẩm chạy trực tiếp trên VPS có IP/Domain công khai, thao tác demo thực tế trơn tru.                     |   10   |
|   10   | Đóng góp Git & Code Quality       | Lịch sử commit/PR thể hiện rõ công sức cả 5 thành viên; cấu trúc phân lớp sạch, test coverage $\ge 80\%$.    |   10   |

**Tiêu chí nghiệm thu bổ sung FR-21/FR-22 (giữ nguyên thang điểm 60/40):**

| Mã | Kịch bản phải đạt |
|---|---|
| AC-21-01 | Phòng có khách mở đúng Popup; phòng trống, phòng của booking khác, khách tự gọi API tạo đơn đều bị từ chối. |
| AC-21-02 | Gọi 2 món × 50.000 VND và 1 đồ uống × 20.000 VND được 120.000 VND; sửa giá danh mục không đổi đơn cũ; món ngừng bán và số lượng ≤ 0 bị chặn. |
| AC-21-03 | Giao món/retry chỉ tăng công nợ một lần; đơn hủy không tính tiền; hai phòng cùng booking có lịch sử riêng và cộng đúng tổng. |
| AC-21-04 | Phiếu sự cố không tính tiền, không tự giải phóng phòng; cờ chặn bán lại còn hiệu lực sau Checkout tới khi xử lý xong. |
| AC-22-01 | Không chọn xe vẫn đặt phòng như cũ; xe ghép 3 người × 100.000 VND = 300.000 VND; xe riêng 500.000 VND/lượt cho 3 người vẫn là 500.000 VND. Giá chỉ là dữ liệu test. |
| AC-22-02 | Từ chối quá sức chứa, giờ quá khứ/sai ngày, gói ngừng bán, khách xem/hủy yêu cầu người khác; booking xác nhận không tự xác nhận xe. |
| AC-22-03 | Hủy booking hủy xe chưa chạy; chuyến đã hoàn thành giữ lịch sử và chuyển đối soát thủ công; cập nhật hoàn thành/retry không cộng phí hai lần. |
| AC-INT-01 | Tiền phòng 2.400.000, cọc 1.200.000, món đã giao 120.000, xe hoàn thành 300.000 → tổng 2.820.000, còn thu 1.620.000 VND; PDF/API/FE trùng nhau. |
| AC-INT-02 | Tạo/giao món đồng thời Check-out không bỏ sót phí; còn yêu cầu chưa kết thúc hoặc chưa thu đủ thì không Checkout; migration giữ booking cũ hoạt động với phí dịch vụ bằng 0. |

---

# 9. Bảng tổng hợp Quy tắc nghiệp vụ cốt lõi (Core Business Rules)

1. **Quy chuẩn giờ giấc:** Giờ nhận phòng tiêu chuẩn là **14:00**, giờ trả phòng tiêu chuẩn là **12:00 trưa**. Khoảng lưu trú tối thiểu là 1 đêm.
2. **Quy định Đặt cọc:** Bắt buộc cọc đúng **50% tổng tiền phòng** khi thanh toán online qua VNPay Sandbox.
3. **Quy định Giữ chỗ Quota tạm thời theo `hold_expires_at`:**
   - Đơn thanh toán VNPay: Giữ quota trong vòng đúng **15 phút** (`hold_expires_at = created_at + 15m`). Quá 15 phút mà chưa thanh toán $\to$ Giao dịch chuyển `EXPIRED`, Booking chuyển `CANCELLED`, giải phóng quota phòng ngay lập tức. Nếu thanh toán thành công đến muộn: chỉ kích hoạt lại nếu còn phòng; nếu đã hết phòng thì giữ nguyên `CANCELLED` và tự động chuyển `PaymentStatus` sang `REFUND_PENDING` để hoàn 100% tiền cọc cho khách.
   - Đơn thanh toán tại khách sạn (`PENDING`, `UNPAID`): Giữ quota cho toàn bộ kỳ lưu trú trong thời hạn `hold_expires_at` (24 giờ kể từ lúc tạo với đơn đặt trước $\ge 24h$, hoặc đến 18:00 ngày Check-in với đơn trong ngày) để Lễ tân liên hệ khách xác nhận đơn. Quá thời hạn này mà Lễ tân chưa bấm xác nhận $\to$ Cronjob tự động chuyển `CANCELLED` (Lý do: `UNCONFIRMED_TIMEOUT`), giải phóng quota phòng.
4. **Quy định Bắt buộc Xác nhận trước Check-in:** Mọi booking đều phải ở trạng thái **`CONFIRMED`** mới được phép làm thủ tục Check-in.
5. **Quy định Gán phòng & Chống xung đột Check-in:** Khách đặt $N$ phòng theo Loại phòng $\to$ Lúc Check-in, Lễ tân gán đúng $N$ phòng vật lý cụ thể đang `AVAILABLE`. Thao tác gán phòng được bảo vệ bằng Pessimistic Lock trên các bản ghi `Room` (`FOR UPDATE`), ngăn chặn 2 quầy gán trùng một phòng.
6. **Quy định Luồng dọn phòng:** Sau khi Check-out, phòng vật lý tự động chuyển sang **`CLEANING`**. Sau khi nhân viên buồng phòng dọn xong và xác nhận, phòng mới chuyển về **`AVAILABLE`**.
7. **Quy định Phạt Hủy phòng & Hoàn tiền (Căn cứ khoảng thời gian $T$ đến 14:00 ngày Check-in):**
   - Tiền phạt hủy phòng luôn được tính theo mức cọc quy chuẩn (50% tổng tiền phòng):
     $$\text{Tiền phạt} = \text{Tỷ lệ phạt theo mốc } T \times \text{Tiền cọc quy chuẩn (50\% tổng tiền)}$$
     - $T \ge 24\text{ giờ}$ (Trước $\ge$ 24h): Phạt 0% (Hoàn 100% số tiền đã thanh toán).
     - $12\text{ giờ} \le T < 24\text{ giờ}$ (Từ đủ 12h đến dưới 24h): Phạt 30% tiền cọc (Khấu trừ $15\%$ tổng tiền phòng; hoàn trả lại toàn bộ phần tiền còn lại).
     - $0\text{ giờ} < T < 12\text{ giờ}$ (Dưới 12h đến trước giờ nhận phòng): Phạt 50% tiền cọc (Khấu trừ $25\%$ tổng tiền phòng; hoàn trả lại toàn bộ phần tiền còn lại).
     - $T \le 0$ (Tại hoặc sau 14:00 ngày Check-in): Phạt 100% tiền cọc (Khách sạn giữ lại đúng 50% tổng tiền; hoàn lại phần tiền thanh toán vượt cọc nếu khách đã đóng trước 100%).
   - Số tiền hoàn lại: $\text{Số tiền hoàn} = \text{Tổng tiền khách thực tế đã thanh toán} - \text{Tiền phạt}$.
8. **Quy định Chặn hủy booking sau khi đã Check-in/Check-out:** Nghiêm cấm hủy các booking có trạng thái `CHECKED_IN`, `CHECKED_OUT`, hoặc `NO_SHOW` qua luồng hủy trực tuyến thông thường (trả về lỗi HTTP `400 Bad Request`). Việc rời đi sớm khi đang ở thuộc quy trình Early Check-out do Lễ tân xử lý trực tiếp tại quầy.
9. **Quy định Xử lý No-Show đối với Booking nhiều đêm:**
   - Phòng được giữ đảm bảo qua đêm đầu tiên đến đúng **12:00 trưa ngày hôm sau ($CheckIn + 1\text{ ngày}$)**.
   - Tại mốc 12:00 ngày $CheckIn + 1$, nếu khách không đến nhận phòng: chuyển trạng thái sang **`NO_SHOW`**, đồng thời **giải phóng ngay lập tức toàn bộ quota của các đêm còn lại** (từ trưa ngày $CheckIn + 1$ đến $CheckOut$) để mở bán lại cho khách khác.
   - Khách sạn giữ lại 100% tiền cọc đêm đầu (50% tổng tiền). Nếu khách đã thanh toán 100%, 50% tiền còn lại của các đêm chưa ở được tự động chuyển sang **`REFUND_PENDING`** để hoàn trả lại cho khách.
10. **Dịch vụ phòng:** Chỉ lập yêu cầu cho đúng BookingRoom đang có khách; snapshot giá; chỉ món đã giao tính phí; sửa chữa không thu phí mặc định và không thay đổi trạng thái phòng tự động.
11. **Xe đón:** Tối đa một yêu cầu/booking; xe ghép tính theo người, xe riêng theo lượt; giá do gói quyết định. Booking và yêu cầu xe có trạng thái độc lập; Lễ tân xác nhận khả năng phục vụ thủ công.
12. **Quyết toán mở rộng:** Cọc 50% vẫn chỉ tính trên tiền phòng. Tổng nghĩa vụ = tiền phòng + món đã giao + xe đã hoàn thành. Không tất toán khi còn đơn món/xe chưa kết thúc hoặc số dư khác 0; không ghi phí mới sau Check-out.
13. **Hủy và hoàn tiền có dịch vụ:** Trong các công thức hủy/No-Show tại mục 2.6, FR-04/FR-10 và API hủy, “tổng tiền đã thanh toán” được hiểu là phần đã phân bổ cho tiền phòng; không bao gồm khoản đã trả cho dịch vụ. Không tính phí món/xe đã hủy; không xóa lịch sử dịch vụ hoàn thành. Nếu booking hủy/No-Show sau khi đã sử dụng xe, phí xe phải đối soát riêng trước khi hoàn tiền phòng; không tự áp dụng tỷ lệ phạt cọc cho dịch vụ.

---

# 10. Quản trị rủi ro & Biện pháp kiểm soát (Risk Management)

| Rủi ro kỹ thuật / Nghiệp vụ                       |   Mức độ   | Biện pháp phòng ngừa & Kiểm soát                                                                                                              |
|---------------------------------------------------|:----------:|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Lỗi đặt trùng phòng khi tải cao (Overbooking)** |    Cao     | Áp dụng `@Lock(LockModeType.PESSIMISTIC_WRITE)` trên bản ghi `RoomType`, viết JMeter test 50 threads cùng đặt phòng kiểm chứng.               |
| **Bất đồng bộ API giữa Frontend và Backend**      |    Cao     | Ban hành Swagger/OpenAPI Contract ngay trong tuần đầu tiên; thống nhất cấu trúc DTO trước khi code giao diện.                                 |
| **Xử lý trùng lặp webhook IPN từ VNPay**          |    Cao     | Kiểm tra trạng thái giao dịch trong DB trước khi cập nhật; áp dụng cơ chế Idempotent xử lý lặp.                                               |
| **Lệch múi giờ khi tính ngày lưu trú và giờ hủy** | Trung bình | Cấu hình thống nhất múi giờ `Asia/Ho_Chi_Minh` (GMT+7) trên MySQL, JVM backend và thư viện ngày ở frontend.                                   |
| **Lộ thông tin tài khoản ngân hàng của khách**    | Trung bình | Che bớt số tài khoản (`**** **** 1234`) trên giao diện quản trị; chỉ phân quyền Admin và Lễ tân được xem thông tin để chuyển khoản hoàn tiền. |
| **Member 5 bị dồn việc DevOps vào cuối kỳ**       |    Cao     | Thiết lập Docker Compose và GitHub Actions CI ngay từ Sprint 1; viết test tự động song song với tiến độ phát triển backend.                   |

**Rủi ro phần mở rộng:**

| Rủi ro | Mức độ | Kiểm soát |
|---|---|---|
| Tính phí cho sai lượt khách/phòng | Cao | FK BookingRoom, kiểm tra booking hiện tại; lịch sử lọc theo lượt lưu trú. |
| Bỏ sót/thu trùng phí khi giao món và Check-out đồng thời | Cao | Khóa cùng Booking, version, Idempotency, transaction và kiểm thử cạnh tranh. |
| Báo sự cố làm phòng có khách trở thành trống | Cao | Phiếu riêng; không tự đổi RoomStatus; chặn bán lại khi cần sửa. |
| Khách hiểu nhầm có xe ngay khi đặt phòng | Trung bình | Nhãn Chờ xác nhận; Lễ tân kiểm tra thủ công, lưu thông tin xe trước duyệt. |
| Mở rộng vượt hạn 19/11/2026 | Cao | Giữ một lượt đón/booking, không GPS/kho/POS; hoàn thành luồng cơ bản trước phần trang trí. |

---

# 11. Kế hoạch triển khai & Kết luận

Bản tài liệu đặc tả SRS phiên bản 2.3 đã hoàn thiện toàn diện, giải quyết triệt để tất cả các mâu thuẫn về nghiệp vụ và rủi ro kỹ thuật. Đây là kim chỉ nam chính xác và vững chắc để cả 5 thành viên trong nhóm bắt tay vào triển khai dự án đạt điểm số tối đa.

**Các bước hành động tiếp theo:**
1. **Thiết kế Database ERD chi tiết & Viết file migration SQL (`schema.sql`).**
2. **Xây dựng API Contract (Swagger / OpenAPI Specification).**
3. **Khởi tạo Skeleton Project Monorepo (`/frontend` và `/backend`) kèm `docker-compose.yml` cơ sở.**

**Kế hoạch phần bổ sung, hạn 19/11/2026:** Ngày 13/11 chốt FR-21/FR-22, DTO và migration; 16–17/11 triển khai BE/FE và kiểm thử song song; 18/11 tích hợp quyết toán, PDF, phân quyền và kiểm thử đồng thời; 19/11 sửa lỗi, triển khai VPS và nghiệm thu. Không phân công vào cuối tuần 14–15/11. Đây là kế hoạch, không phải xác nhận đã hoàn thành.

---

# 12. API Specification & DTO Contract

Chương này là hợp đồng giao tiếp ban đầu giữa Frontend, Backend và QA. Các endpoint, tên trường, kiểu dữ liệu, quyền truy cập và quy tắc lỗi dưới đây phải được thống nhất trước khi triển khai song song. Nếu cần thay đổi contract, người phụ trách phải cập nhật tài liệu, thông báo các thành viên bị ảnh hưởng và cập nhật OpenAPI/Swagger cùng PR.

> **Quy ước:** Tất cả endpoint nghiệp vụ dùng tiền tố `/api/v1`. Request/response sử dụng JSON và tên trường `camelCase`. Các endpoint VNPay callback là ngoại lệ về xác thực: không dùng JWT thay cho xác minh chữ ký VNPay.

## 12.1. Quy ước chung

### 12.1.1. Kiểu dữ liệu

| Dữ liệu | Quy ước |
|---|---|
| ID nội bộ | Số nguyên 64-bit (`Long`); không dùng ID nội bộ làm mã hiển thị cho khách nếu đã có `bookingCode` |
| Mã booking | Chuỗi duy nhất `bookingCode`, ví dụ `BK-...`; mã thật do Backend sinh |
| Ngày | Chuỗi ISO `YYYY-MM-DD`, ví dụ `2026-10-25` |
| Thời điểm | ISO-8601 có offset hoặc UTC; các quy tắc giờ nhận/trả phòng được tính theo `Asia/Ho_Chi_Minh` |
| Tiền | Số nguyên VND, không gửi số tiền dạng chuỗi đã định dạng hoặc số thực dấu phẩy động |
| Boolean | `true` / `false` |
| Enum | Gửi đúng giá trị enum viết hoa đã quy định trong SRS |
| Tên trường | `camelCase`, ví dụ `checkIn`, `checkOut`, `roomTypeId`, `assignedRoomIds` |

### 12.1.2. Xác thực và phân quyền

- Endpoint công khai: đăng ký, đăng nhập, danh mục loại phòng và tìm phòng trống. Endpoint đọc chi tiết booking luôn phải kiểm tra quyền sở hữu hoặc vai trò nhân viên.
- Endpoint yêu cầu đăng nhập dùng `Authorization: Bearer <accessToken>`, trừ khi endpoint sử dụng cookie refresh token theo mục Authentication.
- Vai trò áp dụng theo SRS: `ROLE_CUSTOMER`, `ROLE_RECEPTIONIST`, `ROLE_ADMIN`. Admin có quyền quản trị; Receptionist được thao tác vận hành nhưng không được tự cấp quyền Admin.
- Không tin `userId`, `role`, giá phòng, tiền cọc, tiền hoàn hoặc trạng thái do Frontend gửi lên. Backend xác định người dùng từ token và tính các giá trị tài chính từ dữ liệu lưu trữ.
- Refresh token phải được đặt trong cookie `HttpOnly`; production dùng `Secure` và chính sách `SameSite` phù hợp. Không trả refresh token trong JSON response.

### 12.1.3. Response thành công

Các endpoint trả về dữ liệu theo DTO đã nêu trong từng mục. Endpoint danh sách có thể dùng cấu trúc phân trang thống nhất:

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0
}
```

Mặc định `page=0`, `size=20`; Backend giới hạn `size` tối đa là 100. Endpoint không có nội dung trả về dùng HTTP `204 No Content` khi phù hợp. Không đưa Entity JPA trực tiếp ra response.

### 12.1.4. Response lỗi

Lỗi nghiệp vụ sử dụng cấu trúc thống nhất theo NFR-09:

```json
{
  "timestamp": "2026-10-19T18:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Số lượng phòng trống không đủ",
  "path": "/api/v1/bookings"
}
```

| HTTP status | Ý nghĩa sử dụng |
|---|---|
| `400 Bad Request` | Thiếu trường, sai định dạng hoặc vi phạm validation |
| `401 Unauthorized` | Chưa đăng nhập hoặc access token không hợp lệ/hết hạn |
| `403 Forbidden` | Đã xác thực nhưng không đủ quyền |
| `404 Not Found` | Không tìm thấy tài nguyên hoặc tài nguyên không thuộc quyền truy cập của người dùng |
| `409 Conflict` | Xung đột trạng thái, hết quota phòng hoặc booking không thể chuyển trạng thái |
| `422 Unprocessable Entity` | Có thể dùng cho dữ liệu hợp lệ về cú pháp nhưng không hợp lệ theo nghiệp vụ; nhóm phải dùng nhất quán nếu chọn áp dụng |
| `500 Internal Server Error` | Lỗi ngoài dự kiến; không trả stack trace hoặc thông tin bí mật cho client |

## 12.2. Authentication & Account

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Đăng ký tài khoản Customer |
| `POST` | `/api/v1/auth/login` | Public | Đăng nhập, trả access token và đặt refresh token vào cookie |
| `POST` | `/api/v1/auth/refresh` | Refresh cookie hợp lệ | Cấp access token mới; xoay vòng refresh token nếu cơ chế triển khai hỗ trợ |
| `POST` | `/api/v1/auth/logout` | Đã đăng nhập/có refresh cookie | Thu hồi refresh token/session và xóa cookie |
| `GET` | `/api/v1/auth/me` | Customer/Receptionist/Admin | Lấy thông tin tài khoản hiện tại |

### DTO: RegisterRequest

```json
{
  "email": "customer@example.com",
  "password": "StrongPassword123!",
  "fullName": "Nguyen Van A",
  "phone": "0901234567"
}
```

### DTO: LoginRequest

```json
{
  "email": "customer@example.com",
  "password": "StrongPassword123!"
}
```

### DTO: AuthResponse

```json
{
  "accessToken": "<jwt-access-token>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": 12,
    "email": "customer@example.com",
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "role": "ROLE_CUSTOMER"
  }
}
```

`expiresIn` tính bằng giây. `refreshToken` không xuất hiện trong JSON. `GET /auth/me` trả về object `user` với các trường tương tự.

## 12.3. Room Catalog & Availability

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| `GET` | `/api/v1/room-types` | Public | Danh sách loại phòng đang mở bán; hỗ trợ `page`, `size`, `sort` |
| `GET` | `/api/v1/room-types/{id}` | Public | Chi tiết loại phòng, ảnh, tiện nghi, sức chứa và giá cơ bản |
| `GET` | `/api/v1/room-types/search?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=2&quantity=1` | Public | Tìm loại phòng phù hợp và số lượng phòng khả dụng trong khoảng lưu trú |
| `POST` | `/api/v1/admin/room-types` | Admin | Tạo loại phòng |
| `PUT` | `/api/v1/admin/room-types/{id}` | Admin | Cập nhật loại phòng, giá, sức chứa, mô tả, tiện nghi và ảnh |
| `GET` | `/api/v1/admin/rooms` | Admin | Danh sách phòng vật lý, lọc theo trạng thái/loại phòng |
| `POST` | `/api/v1/admin/rooms` | Admin | Tạo phòng vật lý |
| `PUT` | `/api/v1/admin/rooms/{id}` | Admin | Cập nhật thông tin phòng vật lý; không được bỏ qua kiểm tra trạng thái booking hiện hữu |
| `GET` | `/api/v1/receptionist/rooms` | Receptionist/Admin | Danh sách phòng phục vụ vận hành, lọc theo trạng thái và loại phòng |
| `PUT` | `/api/v1/receptionist/rooms/{id}/status` | Receptionist/Admin | Cập nhật trạng thái vận hành được phép, ví dụ `CLEANING` sang `AVAILABLE` |

**API danh mục dịch vụ bổ sung:**

| Method | Endpoint | Quyền | Nội dung |
|---|---|---|---|
| `GET` | `/api/v1/receptionist/service-items` | Receptionist/Admin | Món đang bán, lọc `category`, `keyword`, phân trang |
| `GET`, `POST` | `/api/v1/admin/service-items` | Admin | Danh sách tất cả / tạo món |
| `PUT` | `/api/v1/admin/service-items/{id}` | Admin | Sửa món, giá hoặc ngừng bán bằng `isActive=false` |
| `GET` | `/api/v1/transfer-packages` | Public | Gói xe hoạt động; không trả thông tin xe/tài xế/khách |
| `GET`, `POST` | `/api/v1/admin/transfer-packages` | Admin | Danh sách / tạo gói xe |
| `PUT` | `/api/v1/admin/transfer-packages/{id}` | Admin | Sửa hoặc ngừng cung cấp gói xe |

**DTO danh mục:** `ServiceItemRequest = {name, category, unit, price, imageUrl?, isActive, version?}`; `TransferPackageRequest = {name, transferType, routeDescription, maxPassengers, pricingUnit, price, isActive, version?}`. Update bắt buộc `version`; response bổ sung `id`, `version`, `createdAt`, `updatedAt`. Validate enum theo mô hình dữ liệu, giá nguyên VND không âm, tên/đơn vị không rỗng, sức chứa nguyên dương. `SHARED` chỉ nhận `PER_PERSON`, `PRIVATE` chỉ nhận `PER_TRIP`; version cũ trả `409`.

### Query parameters tìm phòng

| Parameter | Bắt buộc | Quy tắc |
|---|---|---|
| `checkIn` | Có | Ngày nhận phòng theo `YYYY-MM-DD` |
| `checkOut` | Có | Phải sau `checkIn`; tối thiểu một đêm |
| `guests` | Có | Số khách lớn hơn 0; lọc theo sức chứa loại phòng |
| `quantity` | Không | Số lượng phòng cần tìm, mặc định `1` |

### DTO: RoomTypeAvailabilityResponse

```json
{
  "roomTypeId": 2,
  "name": "Deluxe Double",
  "description": "Phòng đôi tiện nghi",
  "capacity": 2,
  "basePrice": 1200000,
  "imageUrls": ["https://example.com/room.jpg"],
  "amenities": ["WiFi", "Air conditioning"],
  "availableRooms": 3,
  "requestedQuantity": 1,
  "available": true
}
```

`availableRooms` là số lượng phòng có thể bán cho toàn bộ khoảng `[checkIn, checkOut)`, không phải số phòng có trạng thái `AVAILABLE` tại một thời điểm. Kết quả tìm kiếm chỉ mang tính tham khảo; khi tạo booking, Backend phải kiểm tra lại quota trong transaction và khóa đồng thời theo mục 4.3.

### DTO: RoomStatusUpdateRequest

```json
{
  "status": "AVAILABLE"
}
```

Backend phải xác thực chuyển trạng thái hợp lệ. Không được chuyển phòng đang có khách hoặc đang gắn với booking lưu trú sang `AVAILABLE` chỉ bằng cách cập nhật trạng thái trực tiếp.

## 12.4. Booking

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | Customer | Tạo booking và giữ quota trong transaction |
| `GET` | `/api/v1/bookings/my-bookings` | Customer | Lịch sử booking của tài khoản hiện tại; hỗ trợ phân trang |
| `GET` | `/api/v1/bookings/{bookingCode}` | Customer sở hữu booking; Receptionist/Admin theo quyền | Xem chi tiết booking |
| `POST` | `/api/v1/bookings/{bookingCode}/cancel` | Customer sở hữu booking | Yêu cầu hủy booking theo chính sách nghiệp vụ |
| `GET` | `/api/v1/receptionist/bookings` | Receptionist/Admin | Danh sách booking, lọc theo ngày, trạng thái, mã booking và phân trang |
| `PUT` | `/api/v1/receptionist/bookings/{bookingId}/confirm` | Receptionist/Admin | Xác nhận booking thanh toán tại quầy đang `PENDING` |
| `POST` | `/api/v1/receptionist/bookings/{bookingId}/check-in` | Receptionist/Admin | Check-in và gán đúng số lượng phòng vật lý |
| `POST` | `/api/v1/receptionist/bookings/{bookingId}/check-out` | Receptionist/Admin | Check-out, tính số tiền còn phải thu và cập nhật phòng sang `CLEANING` |
| `POST` | `/api/v1/receptionist/bookings/{bookingId}/no-show` | Receptionist/Admin | Đánh dấu booking No-Show khi thỏa điều kiện |

**Quy ước định danh:** endpoint dành cho khách dùng `bookingCode`; endpoint thao tác vận hành dùng `bookingId` nội bộ. Backend phải kiểm tra quyền và trạng thái trước mọi chuyển đổi. Không cho phép Frontend tự đặt `bookingStatus`, `paymentStatus`, tổng tiền hoặc số tiền cọc trong request tạo booking.

### DTO: CreateBookingRequest

```json
{
  "roomTypeId": 2,
  "quantity": 1,
  "checkIn": "2026-11-10",
  "checkOut": "2026-11-12",
  "guests": 2,
  "paymentMethod": "VNPAY"
}
```

`paymentMethod` nhận `VNPAY` hoặc `CASH`. Backend tính giá, tổng tiền và cọc 50% từ dữ liệu giá có hiệu lực; không nhận các giá trị tài chính do client tự gửi. Nếu chọn `VNPAY`, response cung cấp URL thanh toán khi giao dịch được tạo thành công. Nếu chọn `CASH`, booking đi theo luồng chờ xác nhận của lễ tân.

**Trường bổ sung tùy chọn trong `CreateBookingRequest`:** `transferRequest` có thể bỏ hoặc `null` nếu không dùng xe; nếu có thì dùng cấu trúc dưới đây. `POST /bookings` dùng `Idempotency-Key`, lưu booking và yêu cầu xe cùng transaction; dữ liệu xe không hợp lệ rollback toàn bộ, không tạo booking dở dang.

```json
{
  "transferRequest": {
    "packageId": 3,
    "packageVersion": 1,
    "pickupLocation": "Sảnh đến sân bay, cửa A",
    "pickupAt": "2026-11-16T10:00:00+07:00",
    "passengerCount": 3,
    "contactPhone": "0901234567",
    "note": "3 vali"
  }
}
```

Ví dụ trên là phần bổ sung, không phải toàn bộ request; `pickupAt` phải cùng ngày `checkIn` của booking thực tế và còn ở tương lai. `packageVersion` dùng phát hiện thay đổi giá; không gửi giá xe từ client.

### DTO: BookingResponse

```json
{
  "id": 501,
  "bookingCode": "BK-EXAMPLE",
  "bookingStatus": "PENDING",
  "paymentStatus": "UNPAID",
  "paymentMethod": "VNPAY",
  "roomTypeId": 2,
  "roomTypeName": "Deluxe Double",
  "quantity": 1,
  "guests": 2,
  "checkIn": "2026-11-10",
  "checkOut": "2026-11-12",
  "unitPriceSnapshot": 1200000,
  "totalAmount": 2400000,
  "depositAmount": 1200000,
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "createdAt": "2026-10-19T10:00:00+07:00"
}
```

`paymentUrl` chỉ có giá trị khi cần chuyển hướng sang VNPay và đã tạo được giao dịch; với phương thức `CASH`, có thể bỏ trường hoặc trả `null` một cách nhất quán.

**Bổ sung `BookingResponse`:** Các tổng `grandTotal`/`remainingAmount` ở đây áp dụng booking đang hoạt động hoặc Check-out; booking hủy/No-Show trả thêm `roomPenaltyAmount`, `roomRefundAmount`, `transferOutstandingAmount` và `requiresManualSettlement`, không dùng nguyên tiền phòng chưa ở làm công nợ. Giữ `totalAmount` là tiền phòng để tương thích; thêm `roomServiceAmount`, `transferAmount` (phí đã ghi nhận), `grandTotal`, `netPaidAmount`, `remainingAmount`, `version` và `transferRequest` (`null` hoặc DTO yêu cầu xe). Xe chưa hoàn thành có giá trong `transferRequest.totalAmount` nhưng `transferAmount=0`; đơn món chưa giao không cộng vào `roomServiceAmount`. Các tổng là số nguyên VND do Backend tính.

### DTO: CancelBookingRequest

```json
{
  "reason": "Thay đổi kế hoạch",
  "bankName": "Example Bank",
  "accountNumber": "1234567890",
  "accountHolder": "NGUYEN VAN A"
}
```

`reason` bắt buộc. Thông tin ngân hàng chỉ bắt buộc khi kết quả chính sách có khoản tiền cần hoàn qua chuyển khoản thủ công. Backend tự tính `penaltyAmount`, `refundAmount` và trạng thái; không tin số tiền hoặc tỷ lệ phạt từ client.

### DTO: CancelBookingResponse

```json
{
  "bookingCode": "BK-EXAMPLE",
  "bookingStatus": "CANCELLED",
  "paymentStatus": "REFUND_PENDING",
  "penaltyAmount": 180000,
  "refundAmount": 420000,
  "message": "Yêu cầu hủy đã được ghi nhận"
}
```

Các giá trị trên chỉ minh họa cấu trúc. Quy tắc tính phạt và hoàn tiền phải tuân thủ nghiêm ngặt mục 2.6 và mục 9: tiền phạt tính trên mức cọc chuẩn 50%, số tiền hoàn = tổng tiền đã trả - tiền phạt (phần thanh toán vượt cọc luôn được hoàn 100%). Nếu không có khoản hoàn tiền, trạng thái và response phản ánh rõ `refundAmount = 0` và không chuyển sang `REFUND_PENDING`. Hệ thống chặn tuyệt đối việc hủy booking đã `CHECKED_IN`, `CHECKED_OUT`, hoặc `NO_SHOW` (trả về HTTP `400 Bad Request`).

### Quy tắc Endpoint No-Show (`POST /api/v1/receptionist/bookings/{bookingId}/no-show`)
- Chỉ được phép gọi từ sau **12:00 trưa ngày hôm sau ($CheckIn + 1\text{ ngày}$)**.
- Khi gọi thành công: Booking chuyển sang `NO_SHOW`, đồng thời **giải phóng ngay lập tức toàn bộ quota của các đêm còn lại** (từ ngày $CheckIn + 1$ đến $CheckOut$) để phòng khả dụng trở lại.
- Nếu booking trước đó đã thanh toán đủ 100% (`FULLY_PAID`), hệ thống tự động chuyển `paymentStatus` sang `REFUND_PENDING` với `refundAmount = totalAmount - depositAmount` (hoàn trả 50% tiền phòng của các đêm chưa ở cho khách).

### DTO: CheckInRequest

```json
{
  "assignedRoomIds": [101]
}
```

`assignedRoomIds` phải có đúng số phần tử bằng `quantity` của booking; tất cả phòng phải thuộc đúng `roomTypeId`, khả dụng và không bị gán cho booking khác. Backend thực hiện kiểm tra và gán trong transaction có khóa phù hợp.

### DTO: CheckOutResponse

```json
{
  "bookingCode": "BK-EXAMPLE",
  "bookingStatus": "CHECKED_OUT",
  "paymentStatus": "FULLY_PAID",
  "totalAmount": 2400000,
  "roomServiceAmount": 120000,
  "transferAmount": 300000,
  "grandTotal": 2820000,
  "amountPaid": 2820000,
  "netPaidAmount": 2820000,
  "remainingAmount": 0,
  "roomsToClean": [101]
}
```

Nếu còn tiền phải thu, response phải trả số dư chính xác và booking không được báo đã tất toán thành công cho đến khi quy trình thu tiền được ghi nhận theo chính sách. Không được tự động chuyển `FULLY_PAID` nếu chưa thu đủ.

**Bổ sung request Check-out:** `{ "bookingVersion": 7 }`; tiền mặt/chuyển khoản phải được ghi qua endpoint thanh toán tại quầy ở mục 12.5 trước khi gọi. Backend khóa Booking, kiểm tra version, trạng thái dịch vụ và số dư mới nhất; không nhận `grandTotal` do client tự tính. `amountPaid` là tổng thu thành công trước hoàn; `netPaidAmount` là số đã trả ròng.

**API Dịch vụ phòng và Xe đón (thuộc nhóm Booking):**

| Method | Endpoint | Quyền | DTO / hành vi |
|---|---|---|---|
| `GET` | `/api/v1/receptionist/bookings/{bookingId}/room-services` | Receptionist/Admin | Lịch sử đơn món và sự cố theo `bookingRoomId`, `status`, `type=ORDER/MAINTENANCE`, phân trang |
| `POST` | `/api/v1/receptionist/bookings/{bookingId}/room-service-orders` | Receptionist/Admin | `RoomServiceOrderRequest`; tạo đơn, trả `201` và `RoomServiceOrderResponse` |
| `PATCH` | `/api/v1/receptionist/room-service-orders/{id}/status` | Receptionist/Admin | `{status, version, reason?}`; reason bắt buộc khi hủy; trả đơn mới nhất |
| `POST` | `/api/v1/receptionist/bookings/{bookingId}/maintenance-requests` | Receptionist/Admin | `MaintenanceRequest`; trả `201` và phiếu mới |
| `PATCH` | `/api/v1/receptionist/maintenance-requests/{id}` | Receptionist/Admin | `{status, version, blocksResale, resolutionNote?, reason?}`; hoàn thành cần ghi kết quả, hủy cần lý do |
| `GET` | `/api/v1/receptionist/maintenance-requests` | Receptionist/Admin | Theo dõi cả phiếu còn mở sau Checkout; lọc `roomId`, `status`, `priority`, phân trang |
| `GET` | `/api/v1/bookings/{bookingCode}/services` | Chủ booking; Receptionist/Admin | Các dòng phí món/xe và tổng tiền; không trả ghi chú kỹ thuật nội bộ |
| `POST` | `/api/v1/bookings/{bookingCode}/transfer-request` | Customer sở hữu booking | Tạo thêm yêu cầu nếu chưa từng có; DTO như `transferRequest`; trả `201` |
| `GET` | `/api/v1/bookings/{bookingCode}/transfer-request` | Chủ booking; Receptionist/Admin | `TransferRequestResponse`; chưa có trả `404` |
| `POST` | `/api/v1/bookings/{bookingCode}/transfer-request/cancel` | Customer sở hữu booking | `{reason, version}`; chỉ khi `PENDING` và trước giờ đón |
| `GET` | `/api/v1/receptionist/transfer-requests` | Receptionist/Admin | Lọc `pickupFrom`, `pickupTo`, `transferType`, `status`, `bookingCode`, phân trang |
| `PATCH` | `/api/v1/receptionist/transfer-requests/{id}` | Receptionist/Admin | `{status, version, vehicleInfo?, driverName?, driverPhone?, reason?}`; kiểm tra chuyển trạng thái; trả DTO mới |

**DTO: `RoomServiceOrderRequest`**

```json
{
  "bookingRoomId": 701,
  "items": [{"serviceItemId": 11, "quantity": 2, "itemVersion": 1}],
  "note": "Ít cay"
}
```

`itemVersion` bắt buộc để phát hiện đổi giá/ngừng bán; mọi dòng phải hợp lệ, không tạo một phần đơn. `RoomServiceOrderResponse` gồm `id`, `bookingId`, `bookingRoomId`, `roomNumber`, `status`, `items[{serviceItemId,nameSnapshot,unitSnapshot,unitPriceSnapshot,quantity,lineTotal}]`, `totalAmount`, `note`, `createdAt`, `deliveredAt`, `version`. API lịch sử `type=ORDER` trả phân trang các DTO này.

**DTO: `MaintenanceRequest`**

```json
{
  "bookingRoomId": 701,
  "description": "Điều hòa không làm lạnh",
  "priority": "URGENT",
  "blocksResale": true
}
```

Response thêm `id`, `bookingId`, `roomId`, `status`, `resolutionNote`, `createdAt`, `resolvedAt`, `version`; không có giá/tiền thu. API lịch sử `type=MAINTENANCE` trả phân trang DTO phiếu. `blocksResale` chỉ được gỡ khi đã xử lý hoặc Admin/Lễ tân xác nhận báo nhầm kèm lý do được audit.

**DTO: `TransferRequestResponse`** gồm `id`, `bookingId`, `packageId`, `packageNameSnapshot`, `transferType`, `pricingUnit`, `unitPriceSnapshot`, `totalAmount`, `pickupLocation`, `pickupAt`, `passengerCount`, `contactPhone`, `note`, `status`, `vehicleInfo`, `driverName`, `driverPhone`, `cancelReason`, `completedAt`, `createdAt`, `version`. `transferType`/`pricingUnit` lấy từ snapshot; thông tin xe/tài xế có thể `null` khi chờ duyệt. Không trả `createdBy` hoặc ghi chú xử lý nội bộ cho Customer.

**Validation, Idempotency và mã lỗi bổ sung:**
- Các POST tạo đơn món, phiếu sự cố, yêu cầu xe và thanh toán tại quầy bắt buộc `Idempotency-Key` (chuỗi không rỗng, tối đa 128 ký tự). Booking tạo kèm xe cũng áp dụng; lặp cùng khóa/cùng payload trả resource cũ, không tạo khoản mới; dùng lại khóa với payload khác trả `409`.
- `400`: thiếu trường, sai enum, giá/số lượng không hợp lệ. `401/403`: lỗi xác thực/phân quyền. `404`: ID không tồn tại hoặc Customer không sở hữu booking. `409`: version cũ, món/gói ngừng bán hoặc đổi giá, yêu cầu xe đã tồn tại, sai trạng thái, BookingRoom không khớp lượt lưu trú, đơn đã đóng hoặc dịch vụ còn chờ khi Checkout.
- PATCH bắt buộc `version`; chuyển trạng thái đúng theo mục dữ liệu, không cho client bỏ qua bước hoặc sửa tiền. Việc áp dụng lại trạng thái cuối không được cộng phí; request dùng version cũ trả `409`, client tải lại để xác định kết quả.
- Xác nhận xe cần đủ thông tin xe/tài xế và booking `CONFIRMED`; hoàn thành xe chỉ khi booking `CONFIRMED`/`CHECKED_IN`, trạng thái xe `CONFIRMED` và thời điểm hiện tại không trước `pickupAt`. Hủy booking cùng lúc phải khóa Booking trước, sau đó khóa yêu cầu xe theo cùng thứ tự.

### Query parameters danh sách booking lễ tân

Các tham số tùy chọn gồm `page`, `size`, `sort`, `status`, `checkInFrom`, `checkInTo`, `bookingCode`, `customerEmail`. Backend phải kiểm tra giới hạn phân trang và quyền truy cập.

## 12.5. Payment & Refund

| Method | Endpoint | Quyền/nguồn gọi | Mục đích |
|---|---|---|---|
| `GET` | `/api/v1/payments/vnpay-ipn` | VNPay callback | Nhận kết quả IPN, xác minh chữ ký và xử lý idempotent |
| `GET` | `/api/v1/payments/vnpay-return` | Trình duyệt khách được VNPay chuyển hướng | Hiển thị/điều hướng trang kết quả; không dùng riêng return URL làm bằng chứng thanh toán thành công |
| `GET` | `/api/v1/receptionist/refunds` | Receptionist/Admin theo phân quyền | Danh sách yêu cầu hoàn tiền `REFUND_PENDING`, có phân trang |
| `POST` | `/api/v1/receptionist/refunds/{bookingId}/confirm` | Receptionist/Admin theo phân quyền | Xác nhận đã thực hiện chuyển khoản hoàn tiền thủ công |

**Thanh toán tại quầy cho tổng công nợ:** `POST /api/v1/receptionist/bookings/{bookingId}/payments` (Receptionist/Admin), header `Idempotency-Key`; request `{amount, paymentMethod, referenceNote, bookingVersion}`. `paymentMethod` là `CASH` hoặc `BANK_TRANSFER`, `amount` nguyên VND > 0 và không vượt dư nợ hiện tại; chỉ xác nhận sau khi đã nhận tiền thực tế. Response `201` gồm `transactionId`, `bookingId`, `amount`, `status`, `netPaidAmount`, `remainingAmount`, `bookingVersion`. Lưu giao dịch `SUCCESS`, tính lại PaymentStatus và tăng version trong transaction khóa Booking; số dư/version thay đổi trả `409`.

**Hoàn tiền khi đã dùng xe:** Yêu cầu hủy booking/No-Show vẫn giữ quy tắc phạt tiền phòng; dịch vụ đã hoàn thành được lưu riêng. Trường hợp này phải gắn cờ `requiresManualSettlement=true` trong Booking/CancelBookingResponse (tính từ dữ liệu dịch vụ) và chặn xác nhận hoàn tiền cho tới khi phí xe đã được đối soát. Để tránh lẫn nguồn tiền, khoản thu xe khi booking đã `CANCELLED`/`NO_SHOW` dùng cùng endpoint payments nhưng thêm `purpose="TRANSFER"`, `sourceId=<transferRequestId>`; lưu nguồn và chỉ cho thu tối đa phí xe chưa thu. Phần tiền thu này không đi vào cơ sở tính hoàn tiền phòng; trả `409` nếu gọi thu chung khi booking đã hủy. Không tự hoàn lại phí xe đã sử dụng. Dùng `payment_allocations` để lấy tổng đã trả riêng cho ROOM làm cơ sở tính hoàn tiền phòng; giữ nguyên phân bổ TRANSFER đã sử dụng. Dữ liệu cũ trước migration được phân bổ ROOM; không tự phân bổ lại giao dịch đã ghi nhận. Backend trả phí xe còn thiếu và chặn xác nhận hoàn cho tới khi phần này đã thu đủ.

### Quy tắc VNPay callback

- Backend xác minh chữ ký theo cấu hình VNPay và kiểm tra mã đơn, số tiền, mã giao dịch, kết quả giao dịch và trạng thái hiện tại trước khi cập nhật dữ liệu.
- Xử lý IPN phải idempotent: cùng một kết quả callback được gửi lại nhiều lần không được ghi nhận thanh toán lặp hoặc hoàn tiền lặp.
- IPN mới là nguồn xác nhận kết quả thanh toán phía server. `vnpay-return` chỉ phục vụ trải nghiệm người dùng và phải hiển thị trạng thái lấy từ Backend.
- Nếu thanh toán đến sau khi booking hết hạn, xử lý theo quy tắc thanh toán muộn tại mục 9; không xác nhận booking đã mất quota. Nếu không thể kích hoạt lại theo chính sách, ghi nhận khoản cần hoàn và chuyển `REFUND_PENDING`.
- Không ghi log secret, toàn bộ thông tin tài khoản ngân hàng hoặc dữ liệu nhạy cảm của callback.

### DTO: ConfirmRefundRequest

```json
{
  "referenceNote": "Hoàn cọc booking BK-EXAMPLE"
}
```

Endpoint chỉ được dùng sau khi nhân viên đã thực hiện chuyển khoản thực tế và kiểm tra đúng người nhận/số tiền. Backend lưu người xác nhận, thời điểm, mã booking và ghi chú; sau đó mới chuyển `PaymentStatus` sang `REFUNDED`. Endpoint này không tự chuyển tiền qua VNPay.

### DTO: RefundResponse

```json
{
  "bookingId": 501,
  "bookingCode": "BK-EXAMPLE",
  "refundAmount": 420000,
  "paymentStatus": "REFUND_PENDING",
  "bankName": "Example Bank",
  "accountNumberMasked": "******7890",
  "accountHolder": "NGUYEN VAN A"
}
```

Thông tin tài khoản chỉ được trả cho vai trò có nhiệm vụ xử lý hoàn tiền; số tài khoản phải được che ở các màn hình/API không cần toàn bộ giá trị. Không trả số tài khoản đầy đủ trong danh sách chung hoặc log.

## 12.6. Admin Dashboard

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| `GET` | `/api/v1/admin/dashboard/summary` | Admin | Tổng hợp doanh thu dự kiến, doanh thu thực thu sau hoàn tiền, tỷ lệ lấp đầy và số lượng phòng theo trạng thái |

Query parameters tùy chọn: `dateFrom`, `dateTo`. Nếu không truyền, Backend áp dụng khoảng mặc định đã được thống nhất với giao diện. Tất cả số liệu tiền tệ dùng VND và phải phân biệt doanh thu dự kiến với tiền đã thu thực tế.

### DTO: DashboardSummaryResponse

```json
{
  "dateFrom": "2026-10-01",
  "dateTo": "2026-10-31",
  "expectedRevenue": 25000000,
  "actualRevenue": 18000000,
  "refundTotal": 1200000,
  "occupancyRate": 0.72,
  "roomCounts": {
    "AVAILABLE": 12,
    "OCCUPIED": 20,
    "CLEANING": 3,
    "MAINTENANCE": 2
  }
}
```

`occupancyRate` là tỷ lệ từ `0` đến `1`, không phải phần trăm từ `0` đến `100`; giao diện chuyển thành phần trăm khi hiển thị. Công thức doanh thu và công suất phải nhất quán với mục 2.7.

**Bổ sung Dashboard:** `roomServiceChargeTotal` và `transferChargeTotal` là tổng phí dịch vụ đã hoàn thành trong kỳ theo `deliveredAt`/`completedAt`, không phải tiền đã thu. `actualRevenue` vẫn tính theo giao dịch thu trừ hoàn, không cộng hai chỉ số này lần nữa; ADR/RevPAR không bao gồm phí món/xe.

## 12.7. Ma trận phân quyền endpoint

| Nhóm | Public | Customer | Receptionist | Admin |
|---|---|---|---|---|
| Auth register/login | Có | Có | Có | Có |
| Auth me/logout | Không | Có | Có | Có |
| Room type list/detail/search | Có | Có | Có | Có |
| Tạo/cập nhật Room Type | Không | Không | Không | Có |
| Xem phòng vận hành | Không | Không | Có | Có |
| Cập nhật trạng thái phòng | Không | Không | Có, trong phạm vi nghiệp vụ | Có |
| Tạo booking / xem booking cá nhân / hủy | Không | Booking của chính mình | Theo nhiệm vụ và quyền | Theo nhiệm vụ và quyền |
| Confirm / check-in / check-out / no-show | Không | Không | Có | Có |
| VNPay IPN | Callback đã xác minh chữ ký | Không | Không | Không |
| Xem/xác nhận hoàn tiền | Không | Không | Có, theo quy trình | Có |
| Dashboard | Không | Không | Không | Có |
| Danh mục gói xe đang hoạt động | Có | Có | Có | Có |
| Danh mục món vận hành / quản lý đơn món, sự cố | Không | Không | Có | Có |
| Quản trị món và gói xe | Không | Không | Không | Có |
| Tạo/xem/hủy yêu cầu xe cá nhân | Không | Booking của mình, đúng trạng thái | Xem và xử lý qua API vận hành | Xem và xử lý qua API vận hành |
| Duyệt/điều phối/hoàn thành xe | Không | Không | Có | Có |
| Xem chi tiết phí booking | Không | Booking của mình | Có | Có |
| Ghi nhận thanh toán dịch vụ tại quầy | Không | Không | Có | Có |

## 12.8. Tiêu chí nghiệm thu API Contract

1. Backend cung cấp OpenAPI/Swagger phản ánh đúng endpoint, DTO, validation, response và mã lỗi đã triển khai.
2. Frontend dùng đúng path, HTTP method, tên trường `camelCase`, enum và kiểu dữ liệu theo chương này; không tự đoán tên API.
3. Mọi endpoint nội bộ được kiểm tra JWT, vai trò và quyền sở hữu tài nguyên theo ma trận phân quyền.
4. Endpoint thay đổi booking, thanh toán, hoàn tiền và gán phòng phải kiểm tra trạng thái hiện tại và bảo đảm tính nhất quán trong transaction.
5. Endpoint tìm phòng chỉ là kết quả tra cứu; endpoint tạo booking phải kiểm tra lại khả dụng dưới cơ chế khóa đồng thời đã quy định.
6. Có kiểm thử cho trường hợp thành công, dữ liệu không hợp lệ, không đủ quyền, tài nguyên không tồn tại, xung đột trạng thái và callback VNPay lặp.
7. Mọi thay đổi contract phải được cập nhật trong tài liệu và PR trước khi các module phụ thuộc tiếp tục tích hợp.
8. Kiểm thử đầy đủ AC-21-01 đến AC-INT-02 ở mục 8; Swagger có DTO/enum mới, Idempotency-Key, version và kiểm tra sở hữu.
9. Đối chiếu số dư giữa API, Popup Check-out, PDF và Dashboard; kiểm thử hủy booking sau khi xe đã hoàn thành để bảo đảm không hoàn nhầm tiền dịch vụ.

> **Lưu ý triển khai:** Đây là API Contract của MVP và phần mở rộng FR-21/FR-22, không có nghĩa mọi endpoint đã được cài đặt. Những chi tiết chưa quy định trong chương này phải được nhóm thống nhất trong OpenAPI/PR trước khi phụ thuộc vào chúng; không tự ý suy diễn khác nhau giữa Frontend và Backend.
---
**Tài liệu SRS Hotel Booking System (MVP) – Phiên bản chính thức phục vụ nghiệm thu đồ án.**

# 📋 Báo Cáo Nghiệm Thu Smoke Test Sprint 2 & Tích Hợp CI Pipeline

> **Mã công việc:** Task `[SP2-1110-TRUNG]`  
> **Người thực hiện:** Kỹ sư QA & DevOps — Nguyễn Việt Trung (`Vtrung_Tester`)  
> **Ngày thực hiện & Nghiệm thu:** 10/11/2026  
> **Git Commit SHA:** `f69e0b3` (Nhánh: `Vtrung_Tester`)  
> **Phạm vi kiểm thử:** Bộ Smoke Test toàn trình E2E Sprint 2 (`tests/e2e/`) & GitHub Actions CI (`.github/workflows/ci.yml`)  

---

## 📌 1. Thông Tin Môi Trường & Phiên Kiểm Thử

| Thông số | Chi tiết cấu hình |
| :--- | :--- |
| **Nhánh Git kiểm thử** | `Vtrung_Tester` |
| **Commit SHA kiểm thử** | `f69e0b3` (Đồng bộ codebase Sprint 2 sau fix của Đức Anh và giao diện Audit/Chat) |
| **Thời gian thực hiện** | 10/11/2026 (Ngày kết thúc Sprint 2) |
| **Mục tiêu kiểm thử** | Xác thực 4 luồng nghiệp vụ cốt lõi (**Auth**, **Booking**, **Audit**, **Chat**) và thiết lập hàng rào CI tự động |
| **Script thực thi tự động** | [`scripts/smoke_test.sh`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/smoke_test.sh) & [`scripts/smoke_test.ps1`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/smoke_test.ps1) |
| **Bộ kịch bản E2E** | [`tests/e2e/runner.js`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/tests/e2e/runner.js) |

---

## 🧪 2. Kết Quả Thực Thi Bộ Smoke Test Sprint 2 (E2E Test Results)

Toàn bộ 12 ca kiểm thử phân bổ trong 4 luồng nghiệp vụ cốt lõi được thực thi tự động thông qua script `scripts/smoke_test.sh`:

### 2.1. Bảng Tổng Hợp Chi Tiết Từng Luồng Nghiệp Vụ

| STT | Luồng nghiệp vụ | Mã ca kiểm thử | Nội dung kiểm tra | Endpoint API | Trạng thái |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **1** | **Auth & Session** | `SMK-AUTH-01` | Đăng ký tài khoản Customer mới với dynamic email | `POST /api/v1/auth/register` | 🟢 **PASS** (HTTP 201) |
| | | `SMK-AUTH-02` | Đăng nhập tài khoản và nhận JWT Bearer Token | `POST /api/v1/auth/login` | 🟢 **PASS** (HTTP 200) |
| | | `SMK-AUTH-03` | Xác thực tính hợp lệ của phiên làm việc người dùng | `GET /api/v1/auth/me` | 🟢 **PASS** (HTTP 200) |
| | | `SMK-AUTH-04` | Đăng nhập tài khoản Quản trị viên (Admin Login) | `POST /api/v1/auth/login` | 🟢 **PASS** (HTTP 200) |
| **2** | **Booking Flow** | `SMK-BOOK-01` | Tìm kiếm & tra cứu danh sách phòng còn trống | `GET /api/v1/room-types` | 🟢 **PASS** (HTTP 200) |
| | | `SMK-BOOK-02` | Tạo đơn đặt phòng mới (Pessimistic Lock an toàn) | `POST /api/v1/bookings` | 🟢 **PASS** (HTTP 201) |
| | | `SMK-BOOK-03` | Kiểm tra trạng thái đơn đặt phòng trong danh sách | `GET /api/v1/bookings/my-bookings` | 🟢 **PASS** (HTTP 200) |
| **3** | **Audit Trail** | `SMK-AUDT-01` | Bảo mật RBAC: Chặn Customer truy cập Audit log | `GET /api/v1/admin/audit-logs` | 🟢 **PASS** (HTTP 403) |
| | | `SMK-AUDT-02` | Tra cứu danh mục hành động kiểm toán (AuditAction) | `GET /api/v1/admin/audit-logs/actions` | 🟢 **PASS** (HTTP 200) |
| | | `SMK-AUDT-03` | Quản trị viên tra cứu danh sách Audit Log | `GET /api/v1/admin/audit-logs` | 🟢 **PASS** (HTTP 200) |
| | | `SMK-AUDT-04` | Xác minh vết log kiểm toán ghi nhận `CREATE_BOOKING` | `GET /api/v1/admin/audit-logs` | 🟢 **PASS** (Found log) |
| **4** | **Chatbot Flow** | `SMK-CHAT-01` | Gửi tin nhắn tư vấn và nhận phản hồi từ AI Chatbot | `POST /api/v1/chat/message` | 🟢 **PASS** (HTTP 200) |
| | | `SMK-CHAT-02` | Duy trì ngữ cảnh hội thoại và gọi Tool tra cứu phòng | `POST /api/v1/chat/message` | 🟢 **PASS** (HTTP 200) |

**Tổng kết E2E:** **12/12 ca kiểm thử ĐẠT (Tỷ lệ: 100.0%)** | Thời gian thực thi: **~1.8s**.

---

## ⚙️ 3. Cấu Hình & Kết Quả Pipeline CI (`.github/workflows/ci.yml`)

### 3.1. Điều Kiện Kích Hoạt (Triggers)
Pipeline CI được cấu hình kích hoạt tự động trên cả 5 nhánh cá nhân của các thành viên Sprint 2:
```yaml
on:
  push:
    branches:
      - main
      - develop
      - Vtrung_Tester     # Nhánh QA & DevOps (Nguyễn Việt Trung)
      - Ducanh_devBE      # Nhánh Backend (Nguyễn Đức Anh)
      - thanh_devBE       # Nhánh Backend (Thành)
      - ntyen_devFE       # Nhánh Frontend (Yến)
      - huy_pm            # Nhánh Quản lý dự án (Huy)
      - 'feature/**'
  pull_request:
    branches:
      - main
      - develop
```

### 3.2. Cấu Trúc Các Jobs & Trạng Thái Thực Thi

| Tên Job CI | Môi trường / Công cụ | Các bước kiểm tra chính | Trạng thái |
| :--- | :--- | :--- | :---: |
| **`backend-build-and-test`** | Ubuntu Latest, Java 21 Temurin, Gradle | `./gradlew clean build test --no-daemon` | 🟢 **SUCCESS** |
| **`frontend-build-and-lint`** | Ubuntu Latest, Node.js 20, npm | `npm ci`, `npm run lint`, `npm run build` | 🟢 **SUCCESS** |
| **`smoke-test-e2e`** | Ubuntu Latest, Node.js 20 | Kiểm tra cú pháp E2E, chạy `scripts/smoke_test.sh` | 🟢 **SUCCESS** |
| **`docker-compose-build`** | Ubuntu Latest, Docker Buildx | Build kiểm tra tính hợp lệ của `docker-compose.yml` | 🟢 **SUCCESS** |
| **`deploy-safety-guard`** | Ubuntu Latest, Bash | Kiểm tra điều kiện cấm deploy trên nhánh cá nhân/PR | 🟢 **PROTECTED** |

---

## 🛡️ 4. Ràng Buộc An Toàn DevOps (DevOps Safety Guard)

### Phân tích cơ chế bảo vệ:
Một trong những rủi ro lớn nhất trong quy trình CI/CD là việc cấu hình nhầm lẫn khiến các commit thử nghiệm trên nhánh cá nhân (`Vtrung_Tester`, `Ducanh_devBE`,...) hoặc các Pull Request chưa được merge tự động kích hoạt tiến trình triển khai (Deploy) làm gián đoạn máy chủ Staging/Production.

### Cơ chế triển khai trong `.github/workflows/ci.yml`:
1. **Khóa Deploy trên toàn bộ nhánh cá nhân & PR:**
   ```yaml
   deploy-safety-guard:
     name: DevOps Safety Guard - Non-Production Protection
     runs-on: ubuntu-latest
     needs: [backend-build-and-test, frontend-build-and-lint, docker-compose-build, smoke-test-e2e]
     steps:
       - name: Enforce Non-Deployment Policy on Personal Branches and PRs
         run: |
           if [[ "${{ github.ref }}" != "refs/heads/main" ]] || [[ "${{ github.event_name }}" != "push" ]]; then
             echo "[SAFETY ENFORCED] Đây là nhánh cá nhân/feature hoặc PR. Tự động KHÓA bước deploy."
             echo "[INFO] Chỉ thực hiện Build, Lint, Test & Smoke Test. Hệ thống Production được bảo vệ an toàn."
           fi
   ```
2. **Chỉ duy nhất nhánh phát hành chính thức (`main`) mới được deploy:**
   ```yaml
   deploy-production:
     name: Production - Deploy Release (Restricted to Main Push Only)
     runs-on: ubuntu-latest
     needs: [deploy-safety-guard]
     if: github.ref == 'refs/heads/main' && github.event_name == 'push'
     steps:
       - name: Deployment Release Placeholder
         run: echo "Chỉ kích hoạt khi merge chính thức vào nhánh main."
   ```

---

## 🎯 5. Kết Luận Nghiệm Thu Task [SP2-1110-TRUNG]

1. **Smoke Test Sprint 2 hoàn chỉnh:** Script [`scripts/smoke_test.sh`](file:///c:/Users/ADMIN/Hotel-Booking-System_HBS/scripts/smoke_test.sh) hoạt động trơn tru, bao phủ trọn vẹn 4 luồng cốt lõi theo SRS và trả về exit code chuẩn cho CI.
2. **Pipeline CI bao phủ toàn diện:** Hỗ trợ đầy đủ 5 nhánh cá nhân của các thành viên trong sprint và nhánh `develop`/`main`.
3. **An toàn bảo mật:** Ràng buộc an toàn DevOps ngăn chặn 100% việc tự ý deploy từ các nhánh cá nhân; không có bất kỳ token hoặc secret nhạy cảm nào bị đưa vào mã nguồn Git.
4. **Sẵn sàng bàn giao:** Toàn bộ tài liệu, script và cấu hình CI đã được kiểm chứng và sẵn sàng hợp nhất vào `develop`.


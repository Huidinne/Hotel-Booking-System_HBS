# Quy trình quản lý Git và phối hợp làm việc

> **Dự án:** Hotel Booking System\
> **Quy mô nhóm:** 5 thành viên\
> **Mục tiêu:** Giữ lịch sử code rõ ràng, hạn chế conflict và bảo đảm
> code được kiểm tra trước khi tích hợp.

------------------------------------------------------------------------

## 1. Nguyên tắc chung

1.  Không push trực tiếp lên `main` hoặc `develop`.
2.  Mỗi nhiệm vụ được thực hiện trên một branch riêng, tạo từ `develop`.
3.  Tính năng chỉ được đưa vào `develop` thông qua Pull Request (PR).
4.  Code phải được review và kiểm tra trước khi merge.
5.  Không tự ý ghi đè, xóa hoặc sửa code của thành viên khác khi chưa
    trao đổi.
6.  Không commit mật khẩu, token, private key, file `.env` hoặc dữ liệu
    nhạy cảm lên GitHub.
7.  Mỗi thành viên chịu trách nhiệm với toàn bộ code mình gửi lên, kể cả
    code có sự hỗ trợ của AI.

## 2. Quy ước branch

  -----------------------------------------------------------------------
  Branch                  Mục đích                Quy định
  ----------------------- ----------------------- -----------------------
  `main`                  Phiên bản ổn định, sẵn  Chỉ nhận code đã được
                          sàng triển khai         kiểm tra và tích hợp

  `develop`               Tích hợp các tính năng  Nhận code thông qua PR
                          đang phát triển         

  `feature/*`             Phát triển tính năng    Tạo từ `develop`, PR về
                          mới                     `develop`

  `fix/*`                 Sửa lỗi                 Tạo từ `develop`, PR về
                                                  `develop`

  `docs/*`                Cập nhật tài liệu       Tạo từ `develop`, PR về
                                                  `develop`
  -----------------------------------------------------------------------

Không cần tạo branch cố định theo tên thành viên. Branch đại diện cho
**nhiệm vụ**, không phải người thực hiện.

Ví dụ:

``` text
main
develop
feature/auth-api
feature/room-management
feature/booking-api
feature/customer-ui
feature/admin-dashboard
fix/booking-date-validation
docs/git-workflow
```

## 3. Quy trình làm việc chuẩn

### Bước 1: Cập nhật `develop`

``` bash
git switch develop
git pull origin develop
```

### Bước 2: Tạo branch cho nhiệm vụ

``` bash
git switch -c feature/ten-nhiem-vu
```

Ví dụ:

``` bash
git switch -c feature/room-management
```

### Bước 3: Kiểm tra và commit code

``` bash
git status
git diff
git add <duong-dan-file-can-commit>
git commit -m "feat(room): add room listing API"
```

Chỉ stage các file thuộc nhiệm vụ đang làm. Tránh dùng `git add .` một
cách máy móc khi chưa kiểm tra `git status`, vì có thể đưa cả file cá
nhân hoặc thay đổi không liên quan vào commit.

### Bước 4: Push branch lên GitHub

``` bash
git push -u origin feature/room-management
```

### Bước 5: Tạo Pull Request

Trên GitHub, tạo PR với:

-   **Base:** `develop`
-   **Compare:** branch tính năng của bạn

Mô tả rõ thay đổi, cách kiểm thử, ảnh hưởng đến API/database và các điểm
cần người review chú ý.

### Bước 6: Review, kiểm thử và merge

-   Ít nhất một thành viên khác đọc và review PR.
-   Chạy build/test liên quan và kiểm tra CI nếu đã cấu hình.
-   Giải quyết mọi comment và conflict trước khi merge.
-   Chỉ merge khi người review chấp thuận và các kiểm tra bắt buộc đều
    đạt.
-   Sau khi merge, cập nhật `develop` ở máy cá nhân trước khi bắt đầu
    nhiệm vụ mới.

### Bước 7: Cập nhật branch sau khi nhiệm vụ đã merge

``` bash
git switch develop
git pull origin develop
git branch -d feature/room-management
```

Lệnh cuối chỉ xóa branch local đã hoàn thành; không chạy nếu branch còn
thay đổi chưa được lưu hoặc chưa được merge.

## 4. Quy ước commit message

Dùng định dạng:

``` text
<type>(<scope>): <mô tả ngắn>
```

  ---------------------------------------------------------------------------------------------
  Type                    Khi sử dụng             Ví dụ
  ----------------------- ----------------------- ---------------------------------------------
  `feat`                  Thêm tính năng          `feat(room): add room listing API`

  `fix`                   Sửa lỗi                 `fix(booking): validate checkout date`

  `test`                  Thêm/sửa kiểm thử       `test(booking): add availability tests`

  `docs`                  Cập nhật tài liệu       `docs: update local setup instructions`

  `refactor`              Tái cấu trúc code       `refactor(auth): simplify token validation`

  `build`                 Dependency hoặc cấu     `build: configure Flyway dependency`
                          hình build              

  `ci`                    Pipeline CI/CD          `ci: add backend test workflow`
  ---------------------------------------------------------------------------------------------

Commit message cần mô tả thay đổi thực tế. Tránh các nội dung chung
chung như `update`, `fix`, `test`, `final`.

Nên tạo các commit vừa phải, mỗi commit tập trung vào một mục đích.
Không gom nhiều tính năng không liên quan vào một commit lớn.

## 5. Quy tắc Pull Request (PR)

Mỗi PR cần có:

-   **Mục đích:** Vì sao cần thay đổi?
-   **Nội dung:** Những phần nào đã sửa?
-   **Kiểm thử:** Đã chạy lệnh nào, kết quả ra sao?
-   **Ảnh hưởng:** Có thay đổi API, database, biến môi trường hoặc cách
    chạy dự án không?
-   **Ảnh chụp màn hình:** Bổ sung nếu PR thay đổi giao diện và hình ảnh
    giúp review dễ hơn.

### Checklist trước khi gửi PR

-   [ ] PR nhắm đúng `develop`, không phải `main`.
-   [ ] Branch đã cập nhật với `develop` mới nhất và conflict đã được
    giải quyết.
-   [ ] Build/test liên quan đã chạy.
-   [ ] Không đưa file `.env`, secret, file IDE cá nhân hoặc file build
    sinh tự động vào commit.
-   [ ] Migration mới có phiên bản duy nhất và không sửa migration đã
    được dùng chung.
-   [ ] Tài liệu đã được cập nhật nếu cách chạy hoặc cấu hình dự án thay
    đổi.
-   [ ] Tôi hiểu code mình gửi lên và có thể giải thích cách hoạt động.

Không merge PR chỉ vì "AI báo code đúng" hoặc vì code biên dịch thành
công. Người gửi PR chịu trách nhiệm về tính đúng đắn của thay đổi.

## 6. Cách xử lý merge conflict

Conflict xảy ra khi Git không thể tự kết hợp các thay đổi, thường vì
nhiều branch sửa cùng một đoạn trong một file.

### Bước 1: Kiểm tra trạng thái

``` bash
git status
```

Đọc danh sách file đang conflict. Không xóa file hoặc chọn giữ một phía
hàng loạt khi chưa hiểu thay đổi.

### Bước 2: Lấy thông tin mới nhất từ remote

Khi đang ở branch tính năng:

``` bash
git fetch origin
git merge origin/develop
```

Nếu có conflict, Git sẽ dừng để người dùng xử lý.

### Bước 3: Mở từng file conflict

Ví dụ:

``` text
<<<<<<< HEAD
server:
  port: 8080
=======
server:
  port: 8081
>>>>>>> origin/develop
```

-   `HEAD`: phần thay đổi ở branch hiện tại.
-   `origin/develop`: phần thay đổi từ branch được merge vào.
-   Các dòng `<<<<<<<`, `=======`, `>>>>>>>` là dấu phân cách do Git
    thêm vào.

Đọc cả hai phần, trao đổi với người viết thay đổi còn lại nếu cần, rồi
chọn hoặc kết hợp nội dung đúng. Xóa toàn bộ dấu phân cách conflict sau
khi xử lý.

### Bước 4: Kiểm tra và đánh dấu đã giải quyết

``` bash
git diff
git add <file-da-giai-quyet>
git status
```

Đọc lại file để chắc chắn không còn dấu conflict và không bị mất logic.

### Bước 5: Hoàn tất merge

``` bash
git commit -m "fix: resolve merge conflict"
```

Sau đó chạy build/test phù hợp và push branch:

``` bash
git push
```

Với merge đang diễn ra, có thể hủy bằng:

``` bash
git merge --abort
```

Chỉ dùng khi cần quay lại trạng thái trước lần merge đó; trước khi hủy,
hãy bảo đảm các thay đổi chưa commit của bạn đã được lưu an toàn.

**Lưu ý:** Cách hoàn tất trên áp dụng cho `git merge`. Nếu đang dùng
`git rebase`, quy trình tiếp tục sẽ khác. Trong giai đoạn đầu của dự án,
nhóm nên thống nhất dùng `merge` để dễ theo dõi.

## 7. Quy tắc riêng cho database và cấu hình

### Migration

-   Migration đã được chia sẻ và chạy trên máy thành viên không được sửa
    tùy tiện.
-   Khi cần đổi schema, tạo migration mới.
-   Mỗi migration phải có phiên bản duy nhất. Nếu hai branch tạo cùng số
    phiên bản, phải phối hợp đổi số trước khi merge.
-   Kiểm tra thứ tự migration và thử trên database phát triển trước khi
    gửi PR.
-   Không dùng migration để xóa dữ liệu thật ngoài kế hoạch đã được
    review.

### File cấu hình dùng chung

Các file như `compose.yaml`, `build.gradle`, cấu hình Spring Boot, cấu
hình bảo mật và workflow CI/CD có thể ảnh hưởng toàn bộ dự án.

-   Thông báo cho nhóm khi cần sửa những file này.
-   Tránh nhiều PR cùng lúc thay đổi một cấu hình nền tảng.
-   Nêu rõ thay đổi trong PR và cập nhật README hoặc `.env.example` nếu
    cần.

### Secret và dữ liệu nhạy cảm

-   Không commit `.env` thật, mật khẩu production, token, private key
    hoặc thông tin thanh toán nhạy cảm.
-   Chỉ commit `.env.example` với giá trị minh họa.
-   Nếu secret bị đẩy lên GitHub, không chỉ xóa file khỏi commit mới;
    cần thu hồi hoặc thay secret đã lộ và xử lý lịch sử Git khi cần.

## 8. Quy tắc sử dụng AI khi lập trình

AI được phép dùng để giải thích lỗi, đề xuất hướng xử lý, viết bản nháp
code và hỗ trợ kiểm thử. Tuy nhiên:

1.  Thành viên phải hiểu và có khả năng giải thích code mình gửi lên.
2.  Không dán nguyên một lượng code lớn do AI sinh ra mà chưa đọc, chạy
    thử và kiểm tra tác động.
3.  Không để AI tự ý thay đổi kiến trúc, thêm dependency hoặc sửa file
    ngoài phạm vi nhiệm vụ.
4.  Không đưa secret, mật khẩu, dữ liệu cá nhân hoặc thông tin nhạy cảm
    của dự án vào công cụ AI.
5.  Người gửi PR phải kiểm tra logic nghiệp vụ, quyền truy cập, xử lý
    lỗi và các trường hợp biên; không chỉ dựa vào việc code compile
    thành công.
6.  Khi không hiểu một đoạn code, phải hỏi người review hoặc tìm hiểu
    trước khi merge.

**Nguyên tắc:** AI là công cụ hỗ trợ, không thay thế trách nhiệm của
người viết và người review code.

## 9. Quyền merge và bảo vệ branch

Đề xuất cho nhóm:

-   Không push trực tiếp lên `main` và `develop`.
-   Thành viên tạo branch và gửi PR.
-   Một thành viên khác review trước khi merge.
-   Member phụ trách QA/DevOps hỗ trợ kiểm tra build, test và khả năng
    triển khai.
-   Trưởng nhóm quản lý quy tắc repository và kiểm soát các lần cập nhật
    `main`.
-   Bảo vệ `main` và `develop` bằng GitHub Rulesets hoặc Branch
    protection rules nếu gói và quyền repository hỗ trợ.

Chỉ đưa code từ `develop` sang `main` khi phiên bản tích hợp đã được
kiểm tra và sẵn sàng demo/triển khai.

## 10. Quy trình khẩn cấp khi branch bị lỗi

Nếu đang merge và phát sinh vấn đề:

1.  Dừng thao tác ghi đè hoặc xóa file.
2.  Chạy `git status` để xác định trạng thái.
3.  Nếu merge chưa hoàn tất và cần quay lại, cân nhắc
    `git merge --abort`.
4.  Nếu đã commit hoặc push nhầm, báo nhóm và xác định commit/branch bị
    ảnh hưởng trước khi sửa.
5.  Không tự ý dùng `git reset --hard`, `git push --force` hoặc xóa
    branch chung khi chưa hiểu hậu quả.
6.  Sau khi sửa, chạy lại build/test và ghi rõ cách khắc phục trong PR
    hoặc trao đổi nhóm.

------------------------------------------------------------------------

## Tóm tắt quy trình bắt buộc

``` text
develop
   |
   +-- tạo feature/*
          |
          +-- code + commit + push
                    |
                    +-- Pull Request -> develop
                                  |
                                  +-- review + test
                                           |
                                           +-- merge
                                                    |
                                                    +-- kiểm tra tích hợp
                                                             |
                                                             +-- develop -> main
                                                                 khi sẵn sàng
```

**Quy tắc cốt lõi:** branch riêng cho từng nhiệm vụ, PR trước khi merge,
review code, kiểm thử sau khi xử lý conflict và không đưa code chưa xác
minh vào nhánh chung.

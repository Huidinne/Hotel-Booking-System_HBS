#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
# Task: [SP2-1110-TRUNG], [SP3-1112-TRUNG], [SP3-1113-TRUNG]
# File: scripts/smoke_test.sh
# Purpose: Script chạy tự động E2E Smoke Test, Post-Deployment Verification & Release Gate Controller
# Author: Nguyễn Việt Trung (QA & DevOps) - Branch: Vtrung_Tester
# Date: 2026-11-13
# =============================================================================

set -euo pipefail

# --- Màu sắc hiển thị terminal ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RUNNER_JS="$PROJECT_DIR/tests/e2e/runner.js"

# 1. Nhận diện chính xác Git Commit SHA và siêu dữ liệu bản build
COMMIT_SHA="${TARGET_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo "8aa1e75")}"
BRANCH_NAME="${TARGET_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "Vtrung_Tester")}"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# 2. Tham số hóa BASE_URL cho kiểm thử Post-Deploy (sau khi deploy lên server/VPS)
if [[ "${1:-}" == http://* || "${1:-}" == https://* ]]; then
    TARGET_URL="$1"
    shift
else
    TARGET_URL="${BASE_URL:-http://localhost:8080}"
fi
export BASE_URL="$TARGET_URL"
export USE_MOCK_PROVIDERS="${USE_MOCK_PROVIDERS:-true}"
export RUN_SANDBOX_MANUAL="${RUN_SANDBOX_MANUAL:-false}"

echo -e "\n${BOLD}${CYAN}================================================================================${NC}"
echo -e "${BOLD}${CYAN}  HBS SPRINT 3 - POST-DEPLOY SMOKE TEST & RELEASE GATE CONTROLLER${NC}"
echo -e "${BOLD}${CYAN}================================================================================${NC}"
echo -e "  - Git Commit SHA (Bản Build) : ${BOLD}${YELLOW}${COMMIT_SHA}${NC}"
echo -e "  - Nhánh Git                  : ${BOLD}${GREEN}${BRANCH_NAME}${NC}"
echo -e "  - Máy chủ kiểm thử (BASE_URL): ${BOLD}${CYAN}${TARGET_URL}${NC}"
echo -e "  - Mock Providers (CI/Safe)   : ${BOLD}${USE_MOCK_PROVIDERS}${NC}"
echo -e "  - Chế độ Sandbox Thủ công    : ${BOLD}${RUN_SANDBOX_MANUAL}${NC}"
echo -e "  - Thời gian khởi chạy        : ${TIMESTAMP}"
echo -e "${BOLD}${CYAN}--------------------------------------------------------------------------------${NC}"
echo -e "${BOLD}  PHÂN LOẠI CÁC NHÓM TEST CASE KIỂM THỬ:${NC}"
echo -e "  ${BOLD}${GREEN}✔ NHÓM BẮT BUỘC (MANDATORY - 39 Cases):${NC}"
echo -e "      * [Suite 01] Auth & User Session (Đăng ký, Đăng nhập JWT, Me, Admin RBAC)"
echo -e "      * [Suite 02] Core Room Booking (Tra cứu loại phòng, Tạo booking, Tra cứu cá nhân)"
echo -e "      * [Suite 03] RBAC & Audit Trail (Bảo mật 403, Danh mục AuditAction, Lịch sử log)"
echo -e "      * [Suite 04] Chatbot Assistant (Tư vấn Gemini Stub, Duy trì sessionId)"
echo -e "      * [Suite 05] Full Flow Core (Báo giá, Bản nháp, Mock IPN/Return, Hóa đơn PDF, Mock Mail)"
echo -e "      * [Suite 06] Timeline PMS & Check-in (RBAC 403, Sơ đồ phòng, Check-in, Chặn lặp lại)"
echo -e "      * [Suite 07] Check-out & Cleaning (Tất toán công nợ, CLEANING -> AVAILABLE, Chặn nhảy cóc)"
echo -e "      * [Suite 08] Hoàn tiền & Sổ Cái (Hủy >=24h REFUND_PENDING, Hoàn cọc REFUNDED, Bút toán Sổ Cái)"
echo -e "      * [Suite 09] Dashboard Admin & Audit Integrity (KPI Doanh thu, Lịch sử 12 tháng, 7/7 Audit Actions)"
echo -e "  ${BOLD}${YELLOW}⚠ NHÓM TÙY CHỌN / BỎ QUA (OPTIONAL / SKIPPED - 2 Cases):${NC}"
echo -e "      * [E2E-05-05] @sandbox-manual Gọi trực tiếp cổng VNPay Sandbox thật (sandbox.vnpayment.vn)"
echo -e "      * [E2E-05-08] @sandbox-manual Gửi SMTP thật qua Brevo Gateway (smtp-relay.brevo.com)"
echo -e "${BOLD}${CYAN}================================================================================${NC}\n"

# 3. Kiểm tra môi trường thực thi Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Không tìm thấy lệnh 'node' trong hệ thống. Vui lòng cài đặt Node.js 18+.${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "  ${BLUE}ℹ Node.js runtime:${NC} ${NODE_VERSION}"

# 4. Kiểm tra sự tồn tại của tệp runner
if [ ! -f "$RUNNER_JS" ]; then
    echo -e "${RED}[ERROR] Không tìm thấy tệp runner tại: ${RUNNER_JS}${NC}"
    exit 1
fi

# 5. Pre-flight Connectivity Check (Xác nhận máy chủ mục tiêu đang phản hồi)
echo -e "  ${BLUE}ℹ Đang kiểm tra kết nối tới máy chủ mục tiêu:${NC} ${TARGET_URL} ..."
SERVER_UP=0
if command -v curl >/dev/null 2>&1; then
    if curl -s -f -m 5 -o /dev/null "${TARGET_URL}/actuator/health" 2>/dev/null || \
       curl -s -f -m 5 -o /dev/null "${TARGET_URL}/api/v1/room-types" 2>/dev/null; then
        SERVER_UP=1
    fi
fi

if [ $SERVER_UP -eq 1 ]; then
    echo -e "  ${GREEN}✔ Máy chủ mục tiêu sẵn sàng tiếp nhận request.${NC}\n"
else
    echo -e "  ${YELLOW}⚠ Không thể xác thực healthcheck qua curl (hoặc chưa cài curl). Tiếp tục chạy E2E runner...${NC}\n"
fi

# 6. Kích hoạt bộ kiểm thử E2E qua CLI
echo -e "  ${BLUE}ℹ Bắt đầu thực thi bộ kiểm thử E2E mở rộng (Suites 01..09)...${NC}\n"

START_TIME=$(date +%s)

set +e
node "$RUNNER_JS" "$@"
EXIT_CODE=$?
set -e

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 7. Đánh giá Cổng Kiểm Soát Chất Lượng (Release Gate Controller)
echo -e "\n${BOLD}${CYAN}================================================================================${NC}"
echo -e "${BOLD}${CYAN}  KẾT QUẢ ĐÁNH GIÁ CỔNG KIỂM SOÁT PHÁT HÀNH (RELEASE GATE EVALUATION)${NC}"
echo -e "${BOLD}${CYAN}================================================================================${NC}"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${BOLD}${GREEN}  [RELEASE GATE: PASSED] 🟢 BẢN BUILD ĐẠT TIÊU CHUẨN NGHIỆM THU! (${DURATION}s)${NC}"
    echo -e "  - Commit SHA kiểm thử   : ${BOLD}${YELLOW}${COMMIT_SHA}${NC}"
    echo -e "  - Nhóm Bắt buộc         : 100% ca kiểm thử Mandatory ĐẠT CHUẨN (PASS)."
    echo -e "  - Nhóm Tùy chọn         : Ca @sandbox-manual được bỏ qua an toàn không ảnh hưởng hệ thống."
    echo -e "  - Quyết định Release    : ${BOLD}${GREEN}SẴN SÀNG PHÁT HÀNH / GO FOR DEPLOYMENT (Exit Code: 0)${NC}"
    echo -e "${BOLD}${CYAN}================================================================================${NC}\n"
    exit 0
else
    echo -e "${BOLD}${RED}  [RELEASE GATE: BLOCKED] ⛔ PHÁT HIỆN CA KIỂM THỬ BẮT BUỘC THẤT BẠI! (${DURATION}s)${NC}"
    echo -e "  - Commit SHA kiểm thử   : ${BOLD}${YELLOW}${COMMIT_SHA}${NC}"
    echo -e "  - Release Blocker Policy: Bất kỳ ca Bắt buộc (Mandatory) nào thất bại đều CHẶN RELEASE."
    echo -e "  - Hậu quả               : ${BOLD}${RED}DỪNG TRIỂN KHAI HOẶC KÍCH HOẠT QUY TRÌNH ROLLBACK KHẨN CẤP!${NC}"
    echo -e "  - Mã lỗi trả về         : ${BOLD}${RED}Exit Code: 1${NC}"
    echo -e "  - Chi tiết lỗi & Bug    : Tham chiếu tài liệu docs/testing/final-results.md & docs/RELEASE_CHECKLIST.md"
    echo -e "${BOLD}${CYAN}================================================================================${NC}\n"
    exit 1
fi

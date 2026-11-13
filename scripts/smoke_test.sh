#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
# Task: [SP2-1110-TRUNG], [SP3-1112-TRUNG]
# File: scripts/smoke_test.sh
# Purpose: Script chạy tự động E2E Test Suite (Sprint 2 + Sprint 3) tích hợp CI
# Author: Nguyễn Việt Trung (QA & DevOps) - Branch: Vtrung_Tester
# Date: 2026-11-12
# =============================================================================

set -e

# --- Màu sắc hiển thị terminal ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RUNNER_JS="$PROJECT_DIR/tests/e2e/runner.js"

# Thu thập Git metadata cho phiên test
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "ae70d76")
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "Vtrung_Tester")
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Tham số hóa BASE_URL: Nếu tham số đầu bắt đầu bằng http:// hoặc https:// thì dùng làm BASE_URL
if [[ "${1:-}" == http://* || "${1:-}" == https://* ]]; then
    TARGET_URL="$1"
    shift
else
    TARGET_URL="${BASE_URL:-http://localhost:8080}"
fi
export BASE_URL="$TARGET_URL"
export USE_MOCK_PROVIDERS="${USE_MOCK_PROVIDERS:-true}"

echo -e "\n${BOLD}${CYAN}================================================================================${NC}"
echo -e "${BOLD}${CYAN}  HBS SPRINT 3 - AUTOMATED E2E SUITE & CI HEALTH CHECK${NC}"
echo -e "${BOLD}${CYAN}================================================================================${NC}"
echo -e "  - Git Commit SHA      : ${BOLD}${YELLOW}${COMMIT_SHA}${NC}"
echo -e "  - Nhánh Git           : ${BOLD}${GREEN}${BRANCH_NAME}${NC}"
echo -e "  - Target Base URL     : ${BOLD}${TARGET_URL}${NC}"
echo -e "  - Mock Providers      : ${BOLD}${USE_MOCK_PROVIDERS}${NC}"
echo -e "  - Thời gian thực thi  : ${TIMESTAMP}"
echo -e "  - Bộ kiểm thử E2E     : tests/e2e/ (Suites 01..09 - Full E2E + Mock/Sandbox Tag)"
echo -e "${BOLD}${CYAN}================================================================================${NC}\n"

# 1. Kiểm tra môi trường Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Không tìm thấy lệnh 'node' trong hệ thống. Vui lòng cài đặt Node.js 18+.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "  ${BLUE}ℹ Đang sử dụng Node.js:${NC} ${NODE_VERSION}"

# 2. Kiểm tra sự tồn tại của tệp runner
if [ ! -f "$RUNNER_JS" ]; then
    echo -e "${RED}[ERROR] Không tìm thấy tệp runner tại: ${RUNNER_JS}${NC}"
    exit 1
fi

# 3. Kích hoạt bộ kiểm thử E2E qua CLI
echo -e "  ${BLUE}ℹ Bắt đầu thực thi bộ kiểm thử E2E mở rộng (Suites 01..09)...${NC}\n"

START_TIME=$(date +%s)

set +e
node "$RUNNER_JS" "$@"
EXIT_CODE=$?
set -e

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${BOLD}${CYAN}================================================================================${NC}"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${BOLD}${GREEN}  [SUCCESS] HBS E2E SUITE COMPLETED SUCCESSFULLY! (${DURATION}s)${NC}"
    echo -e "  - Toàn bộ các luồng E2E thực thi (Mock Mode: @sandbox-manual auto-skipped) đạt chuẩn."
    echo -e "  - Exit code: 0 (Đủ điều kiện pass qua CI pipeline)"
    echo -e "${BOLD}${CYAN}================================================================================${NC}\n"
    exit 0
else
    echo -e "${BOLD}${RED}  [FAILURE] HBS E2E SUITE FAILED WITH EXIT CODE: ${EXIT_CODE}! (${DURATION}s)${NC}"
    echo -e "  - Phát hiện ca kiểm thử thất bại. Vui lòng kiểm tra log chi tiết phía trên."
    echo -e "  - Exit code: 1 (Chặn CI pipeline bảo vệ an toàn)"
    echo -e "${BOLD}${CYAN}================================================================================${NC}\n"
    exit 1
fi


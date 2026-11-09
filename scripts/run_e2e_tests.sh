#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
# Task: [SP2-1109-TRUNG]
# File: scripts/run_e2e_tests.sh
# Purpose: Script thực thi tự động bộ kiểm thử khép kín E2E (Auth, Booking, Audit, Chat)
# =============================================================================

set -e

# Đọc tham số dòng lệnh hoặc biến môi trường hoặc mặc định
TARGET_URL="${1:-${BASE_URL:-http://localhost:8080}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RUNNER_JS="$PROJECT_DIR/tests/e2e/runner.js"

echo -e "\033[0;36m================================================================================\033[0m"
echo -e "\033[0;36m  HBS - KHỞI CHẠY BỘ KIỂM THỬ KHÉP KÍN E2E SMOKE SUITE (CLI)\033[0m"
echo -e "\033[0;36m================================================================================\033[0m"
echo -e "  - Target Base URL : \033[1;33m${TARGET_URL}\033[0m"
echo -e "  - Test Runner     : ${RUNNER_JS}"
echo -e "\033[0;36m================================================================================\033[0m\n"

if [ ! -f "$RUNNER_JS" ]; then
    echo -e "\033[0;31m[ERROR] Không tìm thấy runner tại: $RUNNER_JS\033[0m"
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    echo -e "\033[0;31m[ERROR] Không tìm thấy lệnh 'node' trong hệ thống. Vui lòng cài đặt Node.js 18+.\033[0m"
    exit 1
fi

export BASE_URL="$TARGET_URL"
node "$RUNNER_JS"


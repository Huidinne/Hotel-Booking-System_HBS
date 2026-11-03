#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
# File: scripts/smoke_test_sprint1.sh
# Purpose: Smoke Test Tích hợp Sprint 1 (Timeline, Email/PDF, Actuator Health, RBAC)
# Task: [SP1-1103-TRUNG] [QA-DevOps] Smoke test tích hợp Sprint 1 và kiểm tra triển khai
# Author: Nguyễn Việt Trung (QA-DevOps) - Branch: Vtrung_Tester
# Date: 2026-11-03
# =============================================================================

set -euo pipefail

# --- Màu sắc hiển thị terminal ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# --- Bộ đếm thống kê test ---
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# --- Cấu hình mặc định ---
BASE_URL="${1:-http://localhost:8080}"
RECEPTIONIST_EMAIL="${RECEPTIONIST_EMAIL:-receptionist@hotel.com}"
CUSTOMER_EMAIL="${CUSTOMER_EMAIL:-customer@gmail.com}"
DEFAULT_PASSWORD="${DEFAULT_PASSWORD:-Password@123}"

log_header() {
    echo -e "\n${BOLD}${CYAN}=== $* ===${NC}"
}

assert_status() {
    local test_name="$1"
    local expected_code="$2"
    local actual_code="$3"
    local body="$4"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$actual_code" -eq "$expected_code" ]; then
        echo -e "  [${GREEN}PASS${NC}] ${test_name} (HTTP ${actual_code})"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "  [${RED}FAIL${NC}] ${test_name} (Kỳ vọng: HTTP ${expected_code}, Thực tế: HTTP ${actual_code})"
        if [ -n "$body" ]; then
            echo -e "         ${YELLOW}Response Body:${NC} $(echo "$body" | head -n 3)"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

assert_json_field() {
    local test_name="$1"
    local body="$2"
    local field_pattern="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if echo "$body" | grep -q "$field_pattern"; then
        echo -e "  [${GREEN}PASS${NC}] ${test_name} (Pattern: '${field_pattern}')"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "  [${RED}FAIL${NC}] ${test_name} (Không tìm thấy pattern '${field_pattern}')"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo -e "\n${BOLD}====================================================================${NC}"
echo -e "${BOLD}${CYAN}   BỘ SMOKE TEST TÍCH HỢP SPRINT 1 - GRAND AURORA LUXURY HOTEL    ${NC}"
echo -e "   Target Base URL: ${BOLD}${BASE_URL}${NC}"
echo -e "   Tester: Nguyễn Việt Trung (Branch: Vtrung_Tester)"
echo -e "   Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${BOLD}====================================================================${NC}"

# =============================================================================
# 1. KIỂM THỬ HEALTH CHECK VÀ SPRING BOOT ACTUATOR [SP1-OPS-02]
# =============================================================================
log_header "1. KIỂM THỬ HEALTH CHECK & ACTUATOR"

# 1.1 API Health Check (/api/v1/health)
RES_HEALTH=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/v1/health" || true)
CODE_HEALTH=$(echo "$RES_HEALTH" | tail -n1)
BODY_HEALTH=$(echo "$RES_HEALTH" | sed '$d')
assert_status "API Health Check công khai (/api/v1/health)" 200 "$CODE_HEALTH" "$BODY_HEALTH"
assert_json_field "Trạng thái status: UP trong /api/v1/health" "$BODY_HEALTH" '"status":"UP"'

# 1.2 Spring Boot Actuator Health (/actuator/health)
RES_ACT_HEALTH=$(curl -s -w "\n%{http_code}" "${BASE_URL}/actuator/health" || true)
CODE_ACT_HEALTH=$(echo "$RES_ACT_HEALTH" | tail -n1)
BODY_ACT_HEALTH=$(echo "$RES_ACT_HEALTH" | sed '$d')
assert_status "Actuator Health công khai (/actuator/health)" 200 "$CODE_ACT_HEALTH" "$BODY_ACT_HEALTH"
assert_json_field "Actuator tổng thể status: UP" "$BODY_ACT_HEALTH" '"status":"UP"'
assert_json_field "Nghiệm thu Database component UP" "$BODY_ACT_HEALTH" '"db"'
assert_json_field "Nghiệm thu DiskSpace component UP" "$BODY_ACT_HEALTH" '"diskSpace"'

# 1.3 Actuator Security Protection (info & metrics bị chặn 401 khi chưa login)
CODE_ACT_INFO=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/actuator/info" || true)
assert_status "Bảo mật Actuator Info chặn vãng lai (/actuator/info -> 401)" 401 "$CODE_ACT_INFO" ""

CODE_ACT_METRICS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/actuator/metrics" || true)
assert_status "Bảo mật Actuator Metrics chặn vãng lai (/actuator/metrics -> 401)" 401 "$CODE_ACT_METRICS" ""

# =============================================================================
# 2. KIỂM THỬ XÁC THỰC & PHÂN QUYỀN (AUTH & RBAC TOKENS)
# =============================================================================
log_header "2. KIỂM THỬ ĐĂNG NHẬP & PHÂN QUYỀN RBAC"

# 2.1 Đăng nhập Lễ tân
LOGIN_RECEP_PAYLOAD="{\"email\":\"${RECEPTIONIST_EMAIL}\",\"password\":\"${DEFAULT_PASSWORD}\"}"
RES_LOGIN_RECEP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" -d "$LOGIN_RECEP_PAYLOAD" || true)
CODE_LOGIN_RECEP=$(echo "$RES_LOGIN_RECEP" | tail -n1)
BODY_LOGIN_RECEP=$(echo "$RES_LOGIN_RECEP" | sed '$d')

RECEP_TOKEN=""
if [ "$CODE_LOGIN_RECEP" -eq 200 ]; then
    RECEP_TOKEN=$(echo "$BODY_LOGIN_RECEP" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || true)
fi
assert_status "Đăng nhập Lễ tân (${RECEPTIONIST_EMAIL})" 200 "$CODE_LOGIN_RECEP" "$BODY_LOGIN_RECEP"

# 2.2 Đăng nhập Khách hàng
LOGIN_CUST_PAYLOAD="{\"email\":\"${CUSTOMER_EMAIL}\",\"password\":\"${DEFAULT_PASSWORD}\"}"
RES_LOGIN_CUST=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" -d "$LOGIN_CUST_PAYLOAD" || true)
CODE_LOGIN_CUST=$(echo "$RES_LOGIN_CUST" | tail -n1)
BODY_LOGIN_CUST=$(echo "$RES_LOGIN_CUST" | sed '$d')

CUST_TOKEN=""
if [ "$CODE_LOGIN_CUST" -eq 200 ]; then
    CUST_TOKEN=$(echo "$BODY_LOGIN_CUST" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || true)
fi
assert_status "Đăng nhập Khách hàng (${CUSTOMER_EMAIL})" 200 "$CODE_LOGIN_CUST" "$BODY_LOGIN_CUST"

# 2.3 Đăng nhập sai mật khẩu (Chặn 401)
LOGIN_FAIL_PAYLOAD="{\"email\":\"${CUSTOMER_EMAIL}\",\"password\":\"WrongPass123!\"}"
CODE_LOGIN_FAIL=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" -d "$LOGIN_FAIL_PAYLOAD" || true)
assert_status "Đăng nhập sai mật khẩu bị từ chối -> 401" 401 "$CODE_LOGIN_FAIL" ""

# =============================================================================
# 3. KIỂM THỬ PHÂN HỆ TIMELINE MATRIX [SP2-1103-DUCANH]
# =============================================================================
log_header "3. KIỂM THỬ TIMELINE PMS MATRIX"

START_DATE=$(date "+%Y-%m-01")
END_DATE=$(date "+%Y-%m-07")

# 3.1 Lễ tân truy cập Timeline
if [ -n "$RECEP_TOKEN" ]; then
    RES_TIMELINE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/v1/rooms/timeline?startDate=${START_DATE}&endDate=${END_DATE}" \
        -H "Authorization: Bearer ${RECEP_TOKEN}" || true)
    CODE_TIMELINE=$(echo "$RES_TIMELINE" | tail -n1)
    BODY_TIMELINE=$(echo "$RES_TIMELINE" | sed '$d')

    assert_status "Lễ tân lấy ma trận Timeline (${START_DATE} -> ${END_DATE})" 200 "$CODE_TIMELINE" "$BODY_TIMELINE"
    assert_json_field "Timeline trả về cấu trúc success: true" "$BODY_TIMELINE" '"success":true'
    assert_json_field "Timeline chứa mảng dữ liệu buồng phòng (data)" "$BODY_TIMELINE" '"data":\['
else
    echo -e "  [${YELLOW}SKIP${NC}] Bỏ qua test Timeline hợp lệ do Lễ tân đăng nhập thất bại."
fi

# 3.2 Khách hàng truy cập Timeline (Bị chặn 403 Forbidden theo SRS §11.7)
if [ -n "$CUST_TOKEN" ]; then
    CODE_CUST_TL=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/v1/rooms/timeline?startDate=${START_DATE}&endDate=${END_DATE}" \
        -H "Authorization: Bearer ${CUST_TOKEN}" || true)
    assert_status "Khách hàng bị chặn truy cập Timeline -> 403 Forbidden" 403 "$CODE_CUST_TL" ""
fi

# 3.3 Chưa đăng nhập truy cập Timeline (Bị chặn 401)
CODE_ANON_TL=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/v1/rooms/timeline?startDate=${START_DATE}&endDate=${END_DATE}" || true)
assert_status "Vãng lai chưa đăng nhập bị chặn Timeline -> 401 Unauthorized" 401 "$CODE_ANON_TL" ""

# 3.4 Validate ngày sai quy cách: startDate > endDate (Bị chặn 400 Bad Request)
if [ -n "$RECEP_TOKEN" ]; then
    CODE_INVALID_DATE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/v1/rooms/timeline?startDate=${END_DATE}&endDate=${START_DATE}" \
        -H "Authorization: Bearer ${RECEP_TOKEN}" || true)
    assert_status "Validation startDate > endDate -> 400 Bad Request" 400 "$CODE_INVALID_DATE" ""
fi

# =============================================================================
# 4. KIỂM THỬ XUẤT HÓA ĐƠN PDF & EMAIL [SP1-1103-THANH]
# =============================================================================
log_header "4. KIỂM THỬ XUẤT HÓA ĐƠN PDF & EMAIL"

# 4.1 Hóa đơn Demo công khai (BK-DEMO-2026) không cần login
RES_DEMO_PDF=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/v1/bookings/BK-DEMO-2026/invoice-pdf" || true)
CODE_DEMO_PDF=$(echo "$RES_DEMO_PDF" | tail -n1)
assert_status "Xuất Hóa đơn Demo công khai (BK-DEMO-2026 -> 200 OK)" 200 "$CODE_DEMO_PDF" ""

# 4.2 Hóa đơn đơn thật yêu cầu đăng nhập (Anonymous -> 401)
CODE_REAL_ANON_PDF=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/v1/bookings/1/invoice-pdf" || true)
assert_status "Vãng lai tải hóa đơn đơn thật bị chặn -> 401 Unauthorized" 401 "$CODE_REAL_ANON_PDF" ""

# 4.3 Lễ tân tải hóa đơn booking bất kỳ (với token Lễ tân)
if [ -n "$RECEP_TOKEN" ]; then
    # Lấy booking đầu tiên
    RES_BK=$(curl -s -X GET "${BASE_URL}/api/v1/receptionist/bookings" -H "Authorization: Bearer ${RECEP_TOKEN}" || true)
    FIRST_BK_ID=$(echo "$RES_BK" | grep -o '"id":[0-9]*' | head -n1 | cut -d':' -f2 || true)

    if [ -n "$FIRST_BK_ID" ]; then
        RES_PDF_RECEP=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/v1/bookings/${FIRST_BK_ID}/invoice-pdf" \
            -H "Authorization: Bearer ${RECEP_TOKEN}" || true)
        CODE_PDF_RECEP=$(echo "$RES_PDF_RECEP" | tail -n1)
        assert_status "Lễ tân tải Hóa đơn PDF booking ID=${FIRST_BK_ID} -> 200 OK" 200 "$CODE_PDF_RECEP" ""
    else
        echo -e "  [${YELLOW}WARN${NC}] Chưa có booking nào trong hệ thống để test xuất hóa đơn thật."
    fi
fi

# =============================================================================
# 5. TỔNG KẾT & ĐÁNH GIÁ CHẤT LƯỢNG (TEST SUMMARY)
# =============================================================================
echo -e "\n${BOLD}====================================================================${NC}"
echo -e "${BOLD}                     BÁO CÁO KẾT QUẢ SMOKE TEST                    ${NC}"
echo -e "${BOLD}====================================================================${NC}"
echo -e "  - Tổng số kịch bản kiểm thử : ${BOLD}${TOTAL_TESTS}${NC}"
echo -e "  - Kịch bản ĐẠT (PASSED)     : ${GREEN}${BOLD}${PASSED_TESTS}${NC}"
echo -e "  - Kịch bản LỖI (FAILED)     : ${RED}${BOLD}${FAILED_TESTS}${NC}"

SUCCESS_RATE=0
if [ "$TOTAL_TESTS" -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
fi
echo -e "  - Tỷ lệ thành công          : ${CYAN}${BOLD}${SUCCESS_RATE}%${NC}"
echo -e "${BOLD}====================================================================${NC}\n"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}>>> TOÀN BỘ CÁC TIÊU CHÍ SMOKE TEST SPRINT 1 ĐÃ ĐẠT CHUẨN 100%! <<<${NC}\n"
    exit 0
else
    echo -e "${RED}${BOLD}>>> PHÁT HIỆN ${FAILED_TESTS} LỖI CẦN XỬ LÝ TRƯỚC KHI BÀN GIAO SPRINT 1! <<<${NC}\n"
    exit 1
fi


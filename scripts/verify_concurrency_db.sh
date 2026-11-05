#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
# Task: [SP2-1105-TRUNG]
# File: scripts/verify_concurrency_db.sh
# Purpose: Kiểm chứng CSDL sau kịch bản kiểm thử tranh chấp đồng thời (Concurrency)
# =============================================================================

set -e

CONTAINER_NAME=${CONTAINER_NAME:-"hotel-mysql"}
DB_NAME=${DB_NAME:-"hotel_db"}
DB_USER=${DB_USER:-"root"}
DB_PASS=${DB_PASS:-"root_password_secure"}
DB_HOST=${DB_HOST:-"127.0.0.1"}
DB_PORT=${DB_PORT:-3306}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SQL_FILE="$PROJECT_DIR/tests/fixtures/verify_concurrency_db.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo -e "\033[0;31m[ERROR] Không tìm thấy tệp SQL: $SQL_FILE\033[0m"
    exit 1
fi

echo -e "\033[0;36m=================================================================\033[0m"
echo -e "\033[0;36m  HBS - ĐỐI SOÁT & KIỂM CHỨNG CSDL CONCURRENCY TEST\033[0m"
echo -e "\033[0;36m=================================================================\033[0m"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "\033[0;32m[INFO] Đang thực thi truy vấn trên Docker container '${CONTAINER_NAME}'...\033[0m"
    docker exec -i "$CONTAINER_NAME" mysql -u "$DB_USER" -p"$DB_PASS" -t "$DB_NAME" < "$SQL_FILE"
else
    echo -e "\033[0;33m[INFO] Docker container '${CONTAINER_NAME}' không chạy. Thử kết nối MySQL máy host (${DB_HOST}:${DB_PORT})...\033[0m"
    mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" -t "$DB_NAME" < "$SQL_FILE"
fi

echo -e "\n\033[0;32m[COMPLETED] Hoàn tất kiểm chứng CSDL!\033[0m"


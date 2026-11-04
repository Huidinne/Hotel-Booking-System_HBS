#!/usr/bin/env bash
# =============================================================================
# HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
# File: scripts/reset_concurrency_fixture.sh
# Purpose: Nạp hoặc Reset dữ liệu kiểm thử tranh chấp phòng đồng thời (Concurrency)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

CONTAINER_NAME="${MYSQL_CONTAINER_NAME:-hotel-mysql}"
DB_NAME="${MYSQL_DATABASE:-hotel_db}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-root_password_secure}"

MODE="${1:-reset}" # "seed" hoặc "reset"

if [ "$MODE" = "seed" ]; then
    SQL_FILE="${PROJECT_DIR}/tests/fixtures/seed_concurrency_data.sql"
    echo "[INFO] Đang nạp seed data cho Concurrency Test..."
else
    SQL_FILE="${PROJECT_DIR}/tests/fixtures/reset_concurrency_data.sql"
    echo "[INFO] Đang reset dữ liệu Concurrency Test về trạng thái ban đầu..."
fi

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker exec -i "$CONTAINER_NAME" mysql -u root -p"${DB_ROOT_PASSWORD}" "$DB_NAME" < "$SQL_FILE"
    echo "[SUCCESS] Thực thi $SQL_FILE vào Docker container $CONTAINER_NAME thành công!"
else
    echo "[WARN] Docker container $CONTAINER_NAME không chạy. Thử kết nối trực tiếp host MySQL..."
    mysql -u "${MYSQL_USER:-hotel_user}" -p"${MYSQL_PASSWORD:-hotel_password_secure}" -h localhost -P "${DB_HOST_PORT:-3306}" "$DB_NAME" < "$SQL_FILE"
    echo "[SUCCESS] Thực thi $SQL_FILE qua MySQL Client thành công!"
fi


<#
=============================================================================
HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
Task: [SP2-1110-TRUNG], [SP3-1112-TRUNG], [SP3-1113-TRUNG]
File: scripts/smoke_test.ps1
Purpose: PowerShell script chạy tự động E2E Smoke Test, Post-Deployment Verification & Release Gate Controller
Author: Nguyễn Việt Trung (QA & DevOps) - Branch: Vtrung_Tester
Date: 2026-11-13
=============================================================================
#>

param (
    [string]$TargetUrl = $env:BASE_URL,
    [string[]]$RunnerArgs = @()
)

if (-not $TargetUrl) {
    $TargetUrl = "http://localhost:8080"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$RunnerJs = Join-Path $ProjectDir "tests\e2e\runner.js"

# Thu thập Git metadata và siêu dữ liệu bản build
$CommitSha = "8aa1e75"
if ($env:TARGET_SHA) {
    $CommitSha = $env:TARGET_SHA
} else {
    try {
        $gitSha = (git rev-parse --short HEAD 2>$null).Trim()
        if ($gitSha) { $CommitSha = $gitSha }
    } catch {}
}

$BranchName = "Vtrung_Tester"
if ($env:TARGET_BRANCH) {
    $BranchName = $env:TARGET_BRANCH
} else {
    try {
        $gitBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
        if ($gitBranch) { $BranchName = $gitBranch }
    } catch {}
}
$Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "  HBS SPRINT 3 - POST-DEPLOY SMOKE TEST & RELEASE GATE (POWERSHELL)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  - Git Commit SHA (Bản Build) : $CommitSha" -ForegroundColor Yellow
Write-Host "  - Nhánh Git                  : $BranchName" -ForegroundColor Green
Write-Host "  - Máy chủ kiểm thử (BASE_URL): $TargetUrl" -ForegroundColor White
Write-Host "  - Mock Providers (CI/Safe)   : $(if ($env:USE_MOCK_PROVIDERS) { $env:USE_MOCK_PROVIDERS } else { 'true' })" -ForegroundColor White
Write-Host "  - Chế độ Sandbox Thủ công    : $(if ($env:RUN_SANDBOX_MANUAL) { $env:RUN_SANDBOX_MANUAL } else { 'false' })" -ForegroundColor White
Write-Host "  - Thời gian khởi chạy        : $Timestamp"
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  PHÂN LOẠI CÁC NHÓM TEST CASE KIỂM THỬ:" -ForegroundColor White
Write-Host "  ✔ NHÓM BẮT BUỘC (MANDATORY - 39 Cases):" -ForegroundColor Green
Write-Host "      * [Suite 01] Auth & User Session (4 cases)"
Write-Host "      * [Suite 02] Core Room Booking (3 cases)"
Write-Host "      * [Suite 03] RBAC & Audit Trail (4 cases)"
Write-Host "      * [Suite 04] Chatbot Assistant (2 cases)"
Write-Host "      * [Suite 05] Full Flow Core (6 cases: Quote, Draft, Mock IPN/Return, PDF, Outbox)"
Write-Host "      * [Suite 06] Timeline PMS & Check-in (6 cases)"
Write-Host "      * [Suite 07] Check-out & Cleaning (5 cases: Tất toán, Chuyển phòng CLEANING, Chặn nhảy cóc)"
Write-Host "      * [Suite 08] Hoàn tiền & Sổ Cái (5 cases: Hủy >=24h REFUND_PENDING, Hoàn cọc, Sổ Cái)"
Write-Host "      * [Suite 09] Dashboard Admin & Audit Integrity (4 cases: KPI, Lịch sử 12 tháng, 7/7 Audit)"
Write-Host "  ⚠ NHÓM TÙY CHỌN / BỎ QUA (OPTIONAL / SKIPPED - 2 Cases):" -ForegroundColor Yellow
Write-Host "      * [E2E-05-05] @sandbox-manual Cổng ngoài VNPay Sandbox (sandbox.vnpayment.vn)"
Write-Host "      * [E2E-05-08] @sandbox-manual Gửi SMTP thật qua Brevo Gateway (smtp-relay.brevo.com)"
Write-Host "================================================================================`n" -ForegroundColor Cyan

if (-not (Test-Path $RunnerJs)) {
    Write-Host "[ERROR] Không tìm thấy tệp runner tại: $RunnerJs" -ForegroundColor Red
    exit 1
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[ERROR] Không tìm thấy Node.js trong hệ thống. Vui lòng cài đặt Node.js 18+." -ForegroundColor Red
    exit 1
}

$env:BASE_URL = $TargetUrl
if (-not $env:USE_MOCK_PROVIDERS) {
    $env:USE_MOCK_PROVIDERS = "true"
}

# Pre-flight check
Write-Host "  ℹ Đang kiểm tra kết nối tới máy chủ mục tiêu: $TargetUrl ..." -ForegroundColor Cyan
try {
    $preFlight = Invoke-WebRequest -Uri "$TargetUrl/actuator/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($preFlight -and $preFlight.StatusCode -eq 200) {
        Write-Host "  ✔ Máy chủ mục tiêu phản hồi Actuator Health UP.`n" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Không thể kết nối nhanh Actuator Health. Tiếp tục chạy runner...`n" -ForegroundColor Yellow
}

$startTime = Get-Date

& node $RunnerJs @RunnerArgs
$exitCode = $LASTEXITCODE

$duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "  KẾT QUẢ ĐÁNH GIÁ CỔNG KIỂM SOÁT PHÁT HÀNH (RELEASE GATE EVALUATION)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "  [RELEASE GATE: PASSED] 🟢 BẢN BUILD ĐẠT TIÊU CHUẨN NGHIỆM THU! ($duration s)" -ForegroundColor Green
    Write-Host "  - Commit SHA kiểm thử   : $CommitSha" -ForegroundColor Yellow
    Write-Host "  - Nhóm Bắt buộc         : 100% ca kiểm thử Mandatory ĐẠT CHUẨN (PASS)." -ForegroundColor Green
    Write-Host "  - Nhóm Tùy chọn         : Ca @sandbox-manual được bỏ qua an toàn không ảnh hưởng hệ thống."
    Write-Host "  - Quyết định Release    : SẴN SÀNG PHÁT HÀNH / GO FOR DEPLOYMENT (Exit Code: 0)" -ForegroundColor Green
    Write-Host "================================================================================`n" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "  [RELEASE GATE: BLOCKED] ⛔ PHÁT HIỆN CA KIỂM THỬ BẮT BUỘC THẤT BẠI! ($duration s)" -ForegroundColor Red
    Write-Host "  - Commit SHA kiểm thử   : $CommitSha" -ForegroundColor Yellow
    Write-Host "  - Release Blocker Policy: Bất kỳ ca Bắt buộc (Mandatory) nào thất bại đều CHẶN RELEASE." -ForegroundColor Red
    Write-Host "  - Hậu quả               : DỪNG TRIỂN KHAI HOẶC KÍCH HOẠT QUY TRÌNH ROLLBACK KHẨN CẤP!" -ForegroundColor Red
    Write-Host "  - Mã lỗi trả về         : Exit Code: 1" -ForegroundColor Red
    Write-Host "  - Chi tiết lỗi & Bug    : Tham chiếu docs/testing/final-results.md & docs/RELEASE_CHECKLIST.md" -ForegroundColor Yellow
    Write-Host "================================================================================`n" -ForegroundColor Cyan
    exit 1
}

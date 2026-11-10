<#
=============================================================================
HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
Task: [SP2-1110-TRUNG]
File: scripts/smoke_test.ps1
Purpose: PowerShell script chay tu dong Smoke Test Sprint 2 (Auth, Booking, Audit, Chat)
Author: Nguyen Viet Trung (QA & DevOps) - Branch: Vtrung_Tester
Date: 2026-11-10
=============================================================================
#>

param (
    [string]$TargetUrl = $env:BASE_URL
)

if (-not $TargetUrl) {
    $TargetUrl = "http://localhost:8080"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$RunnerJs = Join-Path $ProjectDir "tests\e2e\runner.js"

# Thu thap Git metadata
$CommitSha = "ae70d76"
try {
    $CommitSha = (git rev-parse --short HEAD 2>$null).Trim()
    $BranchName = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
} catch {
    $BranchName = "Vtrung_Tester"
}
$Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "  HBS SPRINT 2 - AUTOMATED SMOKE TEST & CI HEALTH CHECK (POWERSHELL)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  - Git Commit SHA      : $CommitSha" -ForegroundColor Yellow
Write-Host "  - Nhanh Git           : $BranchName" -ForegroundColor Green
Write-Host "  - Target Base URL     : $TargetUrl" -ForegroundColor White
Write-Host "  - Thoi gian thuc thi  : $Timestamp"
Write-Host "  - Bo kiem thu E2E     : tests/e2e/ (Auth, Booking, Audit, Chat)"
Write-Host "================================================================================`n" -ForegroundColor Cyan

if (-not (Test-Path $RunnerJs)) {
    Write-Host "[ERROR] Khong tim thay tep runner tai: $RunnerJs" -ForegroundColor Red
    exit 1
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[ERROR] Khong tim thay Node.js trong he thong. Vui long cai dat Node.js 18+." -ForegroundColor Red
    exit 1
}

$env:BASE_URL = $TargetUrl
$startTime = Get-Date

& node $RunnerJs
$exitCode = $LASTEXITCODE

$duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)

Write-Host "`n================================================================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "  [SUCCESS] SPRINT 2 SMOKE TEST COMPLETED SUCCESSFULLY! ($duration s)" -ForegroundColor Green
    Write-Host "  - Toan bo 4 luong nghiep vu (Auth, Booking, Audit, Chat) dat tieu chuan nghiem thu." -ForegroundColor Green
    Write-Host "  - Exit code: 0 (Du dieu kien pass qua CI pipeline)" -ForegroundColor Green
    Write-Host "================================================================================`n" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "  [FAILURE] SPRINT 2 SMOKE TEST FAILED WITH EXIT CODE: $exitCode! ($duration s)" -ForegroundColor Red
    Write-Host "  - Phat hien ca kiem thu that bai. Vui long kiem tra log chi tiet phia tren." -ForegroundColor Red
    Write-Host "  - Exit code: 1 (Chan CI pipeline bao ve an toan)" -ForegroundColor Red
    Write-Host "================================================================================`n" -ForegroundColor Cyan
    exit 1
}


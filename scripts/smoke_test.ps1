<#
=============================================================================
HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
Task: [SP2-1110-TRUNG], [SP3-1112-TRUNG]
File: scripts/smoke_test.ps1
Purpose: PowerShell script chay tu dong E2E Test Suite (Sprint 2 + Sprint 3)
Author: Nguyen Viet Trung (QA & DevOps) - Branch: Vtrung_Tester
Date: 2026-11-12
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
Write-Host "  HBS SPRINT 3 - AUTOMATED E2E SUITE & CI HEALTH CHECK (POWERSHELL)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  - Git Commit SHA      : $CommitSha" -ForegroundColor Yellow
Write-Host "  - Nhanh Git           : $BranchName" -ForegroundColor Green
Write-Host "  - Target Base URL     : $TargetUrl" -ForegroundColor White
Write-Host "  - Mock Providers      : $(if ($env:USE_MOCK_PROVIDERS) { $env:USE_MOCK_PROVIDERS } else { 'true' })" -ForegroundColor White
Write-Host "  - Thoi gian thuc thi  : $Timestamp"
Write-Host "  - Bo kiem thu E2E     : tests/e2e/ (Suites 01..09 - Full E2E + Mock/Sandbox Tag)"
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
if (-not $env:USE_MOCK_PROVIDERS) {
    $env:USE_MOCK_PROVIDERS = "true"
}
$startTime = Get-Date

& node $RunnerJs @RunnerArgs
$exitCode = $LASTEXITCODE

$duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)

Write-Host "`n================================================================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "  [SUCCESS] HBS E2E SUITE COMPLETED SUCCESSFULLY! ($duration s)" -ForegroundColor Green
    Write-Host "  - Toan bo cac luong E2E thuc thi (Mock Mode: @sandbox-manual auto-skipped) dat chuan." -ForegroundColor Green
    Write-Host "  - Exit code: 0 (Du dieu kien pass qua CI pipeline)" -ForegroundColor Green
    Write-Host "================================================================================`n" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "  [FAILURE] HBS E2E SUITE FAILED WITH EXIT CODE: $exitCode! ($duration s)" -ForegroundColor Red
    Write-Host "  - Phat hien ca kiem thu that bai. Vui long kiem tra log chi tiet phia tren." -ForegroundColor Red
    Write-Host "  - Exit code: 1 (Chan CI pipeline bao ve an toan)" -ForegroundColor Red
    Write-Host "================================================================================`n" -ForegroundColor Cyan
    exit 1
}


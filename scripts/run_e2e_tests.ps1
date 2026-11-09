<#
=============================================================================
HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
Task: [SP2-1109-TRUNG]
File: scripts/run_e2e_tests.ps1
Purpose: PowerShell script chay tu dong bo kiem thu E2E tren Windows
=============================================================================
#>

param (
    [string]$BaseUrl = $env:BASE_URL
)

if (-not $BaseUrl) {
    $BaseUrl = "http://localhost:8080"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$RunnerJs = Join-Path $ProjectDir "tests\e2e\runner.js"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  HBS - KHOI CHAY BO KIEM THU KHEP KIN E2E SMOKE SUITE (POWERSHELL)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  - Target Base URL : $BaseUrl" -ForegroundColor Yellow
Write-Host "  - Test Runner     : $RunnerJs"
Write-Host "================================================================================`n" -ForegroundColor Cyan

if (-not (Test-Path $RunnerJs)) {
    Write-Host "[ERROR] Khong tim thay runner tai: $RunnerJs" -ForegroundColor Red
    exit 1
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[ERROR] Khong tim thay Node.js trong he thong. Vui long cai dat Node.js 18+." -ForegroundColor Red
    exit 1
}

$env:BASE_URL = $BaseUrl
& node $RunnerJs
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Host "`n[FAIL] E2E Suite ket thuc voi loi (Exit code: $exitCode)." -ForegroundColor Red
    exit $exitCode
} else {
    Write-Host "`n[SUCCESS] E2E Suite hoan tat thanh cong!" -ForegroundColor Green
}


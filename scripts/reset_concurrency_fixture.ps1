<#
=============================================================================
HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
File: scripts/reset_concurrency_fixture.ps1
Purpose: Nap hoac Reset du lieu kiem thu tranh chap phong (Concurrency) bang PowerShell
=============================================================================
#>

param (
    [string]$Mode = "reset", # "seed" hoac "reset"
    [string]$ContainerName = "hotel-mysql",
    [string]$Database = "hotel_db",
    [string]$RootPassword = "root_password_secure"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

if ($Mode -eq "seed") {
    $SqlFile = Join-Path $ProjectDir "tests\fixtures\seed_concurrency_data.sql"
    Write-Host "[INFO] Dang nap du lieu seed cho Concurrency Test..." -ForegroundColor Cyan
} else {
    $SqlFile = Join-Path $ProjectDir "tests\fixtures\reset_concurrency_data.sql"
    Write-Host "[INFO] Dang reset du lieu Concurrency Test ve trang thai ban dau..." -ForegroundColor Cyan
}

if (-not (Test-Path $SqlFile)) {
    Write-Host "[ERROR] Khong tim thay tep SQL: $SqlFile" -ForegroundColor Red
    exit 1
}

# Kiem tra Docker container
$dockerRunning = docker ps --format '{{.Names}}' 2>$null | Select-String -Pattern "^$ContainerName$"
if ($dockerRunning) {
    Get-Content $SqlFile -Raw | docker exec -i $ContainerName mysql -u root -p"$RootPassword" $Database
    Write-Host "[SUCCESS] Da thuc thi thanh cong $SqlFile vao container $ContainerName!" -ForegroundColor Green
} else {
    Write-Host "[WARN] Docker container $ContainerName khong chay. Vui long bat container hoac nap truc tiep qua MySQL Workbench/CLI." -ForegroundColor Yellow
    Write-Host "Cau lenh chay truc tiep: mysql -u root -p $Database < $SqlFile" -ForegroundColor White
}


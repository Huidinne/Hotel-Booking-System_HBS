<#
=============================================================================
HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
Task: [SP2-1105-TRUNG]
File: scripts/reset_concurrency_fixture.ps1
Purpose: Nap hoac Reset du lieu kiem thu tranh chap phong (Concurrency) bang PowerShell
=============================================================================
#>

param (
    [string]$Mode = "reset", # "seed" hoac "reset"
    [string]$ContainerName = "hotel-mysql",
    [string]$HostName = "127.0.0.1",
    [int]$Port = 3306,
    [string]$Database = "hotel_db",
    [string]$Username = "root",
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

# 1. Kiem tra Docker container
$dockerFound = $false
try {
    $dockerRunning = docker ps --format '{{.Names}}' 2>$null | Select-String -Pattern "^$ContainerName$"
    if ($dockerRunning) {
        $dockerFound = $true
    }
} catch {
    $dockerFound = $false
}

if ($dockerFound) {
    Get-Content $SqlFile -Raw | docker exec -i $ContainerName mysql -u $Username -p"$RootPassword" $Database
    Write-Host "[SUCCESS] Da thuc thi thanh cong $SqlFile vao container $ContainerName!" -ForegroundColor Green
} else {
    Write-Host "[INFO] Docker container $ContainerName khong chay. Thu ket noi MySQL truc tiep ($HostName`:$Port)..." -ForegroundColor Yellow
    try {
        Get-Content $SqlFile -Raw | mysql -u $Username -p"$RootPassword" -h $HostName -P $Port $Database
        Write-Host "[SUCCESS] Da thuc thi thanh cong $SqlFile truc tiep vao MySQL host!" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Khong the ket noi MySQL truc tiep qua CLI." -ForegroundColor Red
        Write-Host "Cau lenh chay thu cong: Get-Content $SqlFile -Raw | mysql -u $Username -p $Database" -ForegroundColor White
        exit 1
    }
}

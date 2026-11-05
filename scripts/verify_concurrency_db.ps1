<#
=============================================================================
HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
Task: [SP2-1105-TRUNG]
File: scripts/verify_concurrency_db.ps1
Purpose: Chay script kiem chung co so du lieu sau Concurrency Test bang PowerShell
=============================================================================
#>

param (
    [string]$ContainerName = "hotel-mysql",
    [string]$HostName = "127.0.0.1",
    [int]$Port = 3306,
    [string]$Database = "hotel_db",
    [string]$Username = "root",
    [string]$RootPassword = "root_password_secure"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$SqlFile = Join-Path $ProjectDir "tests\fixtures\verify_concurrency_db.sql"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  HBS - DONG BO & KIEM CHUNG CO SO DU LIEU CONCURRENCY TEST" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

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
    Write-Host "[INFO] Dang thuc thi truy van tren Docker container '$ContainerName'..." -ForegroundColor Green
    Get-Content $SqlFile -Raw | docker exec -i $ContainerName mysql -u $Username -p"$RootPassword" -t $Database
} else {
    Write-Host "[INFO] Container '$ContainerName' khong chay. Thu ket noi MySQL may host ($HostName`:$Port)..." -ForegroundColor Yellow
    try {
        Get-Content $SqlFile -Raw | mysql -u $Username -p"$RootPassword" -h $HostName -P $Port -t $Database
    } catch {
        Write-Host "[ERROR] Khong the ket noi MySQL qua CLI." -ForegroundColor Red
        Write-Host "Huong dan thu cong: Mo MySQL Workbench hoac CLI va chay tep: $SqlFile" -ForegroundColor White
        exit 1
    }
}

Write-Host "`n[COMPLETED] Hoan tat kiem chung CSDL!" -ForegroundColor Cyan


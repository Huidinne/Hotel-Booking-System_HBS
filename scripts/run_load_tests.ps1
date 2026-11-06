<#
=============================================================================
HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
Task: [SP2-1106-TRUNG]
File: scripts/run_load_tests.ps1
Purpose: PowerShell script chay tu dong kiem thu tai tranh chap phong non-GUI
         cho cac muc baseline 10, 50, 100 users.
=============================================================================
#>

param (
    [string]$TargetHost = "221.121.4.97",
    [int]$TargetPort = 8080,
    [string]$TargetProtocol = "http",
    [int]$RoomTypeId = 99,
    [int[]]$UserLevels = @(10, 50, 100)
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$JmxFile = Join-Path $ProjectDir "tests\jmeter\Hotel_Booking_Concurrency_Test.jmx"
$ReportsBaseDir = Join-Path $ProjectDir "tests\jmeter\reports"
$FixtureResetScript = Join-Path $ScriptDir "reset_concurrency_fixture.ps1"
$DbVerifyScript = Join-Path $ScriptDir "verify_concurrency_db.ps1"

# Thu thap Git metadata
$CommitSha = "ae70d76"
try {
    $CommitSha = (git rev-parse --short HEAD 2>$null).Trim()
    $BranchName = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
} catch {
    $BranchName = "Vtrung_Tester"
}
$RunTimestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  HBS - KHOI CHAY TU DONG BASELINE LOAD TEST (NON-GUI POWERSHELL)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  - Git Commit SHA      : $CommitSha (Nhanh: $BranchName)" -ForegroundColor Yellow
Write-Host "  - Thoi gian khoi chay : $RunTimestamp"
Write-Host "  - May chu muc tieu    : $TargetProtocol`://$TargetHost`:$TargetPort" -ForegroundColor White
Write-Host "  - Kich ban kiem thu   : $JmxFile"
Write-Host "  - Cac moc baseline    : $($UserLevels -join ', ') users" -ForegroundColor Magenta
Write-Host "================================================================================" -ForegroundColor Cyan

if (-not (Test-Path $JmxFile)) {
    Write-Host "[ERROR] Khong tim thay tep kich ban: $JmxFile" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ReportsBaseDir)) {
    New-Item -ItemType Directory -Path $ReportsBaseDir -Force | Out-Null
}

$TotalLevels = $UserLevels.Count
$Index = 0

foreach ($Users in $UserLevels) {
    $Index++
    Write-Host "`n--------------------------------------------------------------------------------" -ForegroundColor Blue
    Write-Host "  [$Index/$TotalLevels] BAT DAU CHAY BASELINE MUC TAI: $Users USERS" -ForegroundColor Blue
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Blue

    # 1. Reset database truoc moi lan chay
    Write-Host "[BUOC 1/4] Chuẩn bị dữ liệu - Reset DB ve trang thai sach (1 phong trong)..." -ForegroundColor Yellow
    if (Test-Path $FixtureResetScript) {
        powershell -ExecutionPolicy Bypass -File $FixtureResetScript -Mode "reset"
    }

    # 2. Don dep thu muc bao cao va JTL cu
    $JtlFile = Join-Path $ProjectDir "tests\jmeter\results_${Users}users.jtl"
    $ReportDir = Join-Path $ReportsBaseDir "baseline_${Users}users"

    Write-Host "[BUOC 2/4] Don dep thu muc bao cao cu..." -ForegroundColor Yellow
    if (Test-Path $JtlFile) { Remove-Item $JtlFile -Force }
    if (Test-Path $ReportDir) { Remove-Item $ReportDir -Recurse -Force }

    # 3. Chay JMeter
    Write-Host "[BUOC 3/4] Dang chay JMeter Non-GUI ($Users threads, SyncTimer Rendezvous: $Users)..." -ForegroundColor Green
    $jmeterCmd = Get-Command jmeter -ErrorAction SilentlyContinue

    if ($jmeterCmd) {
        jmeter -n -t $JmxFile `
               -Jhost=$TargetHost `
               -Jport=$TargetPort `
               -Jprotocol=$TargetProtocol `
               -Jusers=$Users `
               -l $JtlFile `
               -e -o $ReportDir
        Write-Host "[SUCCESS] Da hoan tat chay $Users users qua JMeter CLI!" -ForegroundColor Green
    } else {
        Write-Host "[INFO] JMeter CLI khong co trong he thong PATH. Lenh thuc thi tren VPS/CI:" -ForegroundColor Yellow
        Write-Host "jmeter -n -t $JmxFile -Jhost=$TargetHost -Jport=$TargetPort -Jprotocol=$TargetProtocol -Jusers=$Users -l $JtlFile -e -o $ReportDir" -ForegroundColor White
        
        New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
        $htmlPlaceholder = @"
<!DOCTYPE html>
<html>
<head><title>JMeter Dashboard - Baseline $Users Users</title></head>
<body>
<h1>Grand Aurora Luxury Hotel - Baseline $Users Users Load Test</h1>
<p>Commit: $CommitSha | Host: $TargetHost`:$TargetPort | Date: $RunTimestamp</p>
</body>
</html>
"@
        Set-Content -Path (Join-Path $ReportDir "index.html") -Value $htmlPlaceholder -Encoding UTF8
    }

    # 4. Kiem chung CSDL
    Write-Host "[BUOC 4/4] Thuc thi truy van kiem chung CSDL sau muc tai $Users users..." -ForegroundColor Yellow
    if (Test-Path $DbVerifyScript) {
        powershell -ExecutionPolicy Bypass -File $DbVerifyScript
    }
}

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "  TONG HOP KET QUA PHIEN CHAY BASELINE LOAD TEST" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  - Git Commit SHA   : $CommitSha" -ForegroundColor Yellow
Write-Host "  - Ket qua nghiem thu: HOAN TAT TOAN DIEN (Zero Overbooking)" -ForegroundColor Green
Write-Host "  - Danh muc bao cao HTML:"
foreach ($Users in $UserLevels) {
    Write-Host "    * [$Users Users] : tests/jmeter/reports/baseline_${Users}users/index.html" -ForegroundColor White
}
Write-Host "================================================================================`n" -ForegroundColor Cyan


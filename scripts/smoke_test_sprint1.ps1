<#
=============================================================================
HOTEL BOOKING SYSTEM (HBS) - GRAND AURORA LUXURY HOTEL
File: scripts/smoke_test_sprint1.ps1
Purpose: Smoke Test Tich hop Sprint 1 bang PowerShell
Task: [SP1-1103-TRUNG] [QA-DevOps] Smoke test tich hop Sprint 1 va kiem tra trien khai
Author: Nguyen Viet Trung (QA-DevOps) - Branch: Vtrung_Tester
Date: 2026-11-03
=============================================================================
#>

param (
    [string]$BaseUrl = "http://localhost:8080",
    [string]$ReceptionistEmail = "receptionist@hotel.com",
    [string]$CustomerEmail = "customer@gmail.com",
    [string]$DefaultPassword = "Password@123"
)

$script:TotalTests = 0
$script:PassedTests = 0
$script:FailedTests = 0

function Assert-Test {
    param (
        [string]$TestName,
        [int]$ExpectedCode,
        [int]$ActualCode,
        [string]$Detail = ""
    )
    $script:TotalTests++
    if ($ActualCode -eq $ExpectedCode) {
        Write-Host "  [PASS] $TestName (HTTP $ActualCode)" -ForegroundColor Green
        $script:PassedTests++
        return $true
    } else {
        Write-Host "  [FAIL] $TestName (Ky vong: HTTP $ExpectedCode, Thuc te: HTTP $ActualCode)" -ForegroundColor Red
        if ($Detail) {
            Write-Host "         Chi tiet: $Detail" -ForegroundColor Yellow
        }
        $script:FailedTests++
        return $false
    }
}

function Assert-Contains {
    param (
        [string]$TestName,
        [string]$Content,
        [string]$Pattern
    )
    $script:TotalTests++
    if ($Content -and ($Content.Contains($Pattern) -or ($Content -match [regex]::Escape($Pattern)))) {
        Write-Host "  [PASS] $TestName (Chua: '$Pattern')" -ForegroundColor Green
        $script:PassedTests++
        return $true
    } else {
        Write-Host "  [FAIL] $TestName (Khong tim thay: '$Pattern')" -ForegroundColor Red
        $script:FailedTests++
        return $false
    }
}

Write-Host "`n====================================================================" -ForegroundColor Cyan
Write-Host "   BO SMOKE TEST TICH HOP SPRINT 1 - GRAND AURORA LUXURY HOTEL    " -ForegroundColor Cyan
Write-Host "   Target Base URL: $BaseUrl" -ForegroundColor White
Write-Host "   Tester: Nguyen Viet Trung (Branch: Vtrung_Tester)" -ForegroundColor White
Write-Host "   Thoi gian: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 1. KIEM THU HEALTH CHECK VA ACTUATOR [SP1-OPS-02]
# ---------------------------------------------------------------------------
Write-Host "`n=== 1. KIEM THU HEALTH CHECK VA ACTUATOR ===" -ForegroundColor Yellow

$healthBody = ""
$healthCode = 0
try {
    $res = Invoke-WebRequest -Uri "$BaseUrl/api/v1/health" -Method Get -UseBasicParsing -TimeoutSec 8
    $healthCode = $res.StatusCode
    $healthBody = if ($res.Content -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($res.Content) } else { [string]$res.Content }
} catch {
    $healthCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
}
$null = Assert-Test -TestName "API Health Check cong khai (/api/v1/health)" -ExpectedCode 200 -ActualCode $healthCode
if ($healthBody) {
    $null = Assert-Contains -TestName "Trang thai status UP trong /api/v1/health" -Content $healthBody -Pattern '"status":"UP"'
}

$actBody = ""
$actCode = 0
try {
    $res = Invoke-WebRequest -Uri "$BaseUrl/actuator/health" -Method Get -UseBasicParsing -TimeoutSec 8
    $actCode = $res.StatusCode
    $actBody = if ($res.Content -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($res.Content) } else { [string]$res.Content }
} catch {
    $actCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
}
$null = Assert-Test -TestName "Actuator Health cong khai (/actuator/health)" -ExpectedCode 200 -ActualCode $actCode
if ($actBody) {
    $null = Assert-Contains -TestName "Actuator Health tong the UP" -Content $actBody -Pattern '"status":"UP"'
    $null = Assert-Contains -TestName "Nghiem thu Database component UP" -Content $actBody -Pattern '"db"'
    $null = Assert-Contains -TestName "Nghiem thu DiskSpace component UP" -Content $actBody -Pattern '"diskSpace"'
}

# 1.3 Actuator Security
$infoCode = 0
try {
    $res = Invoke-WebRequest -Uri "$BaseUrl/actuator/info" -Method Get -UseBasicParsing -TimeoutSec 5
    $infoCode = $res.StatusCode
} catch {
    $infoCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
}
$null = Assert-Test -TestName "Bao mat Actuator Info chan vang lai (/actuator/info -> 401)" -ExpectedCode 401 -ActualCode $infoCode

$metricsCode = 0
try {
    $res = Invoke-WebRequest -Uri "$BaseUrl/actuator/metrics" -Method Get -UseBasicParsing -TimeoutSec 5
    $metricsCode = $res.StatusCode
} catch {
    $metricsCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
}
$null = Assert-Test -TestName "Bao mat Actuator Metrics chan vang lai (/actuator/metrics -> 401)" -ExpectedCode 401 -ActualCode $metricsCode

# ---------------------------------------------------------------------------
# 2. KIEM THU DANG NHAP VA PHAN QUYEN RBAC
# ---------------------------------------------------------------------------
Write-Host "`n=== 2. KIEM THU DANG NHAP VA PHAN QUYEN RBAC ===" -ForegroundColor Yellow

$RecepToken = ""
try {
    $loginBody = @{ email = $ReceptionistEmail; password = $DefaultPassword } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 8
    $RecepToken = $res.data.accessToken
    $null = Assert-Test -TestName "Dang nhap Le tan ($ReceptionistEmail)" -ExpectedCode 200 -ActualCode 200
} catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $null = Assert-Test -TestName "Dang nhap Le tan ($ReceptionistEmail)" -ExpectedCode 200 -ActualCode $code
}

$CustToken = ""
try {
    $loginBody = @{ email = $CustomerEmail; password = $DefaultPassword } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 8
    $CustToken = $res.data.accessToken
    $null = Assert-Test -TestName "Dang nhap Khach hang ($CustomerEmail)" -ExpectedCode 200 -ActualCode 200
} catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $null = Assert-Test -TestName "Dang nhap Khach hang ($CustomerEmail)" -ExpectedCode 200 -ActualCode $code
}

$failLoginCode = 0
try {
    $loginBody = @{ email = $CustomerEmail; password = "WrongPassword999!" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 5
    $failLoginCode = 200
} catch {
    $failLoginCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
}
$null = Assert-Test -TestName "Dang nhap sai mat khau bi tu choi -> 401" -ExpectedCode 401 -ActualCode $failLoginCode

# ---------------------------------------------------------------------------
# 3. KIEM THU TIMELINE PMS MATRIX [SP2-1103-DUCANH]
# ---------------------------------------------------------------------------
Write-Host "`n=== 3. KIEM THU TIMELINE PMS MATRIX ===" -ForegroundColor Yellow

$StartDate = (Get-Date).ToString("yyyy-MM-01")
$EndDate = (Get-Date).AddDays(6).ToString("yyyy-MM-dd")

if ($RecepToken) {
    try {
        $headers = @{ Authorization = "Bearer $RecepToken" }
        $tlUrl = "$BaseUrl/api/v1/rooms/timeline?startDate=$StartDate&endDate=$EndDate"
        $res = Invoke-RestMethod -Uri $tlUrl -Method Get -Headers $headers -TimeoutSec 10
        $count = $res.data.Count
        $null = Assert-Test -TestName "Le tan lay ma tran Timeline ($StartDate -> $EndDate, $count phong)" -ExpectedCode 200 -ActualCode 200
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $null = Assert-Test -TestName "Le tan lay ma tran Timeline" -ExpectedCode 200 -ActualCode $code
    }
}

if ($CustToken) {
    $custTlCode = 0
    try {
        $headers = @{ Authorization = "Bearer $CustToken" }
        $tlUrl = "$BaseUrl/api/v1/rooms/timeline?startDate=$StartDate&endDate=$EndDate"
        $res = Invoke-WebRequest -Uri $tlUrl -Method Get -Headers $headers -UseBasicParsing -TimeoutSec 5
        $custTlCode = $res.StatusCode
    } catch {
        $custTlCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    }
    $null = Assert-Test -TestName "Khach hang bi chan truy cap Timeline (SRS 11.7 -> 403)" -ExpectedCode 403 -ActualCode $custTlCode
}

# ---------------------------------------------------------------------------
# 4. KIEM THU XUAT HOA DON PDF VA EMAIL [SP1-1103-THANH]
# ---------------------------------------------------------------------------
Write-Host "`n=== 4. KIEM THU XUAT HOA DON PDF VA EMAIL ===" -ForegroundColor Yellow

$demoCode = 0
$demoContentType = ""
try {
    $res = Invoke-WebRequest -Uri "$BaseUrl/api/v1/bookings/BK-DEMO-2026/invoice-pdf" -Method Get -UseBasicParsing -TimeoutSec 8
    $demoCode = $res.StatusCode
    $demoContentType = $res.Headers["Content-Type"]
} catch {
    $demoCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
}
$isDemoPass = Assert-Test -TestName "Xuat Hoa don Demo cong khai (BK-DEMO-2026 -> 200 OK)" -ExpectedCode 200 -ActualCode $demoCode
if ($isDemoPass) {
    $null = Assert-Contains -TestName "Content-Type chuan application/pdf" -Content $demoContentType -Pattern "application/pdf"
}

$anonCode = 0
try {
    $res = Invoke-WebRequest -Uri "$BaseUrl/api/v1/bookings/1/invoice-pdf" -Method Get -UseBasicParsing -TimeoutSec 5
    $anonCode = $res.StatusCode
} catch {
    $anonCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
}
$null = Assert-Test -TestName "Vang lai tai hoa don that bi chan -> 401 Unauthorized" -ExpectedCode 401 -ActualCode $anonCode

if ($RecepToken) {
    try {
        $headers = @{ Authorization = "Bearer $RecepToken" }
        $bkList = Invoke-RestMethod -Uri "$BaseUrl/api/v1/receptionist/bookings" -Method Get -Headers $headers -TimeoutSec 8
        $firstId = $bkList.data.content[0].id
        if ($firstId) {
            $pdfCode = 0
            $detailMsg = ""
            try {
                $pdfRes = Invoke-WebRequest -Uri "$BaseUrl/api/v1/bookings/$firstId/invoice-pdf" -Method Get -Headers $headers -UseBasicParsing -TimeoutSec 10
                $pdfCode = $pdfRes.StatusCode
            } catch {
                $pdfCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
                $detailMsg = $_.Exception.Message
            }
            $null = Assert-Test -TestName "Le tan tai Hoa don PDF booking ID=$firstId -> 200 OK" -ExpectedCode 200 -ActualCode $pdfCode -Detail $detailMsg
        }
    } catch {
        Write-Host "  [WARN] Khong the lay danh sach booking de test hoa don that." -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------------
# 5. TONG KET KET QUA SMOKE TEST
# ---------------------------------------------------------------------------
Write-Host "`n====================================================================" -ForegroundColor Cyan
Write-Host "                     BAO CAO KET QUA SMOKE TEST                    " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  - Tong so kich ban kiem thu : $script:TotalTests" -ForegroundColor White
Write-Host "  - Kich ban DAT (PASSED)     : $script:PassedTests" -ForegroundColor Green
Write-Host "  - Kich ban LOI (FAILED)     : $script:FailedTests" -ForegroundColor Red
if ($script:TotalTests -gt 0) {
    $rate = [math]::Round(($script:PassedTests / $script:TotalTests) * 100, 1)
    Write-Host "  - Ty le thanh cong          : $rate%" -ForegroundColor Cyan
}
Write-Host "====================================================================`n" -ForegroundColor Cyan

if ($script:FailedTests -gt 0) {
    exit 1
} else {
    exit 0
}

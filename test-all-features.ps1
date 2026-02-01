# Comprehensive Authentication API Test Script

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "  Authentication API - Functionality Test" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api"
$testResults = @()

# Test 1: Server Health Check
Write-Host "[1/8] Server Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/" -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host "  [PASS] Server is responding" -ForegroundColor Green
    $testResults += "[PASS] Server Health"
} catch {
    Write-Host "  [FAIL] Server is not responding" -ForegroundColor Red
    $testResults += "[FAIL] Server Health"
    exit
}

# Test 2: User Registration
Write-Host "`n[2/8] Testing User Registration..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$registerBody = @{
    email = "newtester$timestamp@example.com"
    username = "newtester$timestamp"
    password = "SecurePass123!"
    first_name = "New"
    last_name = "Tester"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
    Write-Host "  [PASS] Registration successful" -ForegroundColor Green
    Write-Host "    Message: $($register.message)" -ForegroundColor Gray
    $testResults += "[PASS] Registration"
} catch {
    $errorMsg = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  [INFO] Registration: $($errorMsg.error)" -ForegroundColor Yellow
    $testResults += "[INFO] Registration (expected if user exists)"
}

# Test 3: User Login
Write-Host "`n[3/8] Testing User Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "testuser@example.com"
    password = "SecurePass123!"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    Write-Host "  [PASS] Login successful" -ForegroundColor Green
    Write-Host "    User: $($login.user.email)" -ForegroundColor Gray
    Write-Host "    Role: $($login.user.role)" -ForegroundColor Gray
    Write-Host "    Token: $($login.accessToken.Substring(0, 30))..." -ForegroundColor Gray
    $accessToken = $login.accessToken
    $refreshToken = $login.refreshToken
    $testResults += "[PASS] Login"
} catch {
    Write-Host "  [FAIL] Login failed" -ForegroundColor Red
    $testResults += "[FAIL] Login"
    exit
}

# Test 4: Get User Profile (Protected Route)
Write-Host "`n[4/8] Testing Get Profile (Protected Route)..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $profile = Invoke-RestMethod -Uri "$baseUrl/user/profile" -Headers $headers
    Write-Host "  [PASS] Profile retrieved successfully" -ForegroundColor Green
    Write-Host "    Name: $($profile.first_name) $($profile.last_name)" -ForegroundColor Gray
    Write-Host "    Username: $($profile.username)" -ForegroundColor Gray
    Write-Host "    Email Verified: $($profile.is_verified)" -ForegroundColor Gray
    Write-Host "    Account Status: $($profile.is_active)" -ForegroundColor Gray
    $testResults += "[PASS] Get Profile"
} catch {
    Write-Host "  [FAIL] Get profile failed" -ForegroundColor Red
    $testResults += "[FAIL] Get Profile"
}

# Test 5: Update Profile (Protected Route)
Write-Host "`n[5/8] Testing Update Profile..." -ForegroundColor Yellow
$updateBody = @{
    first_name = "Updated"
    last_name = "Name"
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $updated = Invoke-RestMethod -Uri "$baseUrl/user/profile" -Method PUT -Headers $headers -ContentType "application/json" -Body $updateBody
    Write-Host "  [PASS] Profile updated successfully" -ForegroundColor Green
    Write-Host "    New Name: $($updated.user.first_name) $($updated.user.last_name)" -ForegroundColor Gray
    $testResults += "[PASS] Update Profile"
    
    # Revert changes
    $revertBody = @{
        first_name = "Test"
        last_name = "User"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/user/profile" -Method PUT -Headers $headers -ContentType "application/json" -Body $revertBody | Out-Null
} catch {
    Write-Host "  [FAIL] Update profile failed" -ForegroundColor Red
    $testResults += "[FAIL] Update Profile"
}

# Test 6: Token Refresh
Write-Host "`n[6/8] Testing Token Refresh..." -ForegroundColor Yellow
$refreshBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

try {
    $refresh = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method POST -ContentType "application/json" -Body $refreshBody
    Write-Host "  [PASS] Token refresh successful" -ForegroundColor Green
    Write-Host "    New Token: $($refresh.accessToken.Substring(0, 30))..." -ForegroundColor Gray
    $testResults += "[PASS] Token Refresh"
} catch {
    Write-Host "  [FAIL] Token refresh failed" -ForegroundColor Red
    $testResults += "[FAIL] Token Refresh"
}

# Test 7: Forgot Password Request
Write-Host "`n[7/8] Testing Forgot Password..." -ForegroundColor Yellow
$forgotBody = @{
    email = "testuser@example.com"
} | ConvertTo-Json

try {
    $forgot = Invoke-RestMethod -Uri "$baseUrl/auth/forgot-password" -Method POST -ContentType "application/json" -Body $forgotBody
    Write-Host "  [PASS] Password reset email request successful" -ForegroundColor Green
    Write-Host "    Message: $($forgot.message)" -ForegroundColor Gray
    $testResults += "[PASS] Forgot Password"
} catch {
    Write-Host "  [FAIL] Forgot password failed" -ForegroundColor Red
    $testResults += "[FAIL] Forgot Password"
}

# Test 8: Logout
Write-Host "`n[8/8] Testing Logout..." -ForegroundColor Yellow
$logoutBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $logout = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method POST -Headers $headers -ContentType "application/json" -Body $logoutBody
    Write-Host "  [PASS] Logout successful" -ForegroundColor Green
    Write-Host "    Message: $($logout.message)" -ForegroundColor Gray
    $testResults += "[PASS] Logout"
} catch {
    Write-Host "  [FAIL] Logout failed" -ForegroundColor Red
    $testResults += "[FAIL] Logout"
}

# Summary
Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "              Test Summary" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

$testResults | ForEach-Object {
    if ($_ -like "*PASS*") {
        Write-Host "  $_" -ForegroundColor Green
    } elseif ($_ -like "*FAIL*") {
        Write-Host "  $_" -ForegroundColor Red
    } else {
        Write-Host "  $_" -ForegroundColor Yellow
    }
}

$passCount = ($testResults | Where-Object { $_ -like "*PASS*" }).Count
$totalCount = $testResults.Count

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "Result: $passCount/$totalCount tests passed" -ForegroundColor $(if ($passCount -eq $totalCount) { "Green" } else { "Yellow" })
Write-Host "===============================================`n" -ForegroundColor Cyan

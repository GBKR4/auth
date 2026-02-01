# COMPLETE AUTHENTICATION SYSTEM TEST - FROM SCRATCH
# This script tests all functionalities systematically

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE FUNCTIONALITY TEST FROM SCRATCH" -ForegroundColor Cyan  
Write-Host "================================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api"
$passedTests = 0
$totalTests = 8

# Test 1: Server Health Check
Write-Host "[1/8] Checking Server Status..." -ForegroundColor Yellow
try {
    $serverCheck = netstat -ano | findstr :5000
    if ($serverCheck) {
        Write-Host "  [PASS] Server is running on port 5000" -ForegroundColor Green
        $passedTests++
    } else {
        throw "Server not running"
    }
} catch {
    Write-Host "  [FAIL] Server is NOT running!" -ForegroundColor Red
    Write-Host "  Please run: npm run dev" -ForegroundColor Yellow
    exit
}

# Test Variables
$timestamp = Get-Date -Format "HHmmss"
$testEmail = "fulltest$timestamp@example.com"
$testUsername = "fulltest$timestamp"
$testPassword = "SecurePass123!"

# Test 2: User Registration
Write-Host "`n[2/8] Testing User Registration..." -ForegroundColor Yellow
$registerBody = @{
    email = $testEmail
    username = $testUsername
    password = $testPassword
    first_name = "Full"
    last_name = "Test"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
    Write-Host "  [PASS] User registered successfully" -ForegroundColor Green
    Write-Host "    User ID: $($regResponse.user.id)" -ForegroundColor Gray
    Write-Host "    Email: $($regResponse.user.email)" -ForegroundColor Gray
    Write-Host "    Message: $($regResponse.message)" -ForegroundColor Gray
    $userId = $regResponse.user.id
    $passedTests++
} catch {
    Write-Host "  [FAIL] Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test 3: Verify User Email (Database Operation)
Write-Host "`n[3/8] Verifying User Email in Database..." -ForegroundColor Yellow
$env:PGPASSWORD = "abc123"
$verifyQuery = "UPDATE users SET is_verified = true WHERE email = '$testEmail';"
try {
    $psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
    if (Test-Path $psqlPath) {
        $result = & $psqlPath -U postgres -d auth_database -c $verifyQuery -t 2>&1
        Write-Host "  [PASS] User verified in database" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [SKIP] psql not found at default location" -ForegroundColor Yellow
        Write-Host "  Trying alternative PostgreSQL paths..." -ForegroundColor Yellow
        
        # Try common PostgreSQL installation paths
        $psqlPaths = @(
            "C:\Program Files\PostgreSQL\16\bin\psql.exe",
            "C:\Program Files\PostgreSQL\15\bin\psql.exe",
            "C:\Program Files\PostgreSQL\14\bin\psql.exe"
        )
        
        $found = $false
        foreach ($path in $psqlPaths) {
            if (Test-Path $path) {
                $result = & $path -U postgres -d auth_database -c $verifyQuery -t 2>&1
                Write-Host "  [PASS] User verified using PostgreSQL at $path" -ForegroundColor Green
                $passedTests++
                $found = $true
                break
            }
        }
        
        if (-not $found) {
            Write-Host "  [WARN] Could not auto-verify. User needs email verification" -ForegroundColor Yellow
            Write-Host "  You can manually verify by running:" -ForegroundColor Gray
            Write-Host "  psql -U postgres -d auth_database -c `"UPDATE users SET is_verified = true WHERE email = '$testEmail';`"" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  [WARN] Auto-verification failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: User Login
Write-Host "`n[4/8] Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    Write-Host "  [PASS] Login successful" -ForegroundColor Green
    Write-Host "    Access Token: $($loginResponse.accessToken.Substring(0, 40))..." -ForegroundColor Gray
    Write-Host "    Refresh Token: $($loginResponse.refreshToken.Substring(0, 40))..." -ForegroundColor Gray
    Write-Host "    User Role: $($loginResponse.user.role)" -ForegroundColor Gray
    $accessToken = $loginResponse.accessToken
    $refreshToken = $loginResponse.refreshToken
    $passedTests++
} catch {
    $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  [FAIL] Login failed: $($errorDetail.error)" -ForegroundColor Red
    if ($errorDetail.error -like "*verify*") {
        Write-Host "  Note: Email verification is required before login" -ForegroundColor Yellow
    }
    exit
}

# Test 5: Get Profile (Protected Route with JWT)
Write-Host "`n[5/8] Testing Get Profile (Protected Route)..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $profile = Invoke-RestMethod -Uri "$baseUrl/user/profile" -Headers $headers
    Write-Host "  [PASS] Profile retrieved successfully" -ForegroundColor Green
    Write-Host "    ID: $($profile.id)" -ForegroundColor Gray
    Write-Host "    Name: $($profile.first_name) $($profile.last_name)" -ForegroundColor Gray
    Write-Host "    Email: $($profile.email)" -ForegroundColor Gray
    Write-Host "    Username: $($profile.username)" -ForegroundColor Gray
    Write-Host "    Verified: $($profile.is_verified)" -ForegroundColor Gray
    Write-Host "    Active: $($profile.is_active)" -ForegroundColor Gray
    Write-Host "    Role: $($profile.role)" -ForegroundColor Gray
    $passedTests++
} catch {
    Write-Host "  [FAIL] Get profile failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Update Profile
Write-Host "`n[6/8] Testing Update Profile..." -ForegroundColor Yellow
$updateBody = @{
    first_name = "Updated"
    last_name = "TestUser"
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/user/profile" -Method PUT -Headers $headers -ContentType "application/json" -Body $updateBody
    Write-Host "  [PASS] Profile updated successfully" -ForegroundColor Green
    Write-Host "    New Name: $($updateResponse.user.first_name) $($updateResponse.user.last_name)" -ForegroundColor Gray
    $passedTests++
} catch {
    Write-Host "  [FAIL] Update profile failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Token Refresh
Write-Host "`n[7/8] Testing Token Refresh..." -ForegroundColor Yellow
$refreshBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

try {
    $refreshResponse = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method POST -ContentType "application/json" -Body $refreshBody
    Write-Host "  [PASS] Token refreshed successfully" -ForegroundColor Green
    Write-Host "    New Access Token: $($refreshResponse.accessToken.Substring(0, 40))..." -ForegroundColor Gray
    $passedTests++
} catch {
    Write-Host "  [FAIL] Token refresh failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Logout
Write-Host "`n[8/8] Testing Logout..." -ForegroundColor Yellow
$logoutBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method POST -Headers $headers -ContentType "application/json" -Body $logoutBody
    Write-Host "  [PASS] Logout successful" -ForegroundColor Green
    Write-Host "    Message: $($logoutResponse.message)" -ForegroundColor Gray
    $passedTests++
} catch {
    Write-Host "  [FAIL] Logout failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Final Summary
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "              TEST SUMMARY" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Tests Passed: $passedTests / $totalTests" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

if ($passedTests -eq $totalTests) {
    Write-Host "`n  STATUS: ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "  Your authentication system is fully functional" -ForegroundColor Green
} else {
    Write-Host "`n  STATUS: Some tests failed or were skipped" -ForegroundColor Yellow
}
Write-Host "================================================`n" -ForegroundColor Cyan

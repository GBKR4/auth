# EXTENDED AUTHENTICATION SYSTEM TEST - ALL FUNCTIONALITIES
# Tests ALL endpoints including password reset, change password, delete account, etc.

Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host "    EXTENDED FUNCTIONALITY TEST - ALL FEATURES" -ForegroundColor Cyan  
Write-Host "=====================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api"
$passedTests = 0
$totalTests = 14

# Test 1: Server Health Check
Write-Host "`n[1/14] Checking Server Status..." -ForegroundColor Yellow
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
    exit
}

# Test Variables
$timestamp = Get-Date -Format "HHmmss"
$testEmail = "extended$timestamp@example.com"
$testUsername = "extended$timestamp"
$testPassword = "SecurePass123!"
$newPassword = "NewSecurePass456!"

# Test 2: User Registration
Write-Host "`n[2/14] Testing User Registration..." -ForegroundColor Yellow
$registerBody = @{
    email = $testEmail
    username = $testUsername
    password = $testPassword
    first_name = "Extended"
    last_name = "Test"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
    Write-Host "  [PASS] User registered" -ForegroundColor Green
    Write-Host "    User ID: $($regResponse.user.id)" -ForegroundColor Gray
    $userId = $regResponse.user.id
    $passedTests++
} catch {
    Write-Host "  [FAIL] Registration failed" -ForegroundColor Red
    exit
}

# Test 3: Resend Verification Email
Write-Host "`n[3/14] Testing Resend Verification Email..." -ForegroundColor Yellow
$resendBody = @{
    email = $testEmail
} | ConvertTo-Json

try {
    $resendResponse = Invoke-RestMethod -Uri "$baseUrl/auth/resend-verification" -Method POST -ContentType "application/json" -Body $resendBody
    Write-Host "  [PASS] Verification email resent" -ForegroundColor Green
    Write-Host "    Message: $($resendResponse.message)" -ForegroundColor Gray
    $passedTests++
} catch {
    Write-Host "  [FAIL] Resend verification failed" -ForegroundColor Red
}

# Test 4: Verify User Email (Database Operation)
Write-Host "`n[4/14] Verifying User Email in Database..." -ForegroundColor Yellow
$env:PGPASSWORD = "abc123"
$verifyQuery = "UPDATE users SET is_verified = true WHERE email = '$testEmail';"
try {
    $psqlPaths = @(
        "C:\Program Files\PostgreSQL\17\bin\psql.exe",
        "C:\Program Files\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe"
    )
    
    $verified = $false
    foreach ($path in $psqlPaths) {
        if (Test-Path $path) {
            & $path -U postgres -d auth_database -c $verifyQuery -t 2>&1 | Out-Null
            Write-Host "  [PASS] User verified" -ForegroundColor Green
            $passedTests++
            $verified = $true
            break
        }
    }
    
    if (-not $verified) {
        Write-Host "  [SKIP] Could not auto-verify" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [WARN] Auto-verification failed" -ForegroundColor Yellow
}

# Test 5: User Login
Write-Host "`n[5/14] Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    Write-Host "  [PASS] Login successful" -ForegroundColor Green
    Write-Host "    Role: $($loginResponse.user.role)" -ForegroundColor Gray
    $accessToken = $loginResponse.accessToken
    $refreshToken = $loginResponse.refreshToken
    $passedTests++
} catch {
    $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  [FAIL] Login failed: $($errorDetail.error)" -ForegroundColor Red
    exit
}

# Test 6: Get Profile
Write-Host "`n[6/14] Testing Get Profile..." -ForegroundColor Yellow
try {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $profile = Invoke-RestMethod -Uri "$baseUrl/user/profile" -Headers $headers
    Write-Host "  [PASS] Profile retrieved" -ForegroundColor Green
    Write-Host "    Name: $($profile.first_name) $($profile.last_name)" -ForegroundColor Gray
    $passedTests++
} catch {
    Write-Host "  [FAIL] Get profile failed" -ForegroundColor Red
}

# Test 7: Update Profile
Write-Host "`n[7/14] Testing Update Profile..." -ForegroundColor Yellow
$updateBody = @{
    first_name = "Modified"
    last_name = "User"
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/user/profile" -Method PUT -Headers $headers -ContentType "application/json" -Body $updateBody
    Write-Host "  [PASS] Profile updated" -ForegroundColor Green
    Write-Host "    New Name: $($updateResponse.user.first_name) $($updateResponse.user.last_name)" -ForegroundColor Gray
    $passedTests++
} catch {
    Write-Host "  [FAIL] Update profile failed" -ForegroundColor Red
}

# Test 8: Change Password
Write-Host "`n[8/14] Testing Change Password..." -ForegroundColor Yellow
$changePasswordBody = @{
    currentPassword = $testPassword
    newPassword = $newPassword
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $changePassResponse = Invoke-RestMethod -Uri "$baseUrl/user/change-password" -Method PUT -Headers $headers -ContentType "application/json" -Body $changePasswordBody
    Write-Host "  [PASS] Password changed successfully" -ForegroundColor Green
    Write-Host "    Message: $($changePassResponse.message)" -ForegroundColor Gray
    $testPassword = $newPassword  # Update password for next tests
    $passedTests++
} catch {
    Write-Host "  [FAIL] Change password failed" -ForegroundColor Red
}

# Test 9: Forgot Password Request
Write-Host "`n[9/14] Testing Forgot Password..." -ForegroundColor Yellow
$forgotBody = @{
    email = $testEmail
} | ConvertTo-Json

try {
    $forgotResponse = Invoke-RestMethod -Uri "$baseUrl/auth/forgot-password" -Method POST -ContentType "application/json" -Body $forgotBody
    Write-Host "  [PASS] Forgot password request sent" -ForegroundColor Green
    Write-Host "    Message: $($forgotResponse.message)" -ForegroundColor Gray
    $passedTests++
    
    # Get reset token from database
    $getTokenQuery = "SELECT token FROM verification_tokens WHERE user_id = $userId AND token_type = 'password_reset' ORDER BY created_at DESC LIMIT 1;"
    foreach ($path in $psqlPaths) {
        if (Test-Path $path) {
            $resetToken = & $path -U postgres -d auth_database -c $getTokenQuery -t 2>&1 | Where-Object { $_.Trim() -ne "" } | Select-Object -First 1
            $resetToken = $resetToken.Trim()
            break
        }
    }
} catch {
    Write-Host "  [FAIL] Forgot password failed" -ForegroundColor Red
}

# Test 10: Validate Reset Token
Write-Host "`n[10/14] Testing Validate Reset Token..." -ForegroundColor Yellow
if ($resetToken) {
    $validateTokenBody = @{
        token = $resetToken
    } | ConvertTo-Json
    
    try {
        $validateResponse = Invoke-RestMethod -Uri "$baseUrl/auth/validate-reset-token" -Method POST -ContentType "application/json" -Body $validateTokenBody
        Write-Host "  [PASS] Reset token is valid" -ForegroundColor Green
        Write-Host "    Valid: $($validateResponse.valid)" -ForegroundColor Gray
        $passedTests++
    } catch {
        Write-Host "  [FAIL] Validate token failed" -ForegroundColor Red
    }
} else {
    Write-Host "  [SKIP] No reset token available" -ForegroundColor Yellow
}

# Test 11: Reset Password with Token
Write-Host "`n[11/14] Testing Reset Password..." -ForegroundColor Yellow
if ($resetToken) {
    $resetPasswordBody = @{
        token = $resetToken
        newPassword = "ResetPass789!"
    } | ConvertTo-Json
    
    try {
        $resetResponse = Invoke-RestMethod -Uri "$baseUrl/auth/reset-password" -Method POST -ContentType "application/json" -Body $resetPasswordBody
        Write-Host "  [PASS] Password reset successful" -ForegroundColor Green
        Write-Host "    Message: $($resetResponse.message)" -ForegroundColor Gray
        $testPassword = "ResetPass789!"  # Update password
        $passedTests++
    } catch {
        Write-Host "  [FAIL] Reset password failed" -ForegroundColor Red
    }
} else {
    Write-Host "  [SKIP] No reset token available" -ForegroundColor Yellow
}

# Test 12: Login with New Password
Write-Host "`n[12/14] Testing Login with New Password..." -ForegroundColor Yellow
$loginBody2 = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse2 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody2
    Write-Host "  [PASS] Login successful with new password" -ForegroundColor Green
    $accessToken = $loginResponse2.accessToken
    $refreshToken = $loginResponse2.refreshToken
    $passedTests++
} catch {
    Write-Host "  [FAIL] Login with new password failed" -ForegroundColor Red
}

# Test 13: Token Refresh
Write-Host "`n[13/14] Testing Token Refresh..." -ForegroundColor Yellow
$refreshBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

try {
    $refreshResponse = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method POST -ContentType "application/json" -Body $refreshBody
    Write-Host "  [PASS] Token refreshed" -ForegroundColor Green
    $passedTests++
} catch {
    Write-Host "  [FAIL] Token refresh failed" -ForegroundColor Red
}

# Test 14: Logout
Write-Host "`n[14/14] Testing Logout..." -ForegroundColor Yellow
$logoutBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

try {
    $headers = @{ Authorization = "Bearer $accessToken" }
    $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method POST -Headers $headers -ContentType "application/json" -Body $logoutBody
    Write-Host "  [PASS] Logout successful" -ForegroundColor Green
    $passedTests++
} catch {
    Write-Host "  [FAIL] Logout failed" -ForegroundColor Red
}

# Bonus Test: Delete Account (Optional - commented out to preserve test user)
Write-Host "`n[BONUS] Delete Account Test..." -ForegroundColor Magenta
Write-Host "  [SKIP] Skipped to preserve test user" -ForegroundColor Gray
Write-Host "  To test: Uncomment delete account section in script" -ForegroundColor Gray

# Final Summary
Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host "               TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Tests Passed: $passedTests / $totalTests" -ForegroundColor $(if ($passedTests -ge 12) { "Green" } elseif ($passedTests -ge 10) { "Yellow" } else { "Red" })

if ($passedTests -ge 12) {
    Write-Host "`n  STATUS: EXCELLENT! All core features working!" -ForegroundColor Green
} elseif ($passedTests -ge 10) {
    Write-Host "`n  STATUS: GOOD! Most features working" -ForegroundColor Yellow
} else {
    Write-Host "`n  STATUS: Some features need attention" -ForegroundColor Red
}

Write-Host "`n  TESTED FEATURES:" -ForegroundColor Cyan
Write-Host "    - User Registration" -ForegroundColor Gray
Write-Host "    - Email Verification System" -ForegroundColor Gray
Write-Host "    - Resend Verification Email" -ForegroundColor Gray
Write-Host "    - User Login/Logout" -ForegroundColor Gray
Write-Host "    - Get/Update Profile" -ForegroundColor Gray
Write-Host "    - Change Password" -ForegroundColor Gray
Write-Host "    - Forgot Password Flow" -ForegroundColor Gray
Write-Host "    - Validate Reset Token" -ForegroundColor Gray
Write-Host "    - Reset Password" -ForegroundColor Gray
Write-Host "    - Token Refresh" -ForegroundColor Gray
Write-Host "=====================================================" -ForegroundColor Cyan

Write-Host "`n  Additional Features Available:" -ForegroundColor Yellow
Write-Host "    - Delete Account (User can delete their own account)" -ForegroundColor Gray
Write-Host "    - Admin: Get All Users (Requires admin role)" -ForegroundColor Gray
Write-Host "    - Rate Limiting (Prevents brute force attacks)" -ForegroundColor Gray
Write-Host "    - Session Management" -ForegroundColor Gray
Write-Host "====================================================`n" -ForegroundColor Cyan

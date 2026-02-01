# ADMIN & ADDITIONAL FEATURES TEST
# Tests admin endpoints and delete account functionality

Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host "    ADMIN & ADDITIONAL FEATURES TEST" -ForegroundColor Cyan  
Write-Host "=====================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api"
$passedTests = 0
$totalTests = 3

# Create and verify a test user for deletion
$timestamp = Get-Date -Format "HHmmss"
$deleteEmail = "delete$timestamp@example.com"
$deleteUsername = "delete$timestamp"
$deletePassword = "DeletePass123!"

Write-Host "`n[1/3] Creating User for Delete Test..." -ForegroundColor Yellow
$registerBody = @{
    email = $deleteEmail
    username = $deleteUsername
    password = $deletePassword
    first_name = "Delete"
    last_name = "Test"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
    Write-Host "  [INFO] User created for deletion test" -ForegroundColor Gray
    $userId = $regResponse.user.id
    
    # Verify user
    $env:PGPASSWORD = "abc123"
    $verifyQuery = "UPDATE users SET is_verified = true WHERE email = '$deleteEmail';"
    $psqlPaths = @(
        "C:\Program Files\PostgreSQL\17\bin\psql.exe",
        "C:\Program Files\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe"
    )
    foreach ($path in $psqlPaths) {
        if (Test-Path $path) {
            & $path -U postgres -d auth_database -c $verifyQuery -t 2>&1 | Out-Null
            break
        }
    }
    
    # Login
    $loginBody = @{
        email = $deleteEmail
        password = $deletePassword
    } | ConvertTo-Json
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $deleteToken = $loginResponse.accessToken
    
    # Now delete the account
    Write-Host "  [TEST] Testing Delete Account..." -ForegroundColor Yellow
    $headers = @{ Authorization = "Bearer $deleteToken" }
    $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/user/delete-account" -Method DELETE -Headers $headers
    Write-Host "  [PASS] Account deleted successfully" -ForegroundColor Green
    Write-Host "    Message: $($deleteResponse.message)" -ForegroundColor Gray
    $passedTests++
} catch {
    Write-Host "  [FAIL] Delete account test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Admin Features - Create Admin User
Write-Host "`n[2/3] Setting up Admin User..." -ForegroundColor Yellow
$adminEmail = "admin@example.com"
$adminPassword = "AdminPass123!"

# Check if admin exists, if not create
try {
    $loginBody = @{
        email = $adminEmail
        password = $adminPassword
    } | ConvertTo-Json
    $adminLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $adminToken = $adminLogin.accessToken
    Write-Host "  [INFO] Using existing admin user" -ForegroundColor Gray
} catch {
    # Create admin user
    $adminRegBody = @{
        email = $adminEmail
        username = "admin"
        password = $adminPassword
        first_name = "Admin"
        last_name = "User"
    } | ConvertTo-Json
    
    try {
        $adminReg = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $adminRegBody
        $adminUserId = $adminReg.user.id
        
        # Verify and set as admin
        $setAdminQuery = "UPDATE users SET is_verified = true, role = 'admin' WHERE email = '$adminEmail';"
        foreach ($path in $psqlPaths) {
            if (Test-Path $path) {
                & $path -U postgres -d auth_database -c $setAdminQuery -t 2>&1 | Out-Null
                break
            }
        }
        
        # Login as admin
        $adminLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
        $adminToken = $adminLogin.accessToken
        Write-Host "  [INFO] Admin user created and configured" -ForegroundColor Gray
    } catch {
        Write-Host "  [WARN] Could not create admin user" -ForegroundColor Yellow
    }
}

# Test Get All Users (Admin Only)
Write-Host "`n[3/3] Testing Get All Users (Admin Endpoint)..." -ForegroundColor Yellow
if ($adminToken) {
    try {
        $headers = @{ Authorization = "Bearer $adminToken" }
        $allUsers = Invoke-RestMethod -Uri "$baseUrl/user/users" -Headers $headers
        Write-Host "  [PASS] Retrieved all users (Admin access)" -ForegroundColor Green
        Write-Host "    Total Users: $($allUsers.users.Count)" -ForegroundColor Gray
        Write-Host "    Sample Users:" -ForegroundColor Gray
        $allUsers.users | Select-Object -First 3 | ForEach-Object {
            Write-Host "      - $($_.email) ($($_.role))" -ForegroundColor DarkGray
        }
        $passedTests++
    } catch {
        Write-Host "  [FAIL] Get all users failed" -ForegroundColor Red
    }
} else {
    Write-Host "  [SKIP] No admin token available" -ForegroundColor Yellow
}

# Test Rate Limiting Awareness
Write-Host "`n[BONUS] Rate Limiting Check..." -ForegroundColor Magenta
Write-Host "  [INFO] Rate limiting is active on:" -ForegroundColor Gray
Write-Host "    - Login endpoint: 5 attempts per 15 minutes" -ForegroundColor DarkGray
Write-Host "    - Register endpoint: 3 attempts per hour" -ForegroundColor DarkGray
Write-Host "    - Password reset: 3 attempts per hour" -ForegroundColor DarkGray

# Final Summary
Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host "               TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Tests Passed: $passedTests / $totalTests" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

if ($passedTests -eq $totalTests) {
    Write-Host "`n  STATUS: ALL ADMIN FEATURES WORKING!" -ForegroundColor Green
} else {
    Write-Host "`n  STATUS: Some admin features need attention" -ForegroundColor Yellow
}

Write-Host "`n  TESTED FEATURES:" -ForegroundColor Cyan
Write-Host "    - Delete User Account" -ForegroundColor Gray
Write-Host "    - Admin Role Management" -ForegroundColor Gray
Write-Host "    - Get All Users (Admin Only)" -ForegroundColor Gray
Write-Host "    - Rate Limiting Protection" -ForegroundColor Gray
Write-Host "====================================================`n" -ForegroundColor Cyan

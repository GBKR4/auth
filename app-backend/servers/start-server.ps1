# Persistent Server Startup Script
# This keeps the server running even if PowerShell windows are closed

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host ""
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  AUTHENTICATION SERVER - PERSISTENT MODE" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Kill any existing servers
Write-Host "Stopping any existing servers..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "Starting server on port 5000..." -ForegroundColor Green
Write-Host ""
Write-Host "Server Information:" -ForegroundColor Cyan
Write-Host "  • Port: 5000" -ForegroundColor White
Write-Host "  • Local Auth: http://localhost:5000/api/auth/login" -ForegroundColor White
Write-Host "  • Google OAuth: http://localhost:5000/api/auth/google" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Start server and keep window open
npm run dev

# If server stops, pause before closing
Write-Host ""
Write-Host "Server stopped. Press any key to exit..." -ForegroundColor Red
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

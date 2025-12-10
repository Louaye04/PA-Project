# Start Backend and Frontend Servers for Admin Dashboard Testing

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting BKH Shop Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ports are available
$backendPort = 5000
$frontendPort = 3000

Write-Host "Checking if ports are available..." -ForegroundColor Yellow
$backendInUse = Get-NetTCPConnection -LocalPort $backendPort -ErrorAction SilentlyContinue
$frontendInUse = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue

if ($backendInUse) {
    Write-Host "⚠️  Port $backendPort is already in use!" -ForegroundColor Red
    Write-Host "Please close the application using this port or change the PORT in backend/.env" -ForegroundColor Yellow
    Write-Host ""
}

if ($frontendInUse) {
    Write-Host "⚠️  Port $frontendPort is already in use!" -ForegroundColor Red
    Write-Host "Please close the application using this port" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Green
Write-Host " Starting Backend Server (Port 5000)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Start backend in a new terminal
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host 'Backend Server Starting...' -ForegroundColor Cyan; npm run start"

Write-Host "Backend server starting in new window..." -ForegroundColor Green
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Starting Frontend (Port 3000)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Start frontend in a new terminal
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host 'Frontend Starting...' -ForegroundColor Cyan; npm start"

Write-Host "Frontend starting in new window..." -ForegroundColor Green
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ✓ Servers Starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test Admin Login:" -ForegroundColor Magenta
Write-Host "  Email:    admin@gmail.com" -ForegroundColor White
Write-Host "  Password: Admin123" -ForegroundColor White
Write-Host ""
Write-Host "To test the users API directly:" -ForegroundColor Cyan
Write-Host "  http://localhost:5000/api/users/test" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

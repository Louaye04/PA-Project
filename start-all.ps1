# Start Both Backend and Frontend Servers
Write-Host "Starting Full Application Stack..." -ForegroundColor Cyan

# Start backend in background job
Write-Host "`nStarting Backend Server (Port 5000)..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location 'f:\ESST_Desktop\M1-S1\SSAD\TP\TP1\backend'
    node server.js
}

Write-Host "Backend server starting (Job ID: $($backendJob.Id))" -ForegroundColor Yellow

# Wait for backend to initialize
Start-Sleep -Seconds 3

# Test backend
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -ErrorAction Stop
    Write-Host "✓ Backend is running: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "⚠ Backend might still be starting..." -ForegroundColor Yellow
}

# Start frontend
Write-Host "`nStarting Frontend Server (Port 3000)..." -ForegroundColor Green
Set-Location "$PSScriptRoot\frontend"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Application is starting!" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan

# Start frontend (will block here)
npm start

# Cleanup on exit
Write-Host "`nStopping backend server..." -ForegroundColor Yellow
Stop-Job -Job $backendJob
Remove-Job -Job $backendJob

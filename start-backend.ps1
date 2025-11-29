# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
node server.js

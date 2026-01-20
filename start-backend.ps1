# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
# Run backend with NODE_ENV=development and ensure PORT for local dev
$env:NODE_ENV = 'development'
$env:PORT = '5000'
node server.js

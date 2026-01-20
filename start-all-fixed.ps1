# start-all-fixed.ps1
# Lance le backend et le frontend dans des processus séparés (Windows)
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "Starting backend in a new PowerShell window..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command', "$env:NODE_ENV='development'; $env:PORT='5000'; Set-Location -LiteralPath '$root\\backend'; node server.js"
) -WorkingDirectory "$root\backend" -WindowStyle Hidden

Start-Sleep -Seconds 2

Write-Host "Starting frontend in a new CMD window..." -ForegroundColor Cyan
$frontendArg = "/k cd /d `"$root\\frontend`" && npm start"
Start-Process -FilePath "cmd.exe" -ArgumentList $frontendArg -WorkingDirectory "$root\frontend" -WindowStyle Normal

Write-Host "Started backend and frontend. Backend: http://127.0.0.1:5000  Frontend: http://localhost:3000" -ForegroundColor Green

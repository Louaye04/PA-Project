# start-site.ps1
# Vérifie et démarre backend et frontend si nécessaire, puis ouvre le frontend
$projectRoot = Split-Path -Parent $PSScriptRoot

function Is-PortOpen($port) {
    $res = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
    return $res.TcpTestSucceeded
}

Write-Host "Project root: $projectRoot"

if (-not (Is-PortOpen 5000)) {
    Write-Host "Backend not listening on 5000 — starting backend..." -ForegroundColor Green
    Start-Process -FilePath 'powershell' -ArgumentList '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-Command',"Set-Location -LiteralPath '$projectRoot\\backend'; node server.js" -WorkingDirectory "$projectRoot\backend" -WindowStyle Hidden
} else {
    Write-Host "Backend already listening on 5000" -ForegroundColor Yellow
}

if (-not (Is-PortOpen 3000)) {
    Write-Host "Frontend not listening on 3000 — starting frontend..." -ForegroundColor Green
    Start-Process -FilePath 'powershell' -ArgumentList '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-Command',"Set-Location -LiteralPath '$projectRoot\\frontend'; npm start" -WorkingDirectory "$projectRoot\frontend" -WindowStyle Normal
} else {
    Write-Host "Frontend already listening on 3000" -ForegroundColor Yellow
}

Start-Sleep -Seconds 3

Write-Host "Opening frontend in default browser..."
Start-Process 'http://127.0.0.1:3000'

Write-Host "Checking backend health..."
try {
    $h = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/health' -TimeoutSec 5
    Write-Host "Backend health:" ($h | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "Health failed:" $_.Exception.Message
}

Write-Host "Checking frontend response..."
try {
    $s = (Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -Method Head -TimeoutSec 10).StatusCode
    Write-Host "Frontend HEAD status:" $s
} catch {
    Write-Host "Frontend HEAD failed:" $_.Exception.Message
}

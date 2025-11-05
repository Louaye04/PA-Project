# Start Both Servers Script
# Run this from the project root directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting E-Commerce Auth Platform" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param($Port)
    $connection = New-Object System.Net.Sockets.TcpClient
    try {
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Check if ports are available
if (Test-Port 5000) {
    Write-Host "⚠ Port 5000 is already in use!" -ForegroundColor Yellow
    Write-Host "  Please stop the process using port 5000 or change the backend port." -ForegroundColor Yellow
}

if (Test-Port 3000) {
    Write-Host "⚠ Port 3000 is already in use!" -ForegroundColor Yellow
    Write-Host "  Please stop the process using port 3000 or the frontend will use a different port." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Backend Server (Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '=== BACKEND SERVER ===' -ForegroundColor Cyan; npm run dev"

Write-Host "Waiting 3 seconds for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Starting Frontend Server (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '=== FRONTEND SERVER ===' -ForegroundColor Cyan; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Servers Starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:5000/api" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Your browser will open automatically." -ForegroundColor Cyan
Write-Host "Two terminal windows will open - keep them running!" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop: Close the terminal windows or press Ctrl+C in each." -ForegroundColor Gray
Write-Host ""

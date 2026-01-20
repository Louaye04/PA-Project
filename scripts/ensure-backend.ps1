Write-Output '--- Checking port 5000 ---'
$ownerPid = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
if ($ownerPid) { Write-Output "FOUND_PID:$ownerPid" } else { Write-Output 'NO_PID' }

Write-Output '--- Checking /api/health ---'
$healthOk = $false
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
  Write-Output 'HEALTH_OK'
  $r.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
  $healthOk = $true
} catch {
  Write-Output 'HEALTH_NO_RESPONSE'
}

if (-not $healthOk) {
  if ($ownerPid) {
    Write-Output "Killing PID $ownerPid (backend unresponsive)"
    try { Stop-Process -Id $ownerPid -Force -ErrorAction Stop; Write-Output 'KILLED_PID' } catch { Write-Output 'KILL_FAILED' }
  }
  Write-Output 'Attempting to start backend via start-backend.ps1'
  Start-Process -FilePath 'powershell' -ArgumentList '-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File','C:\Users\haffa\Downloads\TP1\start-backend.ps1' -WindowStyle Normal
  Start-Sleep -Seconds 4
  try {
    $r2 = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Output 'POST_START_HEALTH_OK'
    $r2.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
  } catch {
    Write-Output 'POST_START_HEALTH_NO_RESPONSE'
  }
}

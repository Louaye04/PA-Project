Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$ports = @(5000,3000,3001)
foreach($p in $ports){
  $lines = netstat -ano | Select-String ":$p"
  if($lines){
    $pids = $lines | ForEach-Object { ($_ -replace '^\s+','') -split '\s+' | Select-Object -Last 1 } | Sort-Object -Unique
    foreach($pid in $pids){
      if($pid -and $pid -ne '0'){
        Write-Output "Killing PID $pid on port $p"
        try{ taskkill /PID $pid /F } catch { Write-Output "Failed to kill $pid" }
      }
    }
  } else { Write-Output "No process on port $p" }
}

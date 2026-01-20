$root = "C:\Users\haffa\Downloads\TP1"
# Nettoyage rapide
if(Test-Path "$root\scripts\cleanup_ports.ps1"){ & "$root\scripts\cleanup_ports.ps1" }
Start-Sleep -Seconds 1
# Démarrer le backend si besoin
$backendListening = netstat -ano | Select-String ":5000\b"
if(-not $backendListening){
  $out = "$root\backend\server.out.log"
  $err = "$root\backend\server.err.log"
  $cmdBackend = "cd ""$root\\backend""; npm start > ""$out"" 2> ""$err"""
  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile","-WindowStyle","Hidden","-Command",$cmdBackend -WorkingDirectory "$root\backend"
  Write-Output "Backend starting (logs: $out, $err)"
} else { Write-Output "Backend already listening on :5000" }
# Démarrer le frontend si besoin
$frontendListening = netstat -ano | Select-String ":3000\b"
if(-not $frontendListening){
  $outf = "$root\frontend\frontend.out.log"
  $errf = "$root\frontend\frontend.err.log"
  $cmdFront = "cd ""$root\\frontend""; npx serve -s build -l 3000 > ""$outf"" 2> ""$errf"""
  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile","-WindowStyle","Hidden","-Command",$cmdFront -WorkingDirectory "$root\frontend"
  Write-Output "Frontend starting (logs: $outf, $errf)"
} else { Write-Output "Frontend already listening on :3000" }
Start-Sleep -Seconds 3
# Vérifications
try{ $hb = (Invoke-WebRequest http://localhost:5000/api/health -UseBasicParsing -TimeoutSec 5).Content; Write-Output "BACKEND_OK: $hb" } catch { Write-Output "BACKEND_ERR: $($_.Exception.Message)" }
try{ $hf = (Invoke-WebRequest http://localhost:3000 -UseBasicParsing -TimeoutSec 5).StatusCode; Write-Output "FRONTEND_STATUS: $hf" } catch { Write-Output "FRONTEND_ERR: $($_.Exception.Message)" }

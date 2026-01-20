Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)"
    if ($p) {
        Write-Output "PID:$($p.ProcessId)"
        if ($p.CommandLine) { Write-Output $p.CommandLine } else { Write-Output "(no commandline)" }
        Write-Output "----"
    }
}
try {
    $c = Get-NetTCPConnection -LocalPort 5000 -ErrorAction Stop | Select-Object LocalAddress,LocalPort,State,OwningProcess
    if ($c) { $c | Format-List }
} catch {
    Write-Output "No listener or error: $_"
}
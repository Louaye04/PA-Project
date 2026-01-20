param(
  [string]$orderId = '1766971322298'
)

Write-Host "Testing order access for orderId=$orderId" -ForegroundColor Cyan

# Helper: get token for email via existing script
function Get-Token($email) {
  $genScript = Join-Path $PSScriptRoot 'generate_token_for_user.js'
  $out = & node $genScript $email 2>&1
  if ($LASTEXITCODE -ne 0) { Write-Host ("Failed to generate token for {0}`n{1}" -f $email, ($out -join "`n")) -ForegroundColor Red; exit 1 }
  $json = ($out -join "`n") | Out-String
  try { $obj = $json | ConvertFrom-Json } catch { Write-Host "Failed to parse token JSON: $json" -ForegroundColor Red; exit 1 }
  return $obj.token
}

# Seller B (attacker)
$sellerBEmail = 'sellerb@example.local'
$tokenB = Get-Token $sellerBEmail

# Seller A (owner of the test order)
$sellerAEmail = 'hindkahla2@gmail.com'
$tokenA = Get-Token $sellerAEmail

function Test-GetOrder($token, $label) {
  Write-Host "\n[$label] Requesting GET /api/orders/$orderId" -ForegroundColor Yellow
  try {
    $resp = Invoke-WebRequest -Uri "http://localhost:5000/api/orders/$orderId" -Headers @{ Authorization = "Bearer $token" } -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "Status: $($resp.StatusCode)" -ForegroundColor Green
    Write-Host "Body: $($resp.Content)" -ForegroundColor White
  } catch {
    if ($_.Exception.Response) {
      $status = ($_.Exception.Response).StatusCode.value__
      $body = $_.Exception.Response.GetResponseStream() | %{ new-object System.IO.StreamReader($_) } | %{ $_.ReadToEnd() }
      Write-Host "Status: $status" -ForegroundColor Yellow
      Write-Host "Body: $body" -ForegroundColor White
    } else {
      Write-Host "Request failed: $_" -ForegroundColor Red
    }
  }
}

# Run tests
Test-GetOrder $tokenB "SellerB"
Test-GetOrder $tokenA "SellerA"

Write-Host "\nInterpretation:" -ForegroundColor Cyan
Write-Host "- Si SellerB obtient 404 -> OK (propriété vérifiée)" -ForegroundColor White
Write-Host "- Si SellerB obtient 200 -> FAIL (DAC broken)" -ForegroundColor Red
Write-Host "- SellerA devrait obtenir 200 et voir les détails" -ForegroundColor White

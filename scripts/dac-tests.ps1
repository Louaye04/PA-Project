<#
  dac-tests.ps1
  Script PowerShell pour tester la politique DAC du backend.

  Usage (exemples) :
    $env:TOKEN_SELLER_OWNER = '<TOKEN_SELLER_OWNER>'
    $env:TOKEN_SELLER_OTHER = '<TOKEN_SELLER_OTHER>'
    $env:TOKEN_BUYER = '<TOKEN_BUYER>'
    $env:TOKEN_ADMIN = '<TOKEN_ADMIN>'
    .\dac-tests.ps1

  Le script :
    - teste la création de produit par buyer (doit échouer 403)
    - crée un produit par seller owner (doit réussir 201)
    - tente suppression par autre seller (doit échouer 403)
    - supprime le produit par le seller owner (doit réussir 200)
    - appelle une route admin (DH cleanup) avec non-admin (doit échouer) puis admin (doit réussir)
#>

param()

$BASE = 'http://localhost:5000'

function Invoke-Status {
    param(
        [string]$Method = 'GET',
        [string]$Url,
        [hashtable]$Headers = @{},
        $Body = $null
    )
    try {
        $options = @{Uri=$Url; Method=$Method; Headers=$Headers; UseBasicParsing=$true}
        if ($Body) { $options.Add('Body', (ConvertTo-Json $Body -Depth 10)); $options.Add('ContentType','application/json') }
        $resp = Invoke-WebRequest @options -ErrorAction Stop
        return @{ ok=$true; status=$resp.StatusCode; raw=$resp }
    } catch [System.Net.WebException] {
        $r = $_.Exception.Response
        if ($r -ne $null) {
            $sc = [int]$r.StatusCode
            return @{ ok=$false; status=$sc; raw=$r }
        }
        return @{ ok=$false; status=0; raw=$_.Exception.Message }
    } catch {
        return @{ ok=$false; status=0; raw=$_.Exception.Message }
    }
}

function Show-Result {
    param($Label, $Result, $Expect)
    $status = $Result.status
    $ok = ($status -eq $Expect)
    Write-Host "[$(if($ok){ 'OK' } else { 'FAIL' })] $Label -> got $status, expect $Expect" -ForegroundColor $(if($ok){ 'Green' } else { 'Red' })
}

Write-Host "=== DAC Tests (base $BASE) ===" -ForegroundColor Cyan

# Préparer tokens depuis variables d'environnement
$TOK_SELLER_OWNER = $env:TOKEN_SELLER_OWNER
$TOK_SELLER_OTHER = $env:TOKEN_SELLER_OTHER
$TOK_BUYER = $env:TOKEN_BUYER
$TOK_ADMIN = $env:TOKEN_ADMIN

if (-not $TOK_SELLER_OWNER -or -not $TOK_SELLER_OTHER -or -not $TOK_BUYER -or -not $TOK_ADMIN) {
    Write-Host "Attention: définissez les variables d'environnement TOKEN_SELLER_OWNER, TOKEN_SELLER_OTHER, TOKEN_BUYER, TOKEN_ADMIN avant d'exécuter." -ForegroundColor Yellow
}

Write-Host "Test 1: GET /api/products (public)" -ForegroundColor White
$r = Invoke-Status -Url "$BASE/api/products"
Show-Result 'GET /api/products' $r 200

Write-Host "\nTest 2: POST /api/products en tant que BUYER (doit être 403)" -ForegroundColor White
$hdr = @{ Authorization = "Bearer $TOK_BUYER" }
$body = @{ name='DAC Test Product'; price=1; stock=1 }
$r = Invoke-Status -Method 'POST' -Url "$BASE/api/products" -Headers $hdr -Body $body
Show-Result 'POST /api/products (buyer)' $r 403

Write-Host "\nTest 3: POST /api/products en tant que SELLER_OWNER (doit être 201)" -ForegroundColor White
$hdr = @{ Authorization = "Bearer $TOK_SELLER_OWNER" }
$body = @{ name='DAC Test Product Owner'; price=10; stock=5 }
$r = Invoke-Status -Method 'POST' -Url "$BASE/api/products" -Headers $hdr -Body $body
if ($r.ok -and $r.status -eq 201) {
    $content = ($r.raw.Content | ConvertFrom-Json)
    $prodId = $content.data.id
    Write-Host "Created product id: $prodId" -ForegroundColor Green
} else {
    $prodId = $null
}
Show-Result 'POST /api/products (seller owner)' $r 201

Write-Host "\nTest 4: DELETE /api/products/:id en tant que SELLER_OTHER (doit être 403)" -ForegroundColor White
if ($prodId) {
    $hdr = @{ Authorization = "Bearer $TOK_SELLER_OTHER" }
    $r = Invoke-Status -Method 'DELETE' -Url "$BASE/api/products/$prodId" -Headers $hdr
    Show-Result "DELETE /api/products/$prodId (other seller)" $r 403
} else {
    Write-Host "Produit non créé, skip test 4" -ForegroundColor Yellow
}

Write-Host "\nTest 5: DELETE /api/products/:id en tant que SELLER_OWNER (doit être 200)" -ForegroundColor White
if ($prodId) {
    $hdr = @{ Authorization = "Bearer $TOK_SELLER_OWNER" }
    $r = Invoke-Status -Method 'DELETE' -Url "$BASE/api/products/$prodId" -Headers $hdr
    Show-Result "DELETE /api/products/$prodId (owner)" $r 200
} else {
    Write-Host "Produit non créé, skip test 5" -ForegroundColor Yellow
}

Write-Host "\nTest 6: POST /api/dh/cleanup en tant que NON-ADMIN (doit être 403)" -ForegroundColor White
$hdr = @{ Authorization = "Bearer $TOK_SELLER_OWNER" }
$r = Invoke-Status -Method 'POST' -Url "$BASE/api/dh/cleanup" -Headers $hdr
Show-Result 'POST /api/dh/cleanup (non-admin)' $r 403

Write-Host "\nTest 7: POST /api/dh/cleanup en tant que ADMIN (doit être 200/201/204)" -ForegroundColor White
$hdr = @{ Authorization = "Bearer $TOK_ADMIN" }
$r = Invoke-Status -Method 'POST' -Url "$BASE/api/dh/cleanup" -Headers $hdr
Show-Result 'POST /api/dh/cleanup (admin)' $r 200

Write-Host "\nTests terminés. Remplacez les tokens par vos tokens réels et relancez le script." -ForegroundColor Cyan

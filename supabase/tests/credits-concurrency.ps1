$ErrorActionPreference = 'Stop'
$env:SUPABASE_DB_PASSWORD = 'unused-api-only'
$testUser = [guid]::NewGuid().ToString()
$requestA = [guid]::NewGuid().ToString()
$requestB = [guid]::NewGuid().ToString()
$workspace = (Get-Location).Path
$files = @()
$jobs = @()
function Query([string]$sql) {
  $path = Join-Path $workspace ('supabase/tests/.concurrency-' + [guid]::NewGuid() + '.sql')
  [System.IO.File]::WriteAllText($path,$sql,[System.Text.UTF8Encoding]::new($false))
  try {
    $output = & npx supabase db query --linked --file $path
    if ($LASTEXITCODE -ne 0) { throw 'SQL query failed' }
    return (($output -join "`n") | ConvertFrom-Json).rows
  } finally { [System.IO.File]::Delete($path) }
}
try {
  Query "INSERT INTO auth.users(id) VALUES ('$testUser'); UPDATE public.generation_wallets SET balance=1 WHERE user_id='$testUser'; SELECT 'fixture created' AS result;" | Out-Null
  foreach ($id in @($requestA,$requestB)) {
    $path = Join-Path $workspace ('supabase/tests/.concurrency-' + $id + '.sql')
    $files += $path
    $sql = "BEGIN; CREATE TEMP TABLE reservation_outcome AS SELECT public.reserve_generation_credit('$testUser','$id',repeat('a',64)) AS result; SELECT pg_sleep(4); COMMIT; SELECT result FROM reservation_outcome;"
    [System.IO.File]::WriteAllText($path,$sql,[System.Text.UTF8Encoding]::new($false))
    $jobs += Start-Job -ArgumentList $workspace,$path -ScriptBlock {
      param($directory,$queryFile)
      Set-Location -LiteralPath $directory
      $env:SUPABASE_DB_PASSWORD='unused-api-only'
      $output = & npx supabase db query --linked --file $queryFile
      if ($LASTEXITCODE -ne 0) { throw 'Concurrent query failed' }
      (($output -join "`n") | ConvertFrom-Json).rows[0].result.status
    }
  }
  $jobs | Wait-Job -Timeout 45 | Out-Null
  $outcomes = @($jobs | Receive-Job -ErrorAction Stop)
  if (($outcomes | Where-Object { $_ -eq 'acquired' }).Count -ne 1 -or ($outcomes | Where-Object { $_ -eq 'busy' }).Count -ne 1) {
    throw "Unexpected concurrency outcomes: $outcomes"
  }
  $rows = Query "SELECT balance,(SELECT count(*) FROM public.generation_requests WHERE user_id='$testUser' AND status='reserved') AS reservations FROM public.generation_wallets WHERE user_id='$testUser';"
  if ($rows[0].balance -ne 0 -or $rows[0].reservations -ne 1) { throw 'Concurrent requests overspent the last credit' }
  Write-Output 'PASS: two independent database transactions raced for the last credit; exactly one acquired, one busy, balance zero.'
} finally {
  foreach ($job in $jobs) { if ($job.State -eq 'Running') { Stop-Job $job }; Remove-Job $job }
  Query "DELETE FROM auth.users WHERE id='$testUser'; SELECT 'test fixture removed' AS result;" | Out-Null
  foreach ($path in $files) { [System.IO.File]::Delete($path) }
}

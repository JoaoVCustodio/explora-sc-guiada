param([ValidateSet('preflight','verify','apply','test')][string]$Mode = 'verify')
$ErrorActionPreference = 'Stop'
# db query uses Management API; bypass CLI's unnecessary temporary-login setup.
$env:SUPABASE_DB_PASSWORD = 'unused-api-only'
$migration = Get-Content -Raw -Encoding utf8 'supabase/migrations/20260919000100_generation_credits.sql'
$tests = Get-Content -Raw -Encoding utf8 'supabase/tests/generation_credits.sql'
if ($Mode -eq 'preflight') {
  & npx supabase db query --linked --file supabase/tests/credits_preflight.sql
  exit $LASTEXITCODE
}
if ($Mode -eq 'test') {
  & npx supabase db query --linked --file supabase/tests/generation_credits.sql
  exit $LASTEXITCODE
}
$sql = if ($Mode -eq 'verify') {
  "BEGIN;`n" + $migration + "`n" + ($tests -replace '^--[^\r\n]*\r?\nBEGIN;', '')
} else {
  "BEGIN;`n" + $migration + "`nINSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20260919000100','generation_credits',ARRAY[`$migration`$" + $migration + "`$migration`$]);`nCOMMIT;"
}
$tempSql = Join-Path (Get-Location) ('supabase/tests/.credits-' + [guid]::NewGuid() + '.sql')
try {
  [System.IO.File]::WriteAllText($tempSql, $sql, [System.Text.UTF8Encoding]::new($false))
  & npx supabase db query --linked --file $tempSql
  $queryExit = $LASTEXITCODE
} finally { [System.IO.File]::Delete($tempSql) }
exit $queryExit

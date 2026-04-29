$ErrorActionPreference = "Stop"
. "$PSScriptRoot\..\local\common.ps1"

if (-not (Test-IsAdministrator)) {
  throw "PostgreSQL installation requires an elevated PowerShell session. Re-run this command as Administrator."
}

$packageId = "PostgreSQL.PostgreSQL.17"

Write-Host "==> installing PostgreSQL 17"
winget install --id $packageId --exact --silent --accept-package-agreements --accept-source-agreements

Write-Host ""
Write-Host "==> postgres install command completed"
Write-Host "Next steps:"
Write-Host "1. Verify a PostgreSQL service is present and running."
Write-Host "2. Install PostGIS for the same PostgreSQL major version."
Write-Host "3. Run npm run db:doctor."
Write-Host "4. Run npm run db:migrate."
Write-Host "5. Run npm run db:seed:sources."
Write-Host "6. Run npm run db:load:national."
Write-Host "7. Run npm run local:verify."

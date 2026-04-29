$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

Push-Location (Get-ProjectRoot)
try {
  if (-not (Wait-ForHttpOk -Url "http://127.0.0.1:3000/api/health" -TimeoutSeconds 90)) {
    throw "Local app is not healthy on http://127.0.0.1:3000."
  }

  $status = & powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\status.ps1" | ConvertFrom-Json

  if (-not $status.app.healthOk) {
    throw "Local app is not healthy on http://127.0.0.1:3000."
  }

  if (-not $status.app.listening -or -not $status.app.listenerPid) {
    throw "local:status did not report a live 3000 listener even though the app health check passed."
  }

  Write-Host "==> runtime health confirmed"
  Write-Host "App: $($status.app.url)"

  Write-Host ""
  Write-Host "==> running smoke checks"
  $env:SMOKE_BASE_URL = "http://127.0.0.1:3000"
  npm run qa:smoke
  Assert-LastExitCode -Context "Smoke validation"

  Write-Host ""
  Write-Host "==> running live API validation"
  npm run qa:validate-live-api
  Assert-LastExitCode -Context "Live API validation"

  Write-Host ""
  Write-Host "==> running home atlas cache validation"
  npm run qa:validate-home-atlas-cache
  Assert-LastExitCode -Context "Home atlas cache validation"

  Write-Host ""
  Write-Host "==> running zoom drilldown validation"
  npm run qa:validate-zoom-drilldown
  Assert-LastExitCode -Context "Zoom drilldown validation"

  Write-Host ""
  Write-Host "==> running zoom detail contract validation"
  npm run qa:validate-zoom-detail-contract
  Assert-LastExitCode -Context "Zoom detail contract validation"

  Write-Host ""
  Write-Host "==> running local marker rendering validation"
  npm run qa:validate-local-marker-rendering
  Assert-LastExitCode -Context "Local marker rendering validation"

  Write-Host ""
  Write-Host "==> running live label quality validation"
  npm run qa:validate-live-label-quality
  Assert-LastExitCode -Context "Live label quality validation"

  Write-Host ""
  Write-Host "==> running selected state contract validation"
  npm run qa:validate-selected-state-contract
  Assert-LastExitCode -Context "Selected state contract validation"

  Write-Host ""
  Write-Host "==> running detail summary validation"
  npm run qa:validate-detail-summary
  Assert-LastExitCode -Context "Detail summary validation"

  Write-Host ""
  Write-Host "==> running selection context contract validation"
  npm run qa:validate-selection-context-contract
  Assert-LastExitCode -Context "Selection context contract validation"

  Write-Host ""
  Write-Host "==> running local density contract validation"
  npm run qa:validate-local-density-contract
  Assert-LastExitCode -Context "Local density contract validation"

  Write-Host ""
  Write-Host "==> running local focus priority validation"
  npm run qa:validate-local-focus-priority
  Assert-LastExitCode -Context "Local focus priority validation"

  Write-Host ""
  Write-Host "==> running PFAS coverage note validation"
  npm run qa:validate-pfas-coverage-notes
  Assert-LastExitCode -Context "PFAS coverage note validation"

  Write-Host ""
  Write-Host "==> running no-browser interaction contract validation"
  npm run qa:validate-interaction-contract
  Assert-LastExitCode -Context "Interaction contract validation"

  $health = Get-AppHealth
  if (-not $health -and $status.api.health) {
    $health = $status.api.health
  }
  $repositoryHealth = if ($health -and $health.repository) {
    $health.repository
  } elseif ($health -and ($health.databaseCoreCounts -or $health.preferredCoreLayerSource -or $health.preferredDerivedLayerSource)) {
    $health
  } else {
    $null
  }
  $layerHealth = if ($health -and $health.layers) {
    $health.layers
  } else {
    $health
  }
  $databaseCoreCounts = if ($repositoryHealth -and $repositoryHealth.databaseCoreCounts) {
    $repositoryHealth.databaseCoreCounts
  } else {
    $null
  }
  $preferredCoreLayerSource = if ($repositoryHealth -and $repositoryHealth.preferredCoreLayerSource) {
    $repositoryHealth.preferredCoreLayerSource
  } else {
    $null
  }
  $preferredDerivedLayerSource = if ($repositoryHealth -and $repositoryHealth.preferredDerivedLayerSource) {
    $repositoryHealth.preferredDerivedLayerSource
  } else {
    $null
  }
  $databaseUri = Get-DatabaseUri
  $databaseReachable = if ($databaseUri) {
    Test-TcpPort -HostName $databaseUri.Host -Port $databaseUri.Port
  } else {
    $false
  }
  $databaseCoreReady = $false
  if ($databaseCoreCounts) {
    $databaseCoreReady = (
      [int]$databaseCoreCounts.industrialSites -gt 0 -and
      [int]$databaseCoreCounts.toxicReleaseRecords -gt 0 -and
      [int]$databaseCoreCounts.pfasSites -gt 0 -and
      [int]$databaseCoreCounts.wastewaterSites -gt 0 -and
      [int]$databaseCoreCounts.sourceRegistry -gt 0 -and
      $preferredCoreLayerSource -and
      $preferredCoreLayerSource.industrialSites -eq "database" -and
      $preferredCoreLayerSource.pfasSites -eq "database" -and
      $preferredCoreLayerSource.wastewaterSites -eq "database"
    )
  }

  $blockers = @()
  if (-not $databaseReachable) {
    $blockers += "No local PostGIS runtime is reachable on localhost:5432, so the app is still running in ETL-backed national mode."
  }

  if ($databaseReachable -and -not $databaseCoreReady) {
    $blockers += "The local database is reachable, but the core DB-backed atlas layers are not fully ready or still lose coverage to the ETL-backed fallback."
  }

  $summary = [ordered]@{
    appUrl = "http://127.0.0.1:3000"
    readyForLocalUse = [bool]$status.app.healthOk
    readyForFullLocalStack = ($databaseReachable -and $databaseCoreReady)
    dataMode = if ($databaseReachable -and $databaseCoreReady) { "database" } else { "etl-file" }
    totalEntities = if ($layerHealth -and $layerHealth.totalEntities) { $layerHealth.totalEntities } else { $null }
    totalLayers = if ($layerHealth -and $layerHealth.totalLayers) { $layerHealth.totalLayers } else { $null }
    databaseCoreCounts = $databaseCoreCounts
    preferredCoreLayerSource = $preferredCoreLayerSource
    preferredDerivedLayerSource = $preferredDerivedLayerSource
    blockers = $blockers
  }

  Write-Host ""
  Write-Host "==> release readiness"
  $summary | ConvertTo-Json -Depth 4
} finally {
  Pop-Location
}

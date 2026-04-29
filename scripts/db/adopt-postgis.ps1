param(
  [string]$SourceRoot,
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\..\local\common.ps1"

$paths = Get-PortablePostgresPaths

function Resolve-PostgisSourceRoot {
  param([string]$ExplicitSourceRoot)

  if ($ExplicitSourceRoot) {
    $resolved = Resolve-Path $ExplicitSourceRoot -ErrorAction Stop
    return $resolved.Path
  }

  foreach ($candidate in Get-PostgisInstalledRootCandidates) {
    if (Test-PostgisInstallRoot -RootPath $candidate) {
      return $candidate
    }
  }

  return $null
}

function Invoke-SafeCopyDirectory {
  param(
    [string]$SourceDir,
    [string]$DestinationDir
  )

  if (-not (Test-Path $SourceDir)) {
    throw "Missing source directory: $SourceDir"
  }

  if (-not (Test-Path $DestinationDir)) {
    New-Item -ItemType Directory -Path $DestinationDir | Out-Null
  }

  if ($WhatIf) {
    Write-Host "WHATIF copy $SourceDir -> $DestinationDir"
    return
  }

  robocopy $SourceDir $DestinationDir /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Robocopy failed while copying $SourceDir to $DestinationDir with exit code $LASTEXITCODE."
  }
}

$resolvedSourceRoot = Resolve-PostgisSourceRoot -ExplicitSourceRoot $SourceRoot
if (-not $resolvedSourceRoot) {
  $summary = [ordered]@{
    portablePostgresRoot = $paths.PostgresRoot
    sourceRoot = $null
    sourceDetected = $false
    blockers = @(
      "No PostGIS-enabled PostgreSQL root was found automatically.",
      "Pass -SourceRoot to a PostgreSQL install root that already contains share\\extension\\postgis.control and lib\\postgis*.dll."
    )
    nextSteps = @(
      "Install PostGIS into a PostgreSQL 17 x64 root.",
      "Re-run npm run db:adopt:postgis -- -SourceRoot <root>."
    )
  }

  $summary | ConvertTo-Json -Depth 6
  exit 1
}

$sourcePayloadStatus = Get-PostgisPayloadStatus -RootPath $resolvedSourceRoot
if (-not $sourcePayloadStatus.payloadReady) {
  $summary = [ordered]@{
    portablePostgresRoot = $paths.PostgresRoot
    sourceRoot = $resolvedSourceRoot
    sourceDetected = $true
    sourcePayload = $sourcePayloadStatus
    blockers = @(
      "The specified source root does not contain a usable PostGIS payload.",
      "Expected share\\extension\\postgis.control and lib\\postgis*.dll under the source root."
    )
    nextSteps = @(
      "Point -SourceRoot at a PostgreSQL install root that already has PostGIS installed.",
      "Then rerun npm run db:adopt:postgis."
    )
  }

  $summary | ConvertTo-Json -Depth 6
  exit 1
}

Invoke-SafeCopyDirectory -SourceDir (Join-Path $resolvedSourceRoot "share\extension") -DestinationDir $paths.ShareExtensionDir
Invoke-SafeCopyDirectory -SourceDir (Join-Path $resolvedSourceRoot "lib") -DestinationDir $paths.LibDir

$portablePayloadStatus = Get-PostgisPayloadStatus -RootPath $paths.PostgresRoot

$summary = [ordered]@{
  portablePostgresRoot = $paths.PostgresRoot
  sourceRoot = $resolvedSourceRoot
  sourceDetected = $true
  sourcePayload = $sourcePayloadStatus
  portablePayload = $portablePayloadStatus
  postgisFilesReady = $portablePayloadStatus.payloadReady
  nextSteps = @(
    "Run npm run db:bootstrap:portable.",
    "Run npm run db:migrate.",
    "Run npm run db:seed:sources.",
    "Run npm run db:load:national.",
    "Run npm run local:verify."
  )
}

$summary | ConvertTo-Json -Depth 6

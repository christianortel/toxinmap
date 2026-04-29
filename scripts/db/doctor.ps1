$ErrorActionPreference = "Stop"
. "$PSScriptRoot\..\local\common.ps1"

$databaseUri = Get-DatabaseUri
$isAdmin = Test-IsAdministrator
$portablePaths = Get-PortablePostgresPaths
$postgresServices = Get-Service | Where-Object {
  $_.Name -match "postgres|pgsql" -or $_.DisplayName -match "PostgreSQL|Postgres"
} | Select-Object Status, Name, DisplayName
$psql = Get-Command psql -ErrorAction SilentlyContinue
$portablePsqlPath = if (Test-Path $portablePaths.Psql) { $portablePaths.Psql } else { $null }
$postgresInstallRoot = if (Test-Path "C:\Program Files\PostgreSQL") {
  Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
} else {
  @()
}
$portableBinariesReady = Test-PortablePostgresBinariesAvailable
$portablePostgisStatus = Get-PostgisPayloadStatus -RootPath $portablePaths.PostgresRoot
$portablePostgisFilesReady = $portablePostgisStatus.payloadReady
$portablePostgisInstallerPresent = Test-Path $portablePaths.PostgisInstaller
$dbReachable = if ($databaseUri) {
  Test-TcpPort -HostName $databaseUri.Host -Port $databaseUri.Port
} else {
  $false
}

$blockers = @()
if (-not $databaseUri) {
  $blockers += "DATABASE_URL is not configured."
}
if (-not $dbReachable) {
  $blockers += "No PostgreSQL listener is reachable at localhost:5432."
}
if (-not $psql -and -not $portablePsqlPath) {
  $blockers += "The psql CLI is not installed or not on PATH."
}
if (-not $postgresServices) {
  $blockers += "No local PostgreSQL Windows service was found."
}
if (-not (Test-DockerAvailable)) {
  $blockers += "Docker is not available for automatic PostGIS startup."
}
if (-not $isAdmin) {
  $blockers += "The current PowerShell session is not elevated, so PostgreSQL service installation cannot complete from this shell."
}
if ($portableBinariesReady -and -not $portablePostgisFilesReady) {
  $blockers += "Portable PostgreSQL binaries are prepared under $($portablePaths.PostgresRoot), but PostGIS extension files are still missing there."
}
if (-not $portablePostgisInstallerPresent) {
  $blockers += "The official Windows PostGIS bundle is not downloaded at $($portablePaths.PostgisInstaller)."
}

$nextSteps = @()
if (-not $dbReachable) {
  $nextSteps += "Install PostgreSQL + PostGIS locally or expose a reachable Postgres instance at localhost:5432."
}
if ($portableBinariesReady -and -not $portablePostgisFilesReady) {
  $nextSteps += "Install PostGIS into any PostgreSQL 17 x64 root, or extract its payload there."
  $nextSteps += "Run npm run db:adopt:postgis -- -SourceRoot <root> to sync PostGIS files into $($portablePaths.PostgresRoot)."
  $nextSteps += "Run npm run db:bootstrap:portable."
}
if ((-not $portableBinariesReady) -or (-not $portablePostgisInstallerPresent)) {
  $nextSteps += "Run npm run db:bootstrap:portable -- -DownloadMissingArtifacts."
}
if (-not $isAdmin) {
  $nextSteps += "Open an elevated PowerShell session before attempting local PostgreSQL installation."
}
if ($dbReachable) {
  $nextSteps += "Run npm run db:migrate."
  $nextSteps += "Run npm run db:seed:sources."
  $nextSteps += "Run npm run db:load:national."
  $nextSteps += "Run npm run local:verify."
}

$summary = [ordered]@{
  databaseUrlConfigured = [bool]$databaseUri
  databaseHost = if ($databaseUri) { $databaseUri.Host } else { $null }
  databasePort = if ($databaseUri) { $databaseUri.Port } else { $null }
  databaseReachable = $dbReachable
  shellIsAdmin = $isAdmin
  dockerAvailable = Test-DockerAvailable
  psqlAvailable = [bool]$psql -or [bool]$portablePsqlPath
  psqlPath = if ($psql) { $psql.Source } else { $portablePsqlPath }
  postgresServices = @($postgresServices)
  postgresInstallRoots = @($postgresInstallRoot)
  portablePostgres = [ordered]@{
    postgresRoot = $portablePaths.PostgresRoot
    binariesReady = $portableBinariesReady
    psqlPath = $portablePsqlPath
    postgisInstaller = $portablePaths.PostgisInstaller
    postgisInstallerPresent = $portablePostgisInstallerPresent
    postgisPayload = $portablePostgisStatus
    postgisFilesReady = $portablePostgisFilesReady
    dataDir = $portablePaths.PortableDataDir
  }
  blockers = $blockers
  nextSteps = $nextSteps
}

$summary | ConvertTo-Json -Depth 6

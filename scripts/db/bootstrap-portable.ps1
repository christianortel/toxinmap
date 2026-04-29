param(
  [switch]$DownloadMissingArtifacts,
  [switch]$ResetDataDir
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\..\local\common.ps1"

$databaseConnection = Get-DatabaseConnectionInfo
$databaseUri = if ($databaseConnection) { $databaseConnection.uri } else { $null }
$paths = Get-PortablePostgresPaths
$postgresZipUrl = "https://get.enterprisedb.com/postgresql/postgresql-17.9-3-windows-x64-binaries.zip"
$postgisInstallerUrl = "https://ftp.postgresql.org/pub/postgis/pg17/v3.6.2/win64/postgis-bundle-pg17x64-setup-3.6.2-1.exe"

function Invoke-DownloadFile {
  param(
    [string]$Url,
    [string]$Destination
  )

  Write-Host "==> downloading $Url"
  curl.exe -L $Url -o $Destination | Out-Host
  Assert-LastExitCode "Download failed"
}

function Ensure-PortablePostgresArtifacts {
  if ($DownloadMissingArtifacts) {
    if (-not (Test-Path $paths.PostgresBinaryZip)) {
      Invoke-DownloadFile -Url $postgresZipUrl -Destination $paths.PostgresBinaryZip
    }

    if (-not (Test-Path $paths.PostgresRoot)) {
      Write-Host "==> extracting PostgreSQL binaries"
      if (Test-Path $paths.PostgresRoot) {
        Remove-Item -Recurse -Force $paths.PostgresRoot
      }
      Expand-Archive -Path $paths.PostgresBinaryZip -DestinationPath (Join-Path $paths.RuntimeDir "postgresql-bin") -Force
    }

    if (-not (Test-Path $paths.PostgisInstaller)) {
      Invoke-DownloadFile -Url $postgisInstallerUrl -Destination $paths.PostgisInstaller
    }
  }
}

function Ensure-PortableDbPrerequisites {
  $blockers = @()

  if (-not $databaseUri) {
    $blockers += "DATABASE_URL is not configured."
  }
  if (-not (Test-PortablePostgresBinariesAvailable)) {
    $blockers += "Portable PostgreSQL binaries are not ready under $($paths.PostgresRoot)."
  }
  if (-not (Test-Path $paths.PostgisInstaller)) {
    $blockers += "The official PostGIS bundle installer is not downloaded at $($paths.PostgisInstaller)."
  }
  if (-not (Test-PortablePostgisFilesAvailable)) {
    $blockers += "A valid PostGIS payload is not present under $($paths.PostgresRoot). The core control, SQL, or DLL files are missing or incomplete."
  }
  if ($databaseUri -and ($databaseUri.Host -ne "localhost" -or $databaseUri.Port -ne 5432)) {
    $blockers += "DATABASE_URL must point to localhost:5432 for the portable bootstrap path."
  }

  return $blockers
}

function Remove-PortableCluster {
  if (Test-Path $paths.PortableDataDir) {
    Remove-Item -Recurse -Force $paths.PortableDataDir
  }
}

function Invoke-PortablePgCommand {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  $env:PATH = "$($paths.BinDir);$env:PATH"
  & $FilePath @Arguments
  Assert-LastExitCode "Portable PostgreSQL command failed: $FilePath"
}

function Ensure-PortableClusterInitialized {
  if (Test-Path (Join-Path $paths.PortableDataDir "PG_VERSION")) {
    return
  }

  if (-not (Test-Path $paths.PortablePasswordFile)) {
    Set-Content -Path $paths.PortablePasswordFile -Value "postgres" -NoNewline
  }

  Write-Host "==> initializing portable PostgreSQL cluster"
  Invoke-PortablePgCommand -FilePath $paths.InitDb -Arguments @(
    "-D", $paths.PortableDataDir,
    "-U", "postgres",
    "-A", "password",
    "--pwfile=$($paths.PortablePasswordFile)",
    "-E", "UTF8"
  )
}

function Ensure-PortableClusterStarted {
  if (Test-TcpPort -HostName "localhost" -Port 5432) {
    return "already-running"
  }

  Write-Host "==> starting portable PostgreSQL cluster"
  Invoke-PortablePgCommand -FilePath $paths.PgCtl -Arguments @(
    "-D", $paths.PortableDataDir,
    "-l", $paths.PortableLog,
    "-o", "-p 5432 -h 127.0.0.1",
    "start"
  )

  $attempts = 0
  while ($attempts -lt 30) {
    if (Test-TcpPort -HostName "localhost" -Port 5432) {
      return "started"
    }
    Start-Sleep -Seconds 1
    $attempts += 1
  }

  throw "Portable PostgreSQL did not become reachable on localhost:5432."
}

function Ensure-PortableDatabaseExists {
  $dbName = $databaseConnection.databaseName
  if (-not $dbName) {
    throw "DATABASE_URL does not include a database name."
  }

  $env:PGPASSWORD = $databaseConnection.password
  $exists = & $paths.Psql -h "localhost" -p "5432" -U $databaseConnection.username -d "postgres" -tAc "SELECT 1 FROM pg_database WHERE datname = '$dbName';"
  Assert-LastExitCode "Portable psql database existence check failed"

  if (($exists | Out-String).Trim() -ne "1") {
    Write-Host "==> creating database $dbName"
    Invoke-PortablePgCommand -FilePath $paths.Createdb -Arguments @(
      "-h", "localhost",
      "-p", "5432",
      "-U", $databaseConnection.username,
      $dbName
    )
  }
}

function Ensure-PostgisExtension {
  $dbName = $databaseConnection.databaseName
  $env:PGPASSWORD = $databaseConnection.password
  & $paths.Psql -h "localhost" -p "5432" -U $databaseConnection.username -d $dbName -v "ON_ERROR_STOP=1" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
  Assert-LastExitCode "PostGIS extension creation failed"
}

Ensure-PortablePostgresArtifacts

if ($ResetDataDir) {
  Write-Host "==> resetting portable cluster data directory"
  Remove-PortableCluster
}

$portablePostgisStatus = Get-PostgisPayloadStatus -RootPath $paths.PostgresRoot
$blockers = Ensure-PortableDbPrerequisites
if ($blockers.Count -gt 0) {
  $summary = [ordered]@{
    portablePostgresRoot = $paths.PostgresRoot
    portablePostgresBinariesReady = Test-PortablePostgresBinariesAvailable
    portablePostgisInstallerPresent = Test-Path $paths.PostgisInstaller
    portablePostgisPayload = $portablePostgisStatus
    portablePostgisFilesReady = Test-PortablePostgisFilesAvailable
    portableDataDir = $paths.PortableDataDir
    blockers = @($blockers)
    nextSteps = @(
      "If PostgreSQL binaries are missing, rerun with -DownloadMissingArtifacts.",
      "Install PostGIS into any PostgreSQL 17 x64 root.",
      "Run npm run db:adopt:postgis -- -SourceRoot <root> to sync PostGIS files into $($paths.PostgresRoot).",
      "Rerun npm run db:bootstrap:portable once the PostGIS files are present."
    )
  }

  $summary | ConvertTo-Json -Depth 6
  exit 1
}

Ensure-PortableClusterInitialized
$startupMode = Ensure-PortableClusterStarted
Ensure-PortableDatabaseExists
Ensure-PostgisExtension

$summary = [ordered]@{
  portablePostgresRoot = $paths.PostgresRoot
  portableDataDir = $paths.PortableDataDir
  startupMode = $startupMode
  databaseReachable = Test-TcpPort -HostName "localhost" -Port 5432
  postgisControlPresent = Test-Path $paths.PostgisControl
  postgisFilesReady = Test-PortablePostgisFilesAvailable
  nextSteps = @(
    "Run npm run db:migrate.",
    "Run npm run db:seed:sources.",
    "Run npm run db:load:national.",
    "Run npm run local:verify."
  )
}

$summary | ConvertTo-Json -Depth 6

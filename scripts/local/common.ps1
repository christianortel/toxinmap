$ErrorActionPreference = "Stop"

function Get-ProjectRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-LocalRuntimeDirectory {
  $runtimeDir = Join-Path (Get-ProjectRoot) ".local"
  if (-not (Test-Path $runtimeDir)) {
    New-Item -ItemType Directory -Path $runtimeDir | Out-Null
  }
  return $runtimeDir
}

function Get-PortablePostgresPaths {
  $runtimeDir = Ensure-LocalRuntimeDirectory
  $postgresRoot = Join-Path $runtimeDir "postgresql-bin\pgsql"
  $binDir = Join-Path $postgresRoot "bin"
  $shareExtensionDir = Join-Path $postgresRoot "share\extension"
  $libDir = Join-Path $postgresRoot "lib"

  return @{
    RuntimeDir = $runtimeDir
    PostgresBinaryZip = Join-Path $runtimeDir "postgresql-17.9-windows-x64-binaries.zip"
    PostgresInstaller = Join-Path $runtimeDir "postgresql-17.9-3-windows-x64.exe"
    PostgisInstaller = Join-Path $runtimeDir "postgis-bundle-pg17x64-setup-3.6.2-1.exe"
    PostgresRoot = $postgresRoot
    BinDir = $binDir
    InitDb = Join-Path $binDir "initdb.exe"
    PgCtl = Join-Path $binDir "pg_ctl.exe"
    Psql = Join-Path $binDir "psql.exe"
    Createdb = Join-Path $binDir "createdb.exe"
    Dropdb = Join-Path $binDir "dropdb.exe"
    PgIsReady = Join-Path $binDir "pg_isready.exe"
    ShareExtensionDir = $shareExtensionDir
    LibDir = $libDir
    PostgisControl = Join-Path $shareExtensionDir "postgis.control"
    PortableDataDir = Join-Path $runtimeDir "postgres-data"
    PortableLog = Join-Path $runtimeDir "postgres-portable.log"
    PortablePasswordFile = Join-Path $runtimeDir "postgres-password.txt"
  }
}

function Test-PortablePostgresBinariesAvailable {
  $paths = Get-PortablePostgresPaths
  return (
    (Test-Path $paths.PostgresRoot) -and
    (Test-Path $paths.InitDb) -and
    (Test-Path $paths.PgCtl) -and
    (Test-Path $paths.Psql)
  )
}

function Get-PostgisPayloadStatus {
  param([string]$RootPath)

  $extensionDir = Join-Path $RootPath "share\extension"
  $libDir = Join-Path $RootPath "lib"
  $controlPath = Join-Path $extensionDir "postgis.control"
  $coreSql = Get-ChildItem (Join-Path $extensionDir "postgis--*.sql") -ErrorAction SilentlyContinue |
    Sort-Object Length -Descending |
    Select-Object -First 1
  $coreDll = Get-ChildItem (Join-Path $libDir "postgis-3.dll") -ErrorAction SilentlyContinue |
    Select-Object -First 1
  $rasterDll = Get-ChildItem (Join-Path $libDir "postgis_raster-3.dll") -ErrorAction SilentlyContinue |
    Select-Object -First 1
  $topologyDll = Get-ChildItem (Join-Path $libDir "postgis_topology-3.dll") -ErrorAction SilentlyContinue |
    Select-Object -First 1

  $coreDllLooksReal = $null -ne $coreDll -and $coreDll.Length -gt 100000
  $controlLooksReal = (Test-Path $controlPath) -and ((Get-Item $controlPath).Length -gt 50)
  $coreSqlLooksReal = $null -ne $coreSql -and $coreSql.Length -gt 100000

  return [ordered]@{
    rootPath = $RootPath
    controlPath = $controlPath
    controlPresent = Test-Path $controlPath
    controlLength = if (Test-Path $controlPath) { (Get-Item $controlPath).Length } else { $null }
    coreSqlPath = if ($coreSql) { $coreSql.FullName } else { $null }
    coreSqlPresent = $null -ne $coreSql
    coreSqlLength = if ($coreSql) { $coreSql.Length } else { $null }
    coreDllPath = if ($coreDll) { $coreDll.FullName } else { $null }
    coreDllPresent = $null -ne $coreDll
    coreDllLength = if ($coreDll) { $coreDll.Length } else { $null }
    rasterDllPresent = $null -ne $rasterDll
    topologyDllPresent = $null -ne $topologyDll
    payloadReady = $controlLooksReal -and $coreSqlLooksReal -and $coreDllLooksReal
  }
}

function Test-PortablePostgisFilesAvailable {
  $paths = Get-PortablePostgresPaths
  return (Get-PostgisPayloadStatus -RootPath $paths.PostgresRoot).payloadReady
}

function Get-PostgisInstalledRootCandidates {
  $candidates = New-Object System.Collections.Generic.List[string]

  $programFilesRoot = "C:\Program Files\PostgreSQL"
  if (Test-Path $programFilesRoot) {
    Get-ChildItem $programFilesRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      $candidates.Add($_.FullName)
    }
  }

  $localProgramsRoot = Join-Path $env:LOCALAPPDATA "Programs"
  if (Test-Path $localProgramsRoot) {
    Get-ChildItem $localProgramsRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      if ($_.Name -match "Postgre|pgsql|postgis") {
        $candidates.Add($_.FullName)
      }
    }
  }

  $portableRoot = (Get-PortablePostgresPaths).PostgresRoot
  if ($portableRoot) {
    $candidates.Add($portableRoot)
  }

  return $candidates | Select-Object -Unique
}

function Test-PostgisInstallRoot {
  param([string]$RootPath)

  if (-not $RootPath -or -not (Test-Path $RootPath)) {
    return $false
  }

  return (Get-PostgisPayloadStatus -RootPath $RootPath).payloadReady
}

function Get-ManagedRuntimePaths {
  $runtimeDir = Ensure-LocalRuntimeDirectory
  return @{
    RuntimeDir = $runtimeDir
    PidFile = Join-Path $runtimeDir "toxinmap-app.pid"
    ModeFile = Join-Path $runtimeDir "toxinmap-app.mode"
    StdOutLog = Join-Path $runtimeDir "toxinmap-app.out.log"
    StdErrLog = Join-Path $runtimeDir "toxinmap-app.err.log"
    LoadProgress = Join-Path $runtimeDir "db-load-progress.json"
  }
}

function Get-ManagedAppPid {
  $paths = Get-ManagedRuntimePaths
  if (-not (Test-Path $paths.PidFile)) {
    return $null
  }

  $pidText = (Get-Content $paths.PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (-not $pidText) {
    return $null
  }

  $pidText = "$pidText".Trim()
  if (-not $pidText) {
    return $null
  }

  $parsedPid = 0
  if (-not [int]::TryParse($pidText, [ref]$parsedPid)) {
    return $null
  }

  if (-not (Get-Process -Id $parsedPid -ErrorAction SilentlyContinue)) {
    return $null
  }

  return $parsedPid
}

function Get-EnvFileCandidates {
  $projectRoot = Get-ProjectRoot
  return @(
    (Join-Path $projectRoot ".env.local"),
    (Join-Path $projectRoot ".env"),
    (Join-Path $projectRoot ".env.example")
  )
}

function Read-LocalEnv {
  $envMap = @{}

  foreach ($candidate in Get-EnvFileCandidates) {
    if (-not (Test-Path $candidate)) {
      continue
    }

    foreach ($line in Get-Content $candidate) {
      $trimmed = $line.Trim()
      if (-not $trimmed -or $trimmed.StartsWith("#")) {
        continue
      }

      $separatorIndex = $trimmed.IndexOf("=")
      if ($separatorIndex -lt 1) {
        continue
      }

      $key = $trimmed.Substring(0, $separatorIndex).Trim()
      $value = $trimmed.Substring($separatorIndex + 1).Trim()
      if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
      ) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      if (-not $envMap.ContainsKey($key)) {
        $envMap[$key] = $value
      }
    }
  }

  return $envMap
}

function Set-ProcessEnvFromLocalFiles {
  $envMap = Read-LocalEnv
  foreach ($entry in $envMap.GetEnumerator()) {
    $existingValue = [System.Environment]::GetEnvironmentVariable($entry.Key, "Process")
    if ([string]::IsNullOrWhiteSpace($existingValue)) {
      Set-Item -Path "Env:$($entry.Key)" -Value $entry.Value
    }
  }

  return $envMap
}

function Normalize-ProcessPathEnvironment {
  $processVariables = [System.Environment]::GetEnvironmentVariables("Process")
  $pathValue = $null

  foreach ($candidateKey in @("Path", "PATH")) {
    if ($processVariables.Contains($candidateKey)) {
      $candidateValue = [string]$processVariables[$candidateKey]
      if (-not [string]::IsNullOrWhiteSpace($candidateValue) -and -not $pathValue) {
        $pathValue = $candidateValue
      }

      [System.Environment]::SetEnvironmentVariable($candidateKey, $null, "Process")
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($pathValue)) {
    [System.Environment]::SetEnvironmentVariable("Path", $pathValue, "Process")
  }
}

function Get-ProcessPathEnvironmentSnapshot {
  $processVariables = [System.Environment]::GetEnvironmentVariables("Process")
  return [pscustomobject]@{
    PathValue = if ($processVariables.Contains("Path")) { [string]$processVariables["Path"] } else { $null }
    UpperPathValue = if ($processVariables.Contains("PATH")) { [string]$processVariables["PATH"] } else { $null }
  }
}

function Restore-ProcessPathEnvironment {
  param([psobject]$Snapshot)

  [System.Environment]::SetEnvironmentVariable("Path", $Snapshot.PathValue, "Process")
  [System.Environment]::SetEnvironmentVariable("PATH", $Snapshot.UpperPathValue, "Process")
}

function Invoke-WithNormalizedProcessPath {
  param([scriptblock]$ScriptBlock)

  $snapshot = Get-ProcessPathEnvironmentSnapshot
  Normalize-ProcessPathEnvironment
  try {
    & $ScriptBlock
  } finally {
    Restore-ProcessPathEnvironment -Snapshot $snapshot
  }
}

function Get-LoggedCommandExitCode {
  param(
    [string]$LogPath,
    [string]$Marker = "__TOXINMAP_EXITCODE__="
  )

  if (-not (Test-Path $LogPath)) {
    return $null
  }

  $matches = Select-String -Path $LogPath -Pattern ([regex]::Escape($Marker) + "(-?\d+)") -AllMatches -ErrorAction SilentlyContinue
  if (-not $matches) {
    return $null
  }

  $lastMatch = $matches | Select-Object -Last 1
  if (-not $lastMatch.Matches.Count) {
    return $null
  }

  return [int]$lastMatch.Matches[0].Groups[1].Value
}

function Get-DatabaseUri {
  $envMap = Set-ProcessEnvFromLocalFiles
  $databaseUrl = $env:DATABASE_URL
  if (-not $databaseUrl -and $envMap.ContainsKey("DATABASE_URL")) {
    $databaseUrl = $envMap["DATABASE_URL"]
  }

  if (-not $databaseUrl) {
    return $null
  }

  return [System.Uri]$databaseUrl
}

function Get-DatabaseConnectionInfo {
  $envMap = Set-ProcessEnvFromLocalFiles
  $databaseUrl = $env:DATABASE_URL
  if (-not $databaseUrl -and $envMap.ContainsKey("DATABASE_URL")) {
    $databaseUrl = $envMap["DATABASE_URL"]
  }

  if (-not $databaseUrl) {
    return $null
  }

  $uri = [System.Uri]$databaseUrl
  $username = $null
  $password = $null
  if ($uri.UserInfo) {
    $parts = $uri.UserInfo.Split(":", 2)
    if ($parts.Length -ge 1) {
      $username = [System.Uri]::UnescapeDataString($parts[0])
    }
    if ($parts.Length -ge 2) {
      $password = [System.Uri]::UnescapeDataString($parts[1])
    }
  }

  return [ordered]@{
    databaseUrl = $databaseUrl
    uri = $uri
    username = $username
    password = $password
    databaseName = $uri.AbsolutePath.TrimStart("/")
  }
}

function Test-TcpPort {
  param(
    [string]$HostName,
    [int]$Port
  )

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $asyncResult = $client.BeginConnect($HostName, $Port, $null, $null)
    $connected = $asyncResult.AsyncWaitHandle.WaitOne(1500, $false)
    if (-not $connected) {
      $client.Close()
      return $false
    }

    $client.EndConnect($asyncResult)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

function Test-DockerAvailable {
  return $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
}

function Get-PortListener {
  param([int]$Port)

  try {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
      Select-Object -First 1
    if ($listener) {
      return $listener
    }
  } catch {
  }

  $netstatPath = Join-Path $env:SystemRoot "System32\netstat.exe"
  $netstatCommand = if (Test-Path $netstatPath) { $netstatPath } else { "netstat" }
  $netstatLines = & $netstatCommand -ano -p TCP 2>$null
  foreach ($line in $netstatLines) {
    $trimmed = "$line".Trim()
    if (-not $trimmed.StartsWith("TCP")) {
      continue
    }

    $parts = $trimmed -split "\s+"
    if ($parts.Length -lt 5) {
      continue
    }

    $localEndpoint = $parts[1]
    $state = $parts[3]
    $owningProcess = $parts[4]
    if ($state -ne "LISTENING") {
      continue
    }

    $endpointMatch = [regex]::Match($localEndpoint, ":(\d+)$")
    if (-not $endpointMatch.Success) {
      continue
    }

    $localPort = [int]$endpointMatch.Groups[1].Value
    if ($localPort -ne $Port) {
      continue
    }

    $localAddress = $localEndpoint.Substring(0, $localEndpoint.Length - $endpointMatch.Value.Length)
    return [pscustomobject]@{
      LocalAddress = $localAddress
      LocalPort = $localPort
      State = "Listen"
      OwningProcess = [int]$owningProcess
      Source = "netstat"
    }
  }

  return $null
}

function Get-ProcessInfo {
  param([int]$ProcessId)

  if (-not $ProcessId) {
    return $null
  }

  return Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
}

function Test-ToxinmapProcess {
  param([int]$ProcessId)

  if (-not $ProcessId) {
    return $false
  }

  $commandLine = Get-ProcessCommandLine -ProcessId $ProcessId
  if (-not $commandLine) {
    return $false
  }

  return ($commandLine -match "Toxin-Environment-Map" -or $commandLine -match "next\\dist\\bin\\next")
}

function Get-ProcessCommandLine {
  param([int]$ProcessId)

  $process = Get-ProcessInfo -ProcessId $ProcessId
  return $process.CommandLine
}

function Get-ToxinmapRelatedPids {
  $paths = Get-ManagedRuntimePaths
  $related = New-Object System.Collections.Generic.HashSet[int]

  $rawManagedPid = $null
  if (Test-Path $paths.PidFile) {
    $pidText = (Get-Content $paths.PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    $parsedPid = 0
    if ($pidText -and [int]::TryParse("$pidText".Trim(), [ref]$parsedPid)) {
      $rawManagedPid = $parsedPid
    }
  }

  $listener = Get-PortListener -Port 3000
  $listenerPid = if ($listener) { [int]$listener.OwningProcess } else { $null }

  foreach ($candidatePid in @($rawManagedPid, $listenerPid)) {
    if (-not $candidatePid) {
      continue
    }

    $candidateInfo = Get-ProcessInfo -ProcessId $candidatePid
    if (-not $candidateInfo) {
      continue
    }

    if (Test-ToxinmapProcess -ProcessId $candidatePid) {
      [void]$related.Add($candidatePid)
    }

    $parentPid = [int]$candidateInfo.ParentProcessId
    if ($parentPid -and (Test-ToxinmapProcess -ProcessId $parentPid)) {
      [void]$related.Add($parentPid)
    }

    Get-CimInstance Win32_Process -Filter "ParentProcessId = $candidatePid" -ErrorAction SilentlyContinue | ForEach-Object {
      if (Test-ToxinmapProcess -ProcessId ([int]$_.ProcessId)) {
        [void]$related.Add([int]$_.ProcessId)
      }
    }
  }

  return @($related)
}

function Stop-ManagedToxinmapApp {
  $paths = Get-ManagedRuntimePaths
  $stoppedPids = @()

  $pidsToStop = Get-ToxinmapRelatedPids
  foreach ($processIdToStop in ($pidsToStop | Sort-Object -Descending)) {
    if ((Get-Process -Id $processIdToStop -ErrorAction SilentlyContinue)) {
      Stop-Process -Id $processIdToStop -Force -ErrorAction SilentlyContinue
      $stoppedPids += $processIdToStop
    }
  }

  if (Test-Path $paths.PidFile) {
    Remove-Item $paths.PidFile -ErrorAction SilentlyContinue
  }

  return $stoppedPids
}

function Ensure-PortableDatabaseAvailability {
  $paths = Get-PortablePostgresPaths
  if (-not (Test-PortablePostgresBinariesAvailable)) {
    return $null
  }

  if (-not (Test-PortablePostgisFilesAvailable)) {
    return $null
  }

  $bootstrapScript = Join-Path (Get-ProjectRoot) "scripts\db\bootstrap-portable.ps1"
  if (-not (Test-Path $bootstrapScript)) {
    return $null
  }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $bootstrapScript | Out-Host
  if ($LASTEXITCODE -ne 0) {
    return @{
      Available = $false
      Mode = "portable-bootstrap-failed"
      Message = "Portable PostgreSQL bootstrap failed."
    }
  }

  $databaseUri = Get-DatabaseUri
  if ($databaseUri -and (Test-TcpPort -HostName $databaseUri.Host -Port $databaseUri.Port)) {
    return @{
      Available = $true
      Mode = "portable"
      Message = "Local PostGIS started through the repo portable PostgreSQL runtime."
    }
  }

  return @{
    Available = $false
    Mode = "portable-unreachable"
    Message = "Portable PostgreSQL bootstrap completed, but the database listener is still unreachable."
  }
}

function Ensure-DatabaseAvailability {
  $databaseUri = Get-DatabaseUri
  if (-not $databaseUri) {
    return @{
      Available = $false
      Mode = "missing-env"
      Message = "DATABASE_URL is not configured."
    }
  }

  if (Test-TcpPort -HostName $databaseUri.Host -Port $databaseUri.Port) {
    return @{
      Available = $true
      Mode = "existing"
      Message = "Database listener is already reachable."
    }
  }

  $portableDatabaseStatus = Ensure-PortableDatabaseAvailability
  if ($portableDatabaseStatus) {
    return $portableDatabaseStatus
  }

  if (-not (Test-DockerAvailable)) {
    return @{
      Available = $false
      Mode = "missing-docker"
      Message = "Docker is not installed, so the local PostGIS service cannot be started automatically."
    }
  }

  Push-Location (Get-ProjectRoot)
  try {
    docker compose up -d postgis | Out-Host
  } finally {
    Pop-Location
  }

  $attempts = 0
  while ($attempts -lt 30) {
    if (Test-TcpPort -HostName $databaseUri.Host -Port $databaseUri.Port) {
      return @{
        Available = $true
        Mode = "docker"
        Message = "Local PostGIS started through docker compose."
      }
    }

    Start-Sleep -Seconds 2
    $attempts += 1
  }

  return @{
    Available = $false
    Mode = "startup-timeout"
    Message = "Local PostGIS did not become reachable after docker compose startup."
  }
}

function Wait-ForHttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 90,
    [int]$RequestTimeoutSeconds = 15
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $RequestTimeoutSeconds
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 800
    }
  }

  return $false
}

function Get-AppHealth {
  param(
    [string]$BaseUrl = "http://127.0.0.1:3000",
    [int]$Attempts = 3,
    [int]$TimeoutSeconds = 20
  )

  for ($attempt = 0; $attempt -lt $Attempts; $attempt += 1) {
    try {
      $response = Invoke-WebRequest -Uri "$BaseUrl/api/health" -UseBasicParsing -TimeoutSec $TimeoutSeconds
      return $response.Content | ConvertFrom-Json
    } catch {
      if ($attempt -lt ($Attempts - 1)) {
        Start-Sleep -Milliseconds 700
      }
    }
  }

  return $null
}

function Assert-LastExitCode {
  param(
    [string]$Context = "Command"
  )

  if ($LASTEXITCODE -ne 0) {
    throw "$Context failed with exit code $LASTEXITCODE."
  }
}

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

$paths = Get-ManagedRuntimePaths
$envMap = Set-ProcessEnvFromLocalFiles
$databaseUri = Get-DatabaseUri
$health = Get-AppHealth
$listener = Get-PortListener -Port 3000
$managedPid = Get-ManagedAppPid
$runtimeMode = if (Test-Path $paths.ModeFile) {
  $modeValue = Get-Content $paths.ModeFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -ne $modeValue) { [string]$modeValue } else { $null }
} else {
  $null
}
$listenerPid = if ($listener) { [int]$listener.OwningProcess } else { $null }
$listenerIsToxinmap = if ($listenerPid) { Test-ToxinmapProcess -ProcessId $listenerPid } else { $false }

if ($listenerIsToxinmap -and $listenerPid -and $managedPid -ne $listenerPid) {
  $managedPid = $listenerPid
  Set-Content -Path $paths.PidFile -Value $listenerPid
} elseif (-not $managedPid -and $listenerIsToxinmap) {
  $managedPid = $listenerPid
  Set-Content -Path $paths.PidFile -Value $listenerPid
}

$nearbyProbe = $null
if ($health) {
  for ($attempt = 0; $attempt -lt 3 -and -not $nearbyProbe; $attempt += 1) {
    try {
      $nearbyResponse = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/nearby?lat=34.2257&lng=-77.9447&radius=50&label=Cape%20Fear" -UseBasicParsing -TimeoutSec 20
      $nearbyProbe = $nearbyResponse.Content | ConvertFrom-Json
    } catch {
      Start-Sleep -Milliseconds 600
      $nearbyProbe = $null
    }
  }
}

$status = [ordered]@{
  app = [ordered]@{
    url = "http://127.0.0.1:3000"
    listening = [bool]$listener
    listenerPid = $listenerPid
    managedPid = $managedPid
    runtimeMode = $runtimeMode
    healthOk = [bool]$health
  }
  database = [ordered]@{
    configured = [bool]$databaseUri
    host = if ($databaseUri) { $databaseUri.Host } else { $null }
    port = if ($databaseUri) { $databaseUri.Port } else { $null }
    reachable = if ($databaseUri) { Test-TcpPort -HostName $databaseUri.Host -Port $databaseUri.Port } else { $false }
    dockerAvailable = Test-DockerAvailable
  }
  api = [ordered]@{
    health = if ($health) {
      [ordered]@{
        totalEntities = $health.layers.totalEntities
        totalLayers = $health.layers.totalLayers
        databaseConfigured = $health.repository.databaseConfigured
        sourceRegistrySeeded = $health.repository.sourceRegistrySeeded
        databaseCoreCounts = $health.repository.databaseCoreCounts
        preferredCoreLayerSource = $health.repository.preferredCoreLayerSource
        preferredDerivedLayerSource = $health.repository.preferredDerivedLayerSource
      }
    } else {
      $null
    }
    nearbyProbe = if ($nearbyProbe) {
      [ordered]@{
        total = $nearbyProbe.total
        groupedCounts = $nearbyProbe.groupedCounts.Count
        summaryLines = $nearbyProbe.summaryLines
      }
    } else {
      $null
    }
  }
  files = [ordered]@{
    stdoutLog = $paths.StdOutLog
    stderrLog = $paths.StdErrLog
    loadProgress = $paths.LoadProgress
    modeFile = $paths.ModeFile
  }
}

$status | ConvertTo-Json -Depth 6

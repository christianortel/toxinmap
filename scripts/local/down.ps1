param(
  [switch]$StopDatabase
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

$paths = Get-ManagedRuntimePaths

Write-Host "==> stopping managed toxinmap app"
$stoppedPids = Stop-ManagedToxinmapApp
if ($stoppedPids.Count -gt 0) {
  Write-Host "Stopped processes: $($stoppedPids -join ', ')"
} else {
  Write-Host "No managed toxinmap app process found."
}

if ($StopDatabase -and (Test-DockerAvailable)) {
  Push-Location (Get-ProjectRoot)
  try {
    Write-Host ""
    Write-Host "==> stopping docker postgis service"
    docker compose stop postgis | Out-Host
  } finally {
    Pop-Location
  }
} elseif ($StopDatabase) {
  Write-Host "Docker is not available, so no managed database service was stopped."
}

if (Test-Path $paths.PidFile) {
  Remove-Item $paths.PidFile -Force -ErrorAction SilentlyContinue
}

if (Test-Path $paths.ModeFile) {
  Remove-Item $paths.ModeFile -Force -ErrorAction SilentlyContinue
}

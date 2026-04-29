param(
  [switch]$SkipBuild,
  [switch]$AllowDegradedWithoutDb
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

$projectRoot = Get-ProjectRoot
$paths = Get-ManagedRuntimePaths
$nodePath = (Get-Command node -ErrorAction Stop).Source
$cmdPath = (Get-Command cmd.exe -ErrorAction Stop).Source

Write-Host "==> toxinmap local runtime"
Write-Host "Project root: $projectRoot"

Write-Host ""
Write-Host "==> stopping existing managed app"
$stoppedPids = Stop-ManagedToxinmapApp
if ($stoppedPids.Count -gt 0) {
  Write-Host "Stopped processes: $($stoppedPids -join ', ')"
} else {
  Write-Host "No managed toxinmap app was running."
}

Write-Host ""
Write-Host "==> checking database availability"
$databaseStatus = Ensure-DatabaseAvailability
Write-Host $databaseStatus.Message

if (-not $databaseStatus.Available -and -not $AllowDegradedWithoutDb) {
  throw "Local database is unavailable. Re-run with -AllowDegradedWithoutDb only if you intentionally want ETL/fallback mode."
}

if (-not $databaseStatus.Available) {
  $env:TOXINMAP_ALLOW_DATABASE_FALLBACK = "true"
  Write-Host "==> degraded mode"
  Write-Host "Running in ETL-backed national mode because a local PostGIS runtime is not available."
}

Push-Location $projectRoot
try {
  $runtimeMode = "prod-start"
  $buildIdPath = Join-Path $projectRoot ".next\BUILD_ID"

  if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "==> typechecking app"
    try {
      $typecheckStdOutLog = Join-Path $paths.RuntimeDir "toxinmap-typecheck.out.log"
      $typecheckStdErrLog = Join-Path $paths.RuntimeDir "toxinmap-typecheck.err.log"
      if (Test-Path $typecheckStdOutLog) {
        Remove-Item $typecheckStdOutLog -Force -ErrorAction SilentlyContinue
      }
      if (Test-Path $typecheckStdErrLog) {
        Remove-Item $typecheckStdErrLog -Force -ErrorAction SilentlyContinue
      }

      $typecheckCommand = "npm run typecheck 1>`"$typecheckStdOutLog`" 2>`"$typecheckStdErrLog`""
      Push-Location $projectRoot
      try {
        & $cmdPath /d /c $typecheckCommand
        $typecheckExitCode = $LASTEXITCODE
      } finally {
        Pop-Location
      }

      if (Test-Path $typecheckStdOutLog) {
        Get-Content $typecheckStdOutLog | Out-Host
      }
      if (Test-Path $typecheckStdErrLog) {
        Get-Content $typecheckStdErrLog | Out-Host
      }

      if ($typecheckExitCode -ne 0) {
        throw "Typecheck failed with exit code $typecheckExitCode."
      }

      Write-Host ""
      Write-Host "==> building app"
      $buildStdOutLog = Join-Path $paths.RuntimeDir "toxinmap-build.out.log"
      $buildStdErrLog = Join-Path $paths.RuntimeDir "toxinmap-build.err.log"
      if (Test-Path $buildStdOutLog) {
        Remove-Item $buildStdOutLog -Force -ErrorAction SilentlyContinue
      }
      if (Test-Path $buildStdErrLog) {
        Remove-Item $buildStdErrLog -Force -ErrorAction SilentlyContinue
      }

      $existingSkipBuildTypecheck = [System.Environment]::GetEnvironmentVariable("TOXINMAP_SKIP_NEXT_BUILD_TYPECHECK", "Process")
      $existingLocalBuildProfile = [System.Environment]::GetEnvironmentVariable("TOXINMAP_LOCAL_BUILD_PROFILE", "Process")
      [System.Environment]::SetEnvironmentVariable("TOXINMAP_SKIP_NEXT_BUILD_TYPECHECK", "true", "Process")
      [System.Environment]::SetEnvironmentVariable("TOXINMAP_LOCAL_BUILD_PROFILE", "managed", "Process")
      try {
        $buildCommand = "npm run build 1>`"$buildStdOutLog`" 2>`"$buildStdErrLog`""
        Push-Location $projectRoot
        try {
          & $cmdPath /d /c $buildCommand
          $buildExitCode = $LASTEXITCODE
        } finally {
          Pop-Location
        }
      } finally {
        [System.Environment]::SetEnvironmentVariable(
          "TOXINMAP_SKIP_NEXT_BUILD_TYPECHECK",
          $existingSkipBuildTypecheck,
          "Process"
        )
        [System.Environment]::SetEnvironmentVariable(
          "TOXINMAP_LOCAL_BUILD_PROFILE",
          $existingLocalBuildProfile,
          "Process"
        )
      }

      if (Test-Path $buildStdOutLog) {
        Get-Content $buildStdOutLog | Out-Host
      }
      if (Test-Path $buildStdErrLog) {
        Get-Content $buildStdErrLog | Out-Host
      }

      if ($buildExitCode -ne 0) {
        throw "Production build failed with exit code $buildExitCode."
      }

      if (-not (Test-Path $buildIdPath)) {
        throw "Production build completed without a .next\\BUILD_ID artifact."
      }
    } catch {
      Write-Host "==> production runtime unavailable"
      Write-Host $_.Exception.Message
      Write-Host "Falling back to a managed Next.js dev runtime on port 3000."
      $runtimeMode = "dev-managed"
    }
  } elseif (-not (Test-Path $buildIdPath)) {
    Write-Host "==> production runtime unavailable"
    Write-Host "No .next\\BUILD_ID artifact found."
    Write-Host "Falling back to a managed Next.js dev runtime on port 3000."
    $runtimeMode = "dev-managed"
  }

  $envMap = Set-ProcessEnvFromLocalFiles
  if (-not $env:NEXT_PUBLIC_SITE_URL) {
    $env:NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3000"
  }

  Write-Host ""
  Write-Host "==> seeding public home atlas cache"
  try {
    $seedProcess = Invoke-WithNormalizedProcessPath {
      Start-Process `
        -FilePath $nodePath `
        -ArgumentList @("scripts/local/run-ts.mjs", "scripts/local/seed-home-atlas-cache.ts", "--force") `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -PassThru
    }

    $seedCompleted = $seedProcess.WaitForExit(90000)
    if (-not $seedCompleted) {
      Stop-Process -Id $seedProcess.Id -Force -ErrorAction SilentlyContinue
      throw "Home atlas cache seed timed out after 90 seconds."
    }

    if ($seedProcess.ExitCode -ne 0) {
      throw "Home atlas cache seed exited with code $($seedProcess.ExitCode)."
    }
  } catch {
    Write-Host "Warning: home atlas cache seed failed. The app will still start, but the first home map request may be slow."
    Write-Host $_.Exception.Message
  }

  if (Test-Path $paths.StdOutLog) {
    Remove-Item $paths.StdOutLog -Force -ErrorAction SilentlyContinue
  }

  if (Test-Path $paths.StdErrLog) {
    Remove-Item $paths.StdErrLog -Force -ErrorAction SilentlyContinue
  }

  Write-Host ""
  Write-Host "==> starting app on http://127.0.0.1:3000"
  $nextCli = Join-Path $projectRoot "node_modules\next\dist\bin\next"
  $existingNodeOptions = $env:NODE_OPTIONS
  if ([string]::IsNullOrWhiteSpace($existingNodeOptions)) {
    $env:NODE_OPTIONS = "--max-old-space-size=6144"
  } elseif ($existingNodeOptions -notmatch "max-old-space-size") {
    $env:NODE_OPTIONS = "$existingNodeOptions --max-old-space-size=6144"
  }
  $nextArgs = if ($runtimeMode -eq "dev-managed") {
    @($nextCli, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3000")
  } else {
    @($nextCli, "start", "--hostname", "127.0.0.1", "--port", "3000")
  }
  $process = Invoke-WithNormalizedProcessPath {
    Start-Process `
      -FilePath $nodePath `
      -ArgumentList $nextArgs `
      -WorkingDirectory $projectRoot `
      -RedirectStandardOutput $paths.StdOutLog `
      -RedirectStandardError $paths.StdErrLog `
      -WindowStyle Hidden `
      -PassThru
  }
  if ([string]::IsNullOrWhiteSpace($existingNodeOptions)) {
    Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  } else {
    $env:NODE_OPTIONS = $existingNodeOptions
  }

  Set-Content -Path $paths.PidFile -Value $process.Id
  Set-Content -Path $paths.ModeFile -Value $runtimeMode

  if (-not (Wait-ForHttpOk -Url "http://127.0.0.1:3000/api/health" -TimeoutSeconds 90)) {
    Write-Host ""
    Write-Host "==> app failed to become healthy"
    if (Test-Path $paths.StdErrLog) {
      Write-Host "--- stderr ---"
      Get-Content $paths.StdErrLog -Tail 80
    }
    if (Test-Path $paths.StdOutLog) {
      Write-Host "--- stdout ---"
      Get-Content $paths.StdOutLog -Tail 80
    }
    throw "Local app did not become healthy on http://127.0.0.1:3000."
  }

  $listener = Get-PortListener -Port 3000
  if ($listener) {
    Set-Content -Path $paths.PidFile -Value ([int]$listener.OwningProcess)
  }

  $health = Get-AppHealth

  Write-Host ""
  Write-Host "==> local stack ready"
  if ($health) {
    $summary = @{
      url = "http://127.0.0.1:3000"
      runtimeMode = $runtimeMode
      databaseConfigured = $health.repository.databaseConfigured
      sourceRegistrySeeded = $health.repository.sourceRegistrySeeded
      dataMode = if ($databaseStatus.Available) { "database" } else { "etl-file" }
      totalEntities = $health.layers.totalEntities
      totalLayers = $health.layers.totalLayers
    } | ConvertTo-Json -Depth 4
    Write-Host $summary
  } else {
    Write-Host "App is responding, but /api/health did not return a JSON payload."
  }

} finally {
  Pop-Location
}

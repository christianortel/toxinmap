$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$runtimeDir = Join-Path $projectRoot ".local"
if (-not (Test-Path $runtimeDir)) {
  New-Item -ItemType Directory -Path $runtimeDir | Out-Null
}

$browserCandidates = @(
  "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
  "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

$availableBrowsers = $browserCandidates | Where-Object { Test-Path $_ }
if (-not $availableBrowsers) {
  throw "No installed Chrome, Edge, or Brave executable was found for browser validation."
}

$baseUrl = if ($env:SMOKE_BASE_URL) { $env:SMOKE_BASE_URL } else { "http://127.0.0.1:3000" }
$runId = [guid]::NewGuid().ToString("N")
$resultDir = Join-Path $runtimeDir "browser-e2e"
$resultPath = Join-Path $resultDir "$runId.json"
New-Item -ItemType Directory -Path $resultDir -Force | Out-Null
if (Test-Path $resultPath) {
  Remove-Item $resultPath -Force -ErrorAction SilentlyContinue
}

$targetUrl = "$baseUrl/?e2e=1&e2eAuto=browser&e2eAutoClose=1&e2eRunId=$runId&groups=official,emerging,legal"
$winningBrowser = $null
$lastFailure = $null
$lastObservedResult = $null
$attemptTimeoutSeconds = 180
$runningStallTimeoutSeconds = 45

function Stop-BrowserValidationProcessTree {
  param(
    [int]$Pid
  )

  if (-not $Pid) {
    return
  }

  try {
    & taskkill /PID $Pid /T /F | Out-Null
  } catch {
    Stop-Process -Id $Pid -Force -ErrorAction SilentlyContinue
  }
}

function Stop-StaleBrowserValidationProcesses {
  try {
    $staleProcesses = Get-CimInstance Win32_Process |
      Where-Object {
        $_.CommandLine -and $_.CommandLine -like "*browser-validation-profile*"
      } |
      Select-Object -ExpandProperty ProcessId

    foreach ($stalePid in ($staleProcesses | Sort-Object -Unique)) {
      Stop-BrowserValidationProcessTree -Pid $stalePid
    }
  } catch {
    # Best-effort cleanup only; validation can still proceed if process inspection is unavailable.
  }
}

Stop-StaleBrowserValidationProcesses

try {
  foreach ($candidateBrowser in $availableBrowsers) {
    if (Test-Path $resultPath) {
      Remove-Item $resultPath -Force -ErrorAction SilentlyContinue
    }

    foreach ($argumentSet in @(
      @(
        "--no-first-run",
        "--no-default-browser-check",
        "--new-window",
        $targetUrl
      )
    )) {
      $process = $null
      try {
        $process = Start-Process `
          -FilePath $candidateBrowser `
          -ArgumentList $argumentSet `
          -PassThru
      } catch {
        $lastFailure = "Browser '$candidateBrowser' failed to launch: $($_.Exception.Message)"
        continue
      }

      $attemptDeadline = (Get-Date).AddSeconds($attemptTimeoutSeconds)
      $runningDeadline = (Get-Date).AddSeconds($runningStallTimeoutSeconds)
      $lastObservedStamp = $null

      while ((Get-Date) -lt $attemptDeadline) {
        if (Test-Path $resultPath) {
          $result = Get-Content $resultPath -Raw | ConvertFrom-Json
          $lastObservedResult = $result
          $resultStamp = "$($result.status)|$($result.step)|$($result.recordedAt)"
          if ($resultStamp -ne $lastObservedStamp) {
            $lastObservedStamp = $resultStamp
            $runningDeadline = (Get-Date).AddSeconds($runningStallTimeoutSeconds)
          }
          if ($result.status -eq "running") {
            if ((Get-Date) -ge $runningDeadline) {
              $payloadSuffix = if ($result.payload) { " payload=$($result.payload)" } else { "" }
              throw "Browser interaction validation stalled in-browser at step '$($result.step)': $($result.message)$payloadSuffix"
            }
            Start-Sleep -Milliseconds 500
            continue
          }
          if ($result.status -ne "pass") {
            $payloadSuffix = if ($result.payload) { " payload=$($result.payload)" } else { "" }
            throw "Browser interaction validation failed in-browser at step '$($result.step)': $($result.message)$payloadSuffix"
          }

          $winningBrowser = $candidateBrowser
          Write-Host "PASS browser interaction validation"
          Write-Host (
            [ordered]@{
              browserPath = $winningBrowser
              targetUrl = $targetUrl
              status = $result.status
              step = $result.step
              message = $result.message
              payload = $result.payload
            } | ConvertTo-Json -Depth 4
          )
          return
        }

        if ($process -and $process.HasExited) {
          break
        }

        Start-Sleep -Milliseconds 500
      }

      if ((Get-Date) -ge $attemptDeadline -and $lastObservedResult -and $lastObservedResult.status -eq "running") {
        $payloadSuffix = if ($lastObservedResult.payload) { " payload=$($lastObservedResult.payload)" } else { "" }
        throw "Browser interaction validation exceeded ${attemptTimeoutSeconds}s while still running at step '$($lastObservedResult.step)': $($lastObservedResult.message)$payloadSuffix"
      }

      if ($process -and -not $process.HasExited) {
        Stop-BrowserValidationProcessTree -Pid $process.Id
      }
    }

    if ($lastObservedResult) {
      $lastFailure = "Browser '$candidateBrowser' stalled after step '$($lastObservedResult.step)': $($lastObservedResult.message)"
    } else {
      $lastFailure = "Browser '$candidateBrowser' did not produce a browser-e2e result."
    }
  }

  if ($lastFailure) {
    throw $lastFailure
  }

  throw "Browser interaction validation did not find a working installed browser."
} finally {
  Stop-StaleBrowserValidationProcesses
  if ($winningBrowser -and (Test-Path $resultPath)) {
    Remove-Item $resultPath -Force -ErrorAction SilentlyContinue
  }
  $profileDir = Join-Path $runtimeDir "browser-validation-profile-$runId"
  if (Test-Path $profileDir) {
    Remove-Item $profileDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

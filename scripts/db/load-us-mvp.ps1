param(
  [string]$States = "NC,LA,OH,PA,DE,MI,WI",
  [int]$TriYear = 2024,
  [int]$StateBatchSize = 8,
  [string]$ProgressPath = ".local\db-load-progress.json",
  [switch]$National,
  [switch]$Resume,
  [switch]$ResetProgress,
  [switch]$SkipFrs,
  [switch]$SkipTri,
  [switch]$SkipEcho,
  [switch]$SkipAtsdrPfas,
  [switch]$SkipUsgsPfas,
  [switch]$SkipNpdes,
  [switch]$SkipUsgsPharma,
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\..\local\common.ps1"
Set-ProcessEnvFromLocalFiles | Out-Null

$allNationalStates = @(
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
)

function Resolve-ProjectPath {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-ProgressFilePath {
  if ([System.IO.Path]::IsPathRooted($ProgressPath)) {
    return $ProgressPath
  }

  return Join-Path (Resolve-ProjectPath) $ProgressPath
}

function Ensure-ProgressDirectory {
  $progressFile = Get-ProgressFilePath
  $progressDirectory = Split-Path -Parent $progressFile
  if (-not (Test-Path $progressDirectory)) {
    New-Item -ItemType Directory -Path $progressDirectory | Out-Null
  }
}

function Get-ProgressState {
  $progressFile = Get-ProgressFilePath
  if (-not (Test-Path $progressFile)) {
    return @{
      mode = if ($National) { "national" } else { "us-mvp" }
      completedSteps = @()
      updatedAt = $null
    }
  }

  $raw = Get-Content $progressFile -Raw | ConvertFrom-Json
  return @{
    mode = $raw.mode
    completedSteps = @($raw.completedSteps)
    updatedAt = $raw.updatedAt
  }
}

function Save-ProgressState {
  param([hashtable]$State)

  if ($WhatIf) {
    return
  }

  Ensure-ProgressDirectory
  $State.updatedAt = (Get-Date).ToString("o")
  $State | ConvertTo-Json -Depth 6 | Set-Content -Path (Get-ProgressFilePath)
}

function Remove-ProgressState {
  $progressFile = Get-ProgressFilePath
  if (Test-Path $progressFile) {
    Remove-Item $progressFile -Force
  }
}

function Get-StateBatches {
  param(
    [string[]]$InputStates,
    [int]$BatchSize
  )

  $batches = @()
  for ($index = 0; $index -lt $InputStates.Count; $index += $BatchSize) {
    $sliceEnd = [Math]::Min($index + $BatchSize - 1, $InputStates.Count - 1)
    $batches += ,(($InputStates[$index..$sliceEnd]) -join ",")
  }

  return $batches
}

function Invoke-TrackedStep {
  param(
    [hashtable]$ProgressState,
    [string]$StepId,
    [string]$Label,
    [string]$Command
  )

  if ($Resume -and ($ProgressState.completedSteps -contains $StepId)) {
    Write-Host ""
    Write-Host "==> $Label"
    Write-Host "Skipping completed step $StepId"
    return
  }

  Write-Host ""
  Write-Host "==> $Label"
  Write-Host $Command

  if (-not $WhatIf) {
    Invoke-Expression $Command
    $ProgressState.completedSteps = @($ProgressState.completedSteps + $StepId | Select-Object -Unique)
    Save-ProgressState -State $ProgressState
  }
}

if ($ResetProgress) {
  Remove-ProgressState
}

$projectRoot = Resolve-ProjectPath
Push-Location $projectRoot
try {
  $progressState = Get-ProgressState

  Invoke-TrackedStep `
    -ProgressState $progressState `
    -StepId "seed-source-registry" `
    -Label "Seed source registry" `
    -Command "npm run db:seed:sources"

  if (-not $SkipFrs) {
    if ($National) {
      $frsBatches = Get-StateBatches -InputStates $allNationalStates -BatchSize $StateBatchSize
      for ($batchIndex = 0; $batchIndex -lt $frsBatches.Count; $batchIndex += 1) {
        $batchId = "{0:d2}" -f ($batchIndex + 1)
        Invoke-TrackedStep `
          -ProgressState $progressState `
          -StepId "frs-$batchId" `
          -Label "Load EPA FRS batch $batchId of $($frsBatches.Count)" `
          -Command "python scripts/etl/ingest_frs.py --states $($frsBatches[$batchIndex]) --load"
      }
    } else {
      Invoke-TrackedStep `
        -ProgressState $progressState `
        -StepId "frs-default" `
        -Label "Load EPA FRS" `
        -Command "python scripts/etl/ingest_frs.py --states $States --load"
    }
  }

  if (-not $SkipTri) {
    Invoke-TrackedStep `
      -ProgressState $progressState `
      -StepId "tri-national" `
      -Label "Load EPA TRI" `
      -Command "python scripts/etl/ingest_tri.py --year $TriYear --geography US --load"
  }

  if (-not $SkipEcho) {
    if ($National) {
      $echoBatches = Get-StateBatches -InputStates $allNationalStates -BatchSize $StateBatchSize
      for ($batchIndex = 0; $batchIndex -lt $echoBatches.Count; $batchIndex += 1) {
        $batchId = "{0:d2}" -f ($batchIndex + 1)
        Invoke-TrackedStep `
          -ProgressState $progressState `
          -StepId "echo-$batchId" `
          -Label "Load EPA ECHO batch $batchId of $($echoBatches.Count)" `
          -Command "python scripts/etl/ingest_echo.py --states $($echoBatches[$batchIndex]) --load"
      }
    } else {
      Invoke-TrackedStep `
        -ProgressState $progressState `
        -StepId "echo-default" `
        -Label "Load EPA ECHO" `
        -Command "python scripts/etl/ingest_echo.py --states $States --load"
    }
  }

  if (-not $SkipAtsdrPfas) {
    Invoke-TrackedStep `
      -ProgressState $progressState `
      -StepId "atsdr-pfas" `
      -Label "Load ATSDR PFAS" `
      -Command "python scripts/etl/ingest_atsdr_pfas.py --load"
  }

  if (-not $SkipUsgsPfas) {
    Invoke-TrackedStep `
      -ProgressState $progressState `
      -StepId "usgs-pfas" `
      -Label "Load USGS PFAS" `
      -Command "python scripts/etl/ingest_usgs_pfas.py --load"
  }

  if (-not $SkipNpdes) {
    if ($National) {
      $npdesBatches = Get-StateBatches -InputStates $allNationalStates -BatchSize $StateBatchSize
      for ($batchIndex = 0; $batchIndex -lt $npdesBatches.Count; $batchIndex += 1) {
        $batchId = "{0:d2}" -f ($batchIndex + 1)
        Invoke-TrackedStep `
          -ProgressState $progressState `
          -StepId "npdes-$batchId" `
          -Label "Load EPA NPDES wastewater batch $batchId of $($npdesBatches.Count)" `
          -Command "python scripts/etl/ingest_npdes_wastewater.py --states $($npdesBatches[$batchIndex]) --load"
      }
    } else {
      Invoke-TrackedStep `
        -ProgressState $progressState `
        -StepId "npdes-default" `
        -Label "Load EPA NPDES wastewater" `
        -Command "python scripts/etl/ingest_npdes_wastewater.py --states $States --load"
    }
  }

  if (-not $SkipUsgsPharma) {
    Invoke-TrackedStep `
      -ProgressState $progressState `
      -StepId "usgs-pharma" `
      -Label "Load USGS pharmaceutical context" `
      -Command "python scripts/etl/ingest_usgs_pharma.py --load"
  }
} finally {
  Pop-Location
}

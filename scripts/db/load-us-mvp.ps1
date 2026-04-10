param(
  [string]$States = "NC,LA,OH,PA,DE,MI,WI",
  [int]$TriYear = 2024,
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

function Invoke-Step {
  param(
    [string]$Label,
    [string]$Command
  )

  Write-Host ""
  Write-Host "==> $Label"
  Write-Host $Command

  if (-not $WhatIf) {
    Invoke-Expression $Command
  }
}

Invoke-Step "Seed source registry" "npm run db:seed:sources"

if (-not $SkipFrs) {
  Invoke-Step "Load EPA FRS" "python scripts/etl/ingest_frs.py --states $States --load"
}

if (-not $SkipTri) {
  Invoke-Step "Load EPA TRI" "python scripts/etl/ingest_tri.py --year $TriYear --geography US --load"
}

if (-not $SkipEcho) {
  Invoke-Step "Load EPA ECHO" "python scripts/etl/ingest_echo.py --load"
}

if (-not $SkipAtsdrPfas) {
  Invoke-Step "Load ATSDR PFAS" "python scripts/etl/ingest_atsdr_pfas.py --load"
}

if (-not $SkipUsgsPfas) {
  Invoke-Step "Load USGS PFAS" "python scripts/etl/ingest_usgs_pfas.py --load"
}

if (-not $SkipNpdes) {
  Invoke-Step "Load EPA NPDES wastewater" "python scripts/etl/ingest_npdes_wastewater.py --states $States --load"
}

if (-not $SkipUsgsPharma) {
  Invoke-Step "Load USGS pharmaceutical context" "python scripts/etl/ingest_usgs_pharma.py --load"
}

param(
  [int]$TriYear = 2024,
  [int]$StateBatchSize = 8,
  [string]$ProgressPath = ".local\db-load-progress.json",
  [switch]$ResetProgress,
  [switch]$WhatIf,
  [switch]$SkipFrs,
  [switch]$SkipTri,
  [switch]$SkipEcho,
  [switch]$SkipAtsdrPfas,
  [switch]$SkipUsgsPfas,
  [switch]$SkipNpdes,
  [switch]$SkipUsgsPharma
)

& "$PSScriptRoot\load-us-mvp.ps1" `
  -National `
  -Resume `
  -TriYear $TriYear `
  -StateBatchSize $StateBatchSize `
  -ProgressPath $ProgressPath `
  -ResetProgress:$ResetProgress `
  -WhatIf:$WhatIf `
  -SkipFrs:$SkipFrs `
  -SkipTri:$SkipTri `
  -SkipEcho:$SkipEcho `
  -SkipAtsdrPfas:$SkipAtsdrPfas `
  -SkipUsgsPfas:$SkipUsgsPfas `
  -SkipNpdes:$SkipNpdes `
  -SkipUsgsPharma:$SkipUsgsPharma

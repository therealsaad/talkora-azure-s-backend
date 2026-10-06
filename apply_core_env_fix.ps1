$ErrorActionPreference = 'Stop'
$EnvPath = Join-Path $PSScriptRoot '.env'
if (!(Test-Path $EnvPath)) { throw "Missing backend .env at $EnvPath" }

$lines = Get-Content $EnvPath
$entries = @{}

for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i]
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
    $key = $matches[1]
    $value = $matches[2]
    if (-not $entries.ContainsKey($key)) { $entries[$key] = @() }
    $entries[$key] += [pscustomobject]@{ Index = $i; Value = $value }
  }
}

$keepIndex = @{}
$chosenValue = @{}
foreach ($key in $entries.Keys) {
  $items = $entries[$key]
  $keepIndex[$key] = $items[-1].Index
  $selected = $items[-1].Value
  foreach ($item in $items) {
    if (-not [string]::IsNullOrWhiteSpace($item.Value)) { $selected = $item.Value }
  }
  $chosenValue[$key] = $selected
}

# Talkora core routing: Qwen brain + Groq live STT/TTS + Python cached lesson TTS.
$chosenValue['AI_PROVIDER'] = 'qwen'

$output = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i]
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
    $key = $matches[1]
    if ($i -ne $keepIndex[$key]) { continue }
    $output.Add("$key=$($chosenValue[$key])")
  } else {
    $output.Add($line)
  }
}

Set-Content -Path $EnvPath -Value $output
Write-Host '[Talkora] Provider .env repaired: duplicate keys removed, configured values preserved, AI_PROVIDER=qwen.'

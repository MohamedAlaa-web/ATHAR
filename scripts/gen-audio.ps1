# Generates English studio-preview narration WAVs via Windows SAPI.
# Honest label: synthetic voice preview, NOT a professional recording.
# Run from project root: powershell -ExecutionPolicy Bypass -File scripts/gen-audio.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$work = Join-Path $PSScriptRoot 'work'
$json = Get-Content -LiteralPath (Join-Path $work 'narration.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$outDir = Join-Path $work 'wav'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$voice = 'Microsoft Zira Desktop'
$rate = -2
$n = 0
$items = @()
foreach ($c in $json.chapters) { $items += @{ key = $c.key; text = $c.en } }
foreach ($i in $json.intros) { $items += @{ key = $i.key; text = $i.en } }

foreach ($it in $items) {
  $safe = ($it.key -replace '/', '-')
  $wav = Join-Path $outDir ($safe + '.wav')
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice($voice)
  $s.Rate = $rate
  # Default SAPI wave output (valid header guaranteed); ffmpeg normalizes later.
  $s.SetOutputToWaveFile($wav)
  $s.Speak($it.text)
  $s.Dispose()
  $kb = [math]::Round((Get-Item -LiteralPath $wav).Length / 1KB)
  echo "$safe : $kb KB"
  $n++
}
echo "DONE $n files"

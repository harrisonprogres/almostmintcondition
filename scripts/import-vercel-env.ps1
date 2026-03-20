param(
  [string]$EnvFile = ".env.vercel",
  [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $EnvFile)) {
  Write-Error "Env file '$EnvFile' not found. Copy .env.vercel.example to .env.vercel and fill values first."
}

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Error "Vercel CLI not found in PATH. Restart terminal/Cursor and try again."
}

$lines = Get-Content $EnvFile
foreach ($line in $lines) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  if ($line.TrimStart().StartsWith("#")) { continue }
  $parts = $line -split "=", 2
  if ($parts.Count -ne 2) { continue }

  $name = $parts[0].Trim()
  $value = $parts[1]
  if ([string]::IsNullOrWhiteSpace($name)) { continue }
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host "Skipping empty var: $name"
    continue
  }

  Write-Host "Adding $name to $Environment..."
  $value | vercel env add $name $Environment
}

Write-Host "Done. If prompted often, run: vercel link"

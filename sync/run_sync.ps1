# Executa a sincronização usando a pasta do projeto como referência.
$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = Join-Path $Here ".venv\Scripts\python.exe"
$Config = Join-Path $Here ".env.sync"
$Logs = Join-Path $Here "logs"

if (-not (Test-Path -LiteralPath $Config)) {
  throw "Configure sync\.env.sync a partir de sync\.env.sync.example."
}
if (-not (Test-Path -LiteralPath $Python)) {
  throw "Ambiente Python ausente. Execute sync\install_windows.ps1."
}
New-Item -ItemType Directory -Path $Logs -Force | Out-Null
$LogPath = Join-Path $Logs ("sync-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")
Push-Location (Split-Path $Here -Parent)
try {
  & $Python (Join-Path $Here "sync_from_mysql.py") *> $LogPath
  $Code = $LASTEXITCODE
  Get-Content -LiteralPath $LogPath
  if ($Code -ne 0) { throw "Sincronização falhou (exit code $Code). Verifique o log." }
  Get-ChildItem -Path $Logs -Filter "sync-*.log" -File |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force
} finally {
  Pop-Location
}

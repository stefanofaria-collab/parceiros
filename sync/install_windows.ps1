# Prepara o Python e registra uma tarefa diária no Windows.
# A tarefa roda quando a conta deste usuário estiver conectada.
param(
  [string]$Hora = "07:00",
  [string]$TaskName = "Parceiros - Sincronizar BigQuery"
)
$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Config = Join-Path $Here ".env.sync"
if (-not (Test-Path $Config)) {
  Copy-Item (Join-Path $Here ".env.sync.example") $Config
  Write-Host "Configuração criada: $Config"
  Write-Host "Preencha os campos antes de executar a sincronização."
}
if (Get-Command py -ErrorAction SilentlyContinue) {
  & py -3 -m venv (Join-Path $Here ".venv")
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  & python -m venv (Join-Path $Here ".venv")
} else {
  throw "Instale o Python 3.10+ no Windows antes de continuar."
}
$Python = Join-Path $Here ".venv\Scripts\python.exe"
& $Python -m pip install --upgrade pip
& $Python -m pip install -r (Join-Path $Here "requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar dependências Python." }

$parts = $Hora.Split(":")
if ($parts.Count -ne 2 -or [int]$parts[0] -gt 23 -or [int]$parts[1] -gt 59) {
  throw "Hora inválida, use HH:mm (ex.: 07:00)"
}
$Start = [datetime]::Today.AddHours([int]$parts[0]).AddMinutes([int]$parts[1])
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ('-NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $Here "run_sync.ps1") + '"')
$Trigger = New-ScheduledTaskTrigger -Daily -At $Start
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$CurrentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$Principal = New-ScheduledTaskPrincipal -UserId $CurrentUser -LogonType Interactive -RunLevel LeastPrivilege
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Force | Out-Null
Write-Host "Tarefa criada: $TaskName, diariamente às $Hora."
Write-Host "Ela executa quando o usuário está conectado e recupera execuções perdidas."
Write-Host "Para testar manualmente: & '$($Here)\run_sync.ps1'"

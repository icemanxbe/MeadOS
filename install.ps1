# MeadOS — © 2026 icemanxbe (https://github.com/icemanxbe/MeadOS)
# Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE).
#
# Windows install/update/run helper — the counterpart to install.sh for
# macOS/Linux. Uses Task Scheduler (built into Windows, no extra download)
# to run MeadOS in the background, start it at logon, and restart it if it
# ever crashes.
#
# Usage: .\install.ps1 <command> [-Port N] [-DbPath PATH]
#   install    Set up the background task (installs + starts it)
#   update     git pull the latest code, then restart the task
#   start      Start the task
#   stop       Stop the task
#   restart    Restart the task
#   status     Show whether the task is running
#   uninstall  Remove the background task (does not delete your data)
#   run        Run server.py directly in the foreground (no task; Ctrl-C to stop)
param(
    [Parameter(Position = 0)]
    [string]$Command = "",
    [int]$Port = 8080,
    [string]$DbPath = ""
)

$ErrorActionPreference = "Stop"
$ScriptPath = $MyInvocation.MyCommand.Path
$ScriptDir = Split-Path -Parent $ScriptPath
Set-Location $ScriptDir

$TaskName = "MeadOS"

function Get-PythonExe {
    foreach ($name in @("python", "python3", "py")) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    Write-Error "Python 3.8+ is required but wasn't found on PATH. Install it from python.org and re-run."
    exit 1
}
$Python = Get-PythonExe

# Returns the server args as an array — never a pre-joined string — so a
# path containing spaces (e.g. C:\Users\Jane Doe\meados.db) survives intact
# through both the array-splat ("run") and quoted-string ("install") paths.
function Get-ServerArgs {
    $a = @("--port", "$Port")
    if ($DbPath) { $a += @("--db", $DbPath) }
    return $a
}

# Quotes a single command-line token only if it needs it, for building the
# one-line command string Task Scheduler's action requires.
function Format-Arg([string]$Value) {
    if ($Value -match '\s') { return "`"$Value`"" }
    return $Value
}

function Show-Usage {
    foreach ($line in Get-Content $ScriptPath) {
        if ($line -match '^#') { $line -replace '^#\s?', '' }
        else { break }
    }
}

function Install-MeadOS {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    $argTokens = @((Format-Arg (Join-Path $ScriptDir "server.py"))) + (Get-ServerArgs | ForEach-Object { Format-Arg $_ })
    $action = New-ScheduledTaskAction -Execute $Python `
        -Argument ($argTokens -join ' ') `
        -WorkingDirectory $ScriptDir
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet `
        -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
        -Settings $settings -Description "MeadOS mead-brewing companion" | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "Installed. MeadOS will start at logon and restart itself if it crashes."
    Write-Host "Manage it from Task Scheduler (taskschd.msc) under the name '$TaskName' if needed."
}

function Assert-Installed {
    if (-not (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue)) {
        Write-Error "Not installed yet — run .\install.ps1 install first."
        exit 1
    }
}

function Get-MeadOSStatus {
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if (-not $task) { Write-Host "not installed"; return }
    Write-Host $task.State
}

function Update-MeadOS {
    if (Test-Path (Join-Path $ScriptDir ".git")) {
        Write-Host "Pulling the latest code..."
        git -C $ScriptDir pull --ff-only
    }
    else {
        Write-Error "This isn't a git checkout — download the latest release from https://github.com/icemanxbe/MeadOS and replace the app files (meados.db and assets/ are untouched either way)."
        exit 1
    }
    Assert-Installed
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-ScheduledTask -TaskName $TaskName
}

switch ($Command) {
    "run" {
        & $Python (Join-Path $ScriptDir "server.py") @(Get-ServerArgs)
    }
    "install" { Install-MeadOS }
    "start" { Assert-Installed; Start-ScheduledTask -TaskName $TaskName }
    "stop" { Assert-Installed; Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue }
    "restart" {
        Assert-Installed
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Start-ScheduledTask -TaskName $TaskName
    }
    "status" { Get-MeadOSStatus }
    "uninstall" {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "Removed the background task. Your data in meados.db is untouched."
    }
    "update" { Update-MeadOS }
    default { Show-Usage }
}

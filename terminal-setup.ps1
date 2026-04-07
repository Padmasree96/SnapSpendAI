[CmdletBinding()]
param()

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'Frontend'

function Quote-PowerShellString {
    param([string]$Value)
    return "'" + $Value.Replace("'", "''") + "'"
}

function Test-ListeningPort {
    param([int]$Port)
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Resolve-BackendPython {
    $candidates = @(
        (Join-Path $backendDir 'venv\Scripts\python.exe'),
        (Join-Path $backendDir '.venv\Scripts\python.exe')
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw "Could not find a backend Python interpreter in 'backend\\venv' or 'backend\\.venv'."
}

function Resolve-Npm {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npm) {
        return $npm.Source
    }

    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) {
        return $npm.Source
    }

    throw "npm was not found on PATH."
}

$backendPython = Resolve-BackendPython
$npmCommand = Resolve-Npm

if (Test-ListeningPort -Port 8000) {
    Write-Host 'Backend is already listening on port 8000.'
} else {
    $backendCommand = @(
        "Set-Location $(Quote-PowerShellString $backendDir)",
        "& $(Quote-PowerShellString $backendPython) -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
    ) -join '; '

    Start-Process powershell.exe -ArgumentList '-NoExit', '-Command', $backendCommand | Out-Null
    Write-Host 'Started backend on http://127.0.0.1:8000'
}

if (Test-ListeningPort -Port 5173) {
    Write-Host 'Frontend is already listening on port 5173.'
} else {
    $frontendCommand = @(
        "Set-Location $(Quote-PowerShellString $frontendDir)",
        "& $(Quote-PowerShellString $npmCommand) run dev -- --host 127.0.0.1 --port 5173"
    ) -join '; '

    Start-Process powershell.exe -ArgumentList '-NoExit', '-Command', $frontendCommand | Out-Null
    Write-Host 'Started frontend on http://127.0.0.1:5173'
}

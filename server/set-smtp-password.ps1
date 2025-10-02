<#
Securely prompt for an SMTP password (App Password) and update server/.env.
This script keeps the password local — do NOT paste it into chat or upload it anywhere.
Run from repository root in PowerShell:
    cd .\server
    pwsh -ExecutionPolicy Bypass -File .\set-smtp-password.ps1
or (Windows PowerShell):
    PowerShell -ExecutionPolicy Bypass -File .\set-smtp-password.ps1
#>

$envPath = Join-Path -Path (Get-Location) -ChildPath ".env"
if (-not (Test-Path $envPath)) {
    Write-Host ".env not found in current folder. Are you in the server folder?`nExpected path: $envPath" -ForegroundColor Yellow
    exit 1
}

# Prompt securely for the password
$securePwd = Read-Host -Prompt "Enter SMTP App Password (input hidden)" -AsSecureString
try {
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePwd)
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
} finally {
    if ($bstr) { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if ([string]::IsNullOrWhiteSpace($plain)) {
    Write-Host "No password entered. Aborting." -ForegroundColor Red
    exit 1
}

# Read .env, replace or add SMTP_PASS
$content = Get-Content $envPath -Raw
if ($content -match "(?m)^SMTP_PASS=") {
    $newContent = $content -replace "(?m)^SMTP_PASS=.*$", "SMTP_PASS=$plain"
} else {
    $newContent = $content + "`nSMTP_PASS=$plain`n"
}

# Backup current .env (local) before overwriting
$backupPath = "$envPath.bak_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path $envPath -Destination $backupPath -Force

Set-Content -Path $envPath -Value $newContent -Encoding UTF8

Write-Host "Updated $envPath (backup created at $backupPath)." -ForegroundColor Green
Write-Host "Do NOT commit this file. Ensure server/.gitignore contains '.env'." -ForegroundColor Yellow

# Optionally restart the server if you run it with npm
if (Test-Path "package.json") {
    Write-Host "If the server is running, restart it now (Ctrl+C then 'npm start' in the server folder) or run your process manager." -ForegroundColor Cyan
}

# Clear plain variable from memory
$plain = $null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

exit 0

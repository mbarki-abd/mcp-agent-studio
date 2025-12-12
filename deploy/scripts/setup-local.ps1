# MCP Agent Studio - Local Development Setup (Windows)
# Run as Administrator: powershell -ExecutionPolicy Bypass -File deploy\scripts\setup-local.ps1

param(
    [switch]$SkipHosts,
    [switch]$SkipDocker,
    [switch]$Remove
)

$ErrorActionPreference = "Stop"

# Configuration
$HOSTS_FILE = "C:\Windows\System32\drivers\etc\hosts"
$DOMAINS = @(
    "mcp.local",
    "api.mcp.local",
    "traefik.mcp.local"
)

function Write-Header {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  MCP Agent Studio - Local Setup" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Add-HostsEntries {
    Write-Host "[INFO] Adding hosts entries..." -ForegroundColor Blue

    $hostsContent = Get-Content $HOSTS_FILE -Raw
    $marker = "# MCP Agent Studio Local Development"

    # Check if entries already exist
    if ($hostsContent -match [regex]::Escape($marker)) {
        Write-Host "[WARN] Hosts entries already exist. Skipping." -ForegroundColor Yellow
        return
    }

    $newEntries = @"

$marker
127.0.0.1    mcp.local
127.0.0.1    api.mcp.local
127.0.0.1    traefik.mcp.local
# End MCP Agent Studio
"@

    Add-Content -Path $HOSTS_FILE -Value $newEntries
    Write-Host "[SUCCESS] Hosts entries added" -ForegroundColor Green

    # Flush DNS cache
    Write-Host "[INFO] Flushing DNS cache..." -ForegroundColor Blue
    ipconfig /flushdns | Out-Null
    Write-Host "[SUCCESS] DNS cache flushed" -ForegroundColor Green
}

function Remove-HostsEntries {
    Write-Host "[INFO] Removing hosts entries..." -ForegroundColor Blue

    $hostsContent = Get-Content $HOSTS_FILE -Raw
    $startMarker = "# MCP Agent Studio Local Development"
    $endMarker = "# End MCP Agent Studio"

    $pattern = "(?ms)\r?\n$([regex]::Escape($startMarker)).*?$([regex]::Escape($endMarker))"
    $newContent = $hostsContent -replace $pattern, ""

    Set-Content -Path $HOSTS_FILE -Value $newContent.TrimEnd()
    Write-Host "[SUCCESS] Hosts entries removed" -ForegroundColor Green

    # Flush DNS cache
    ipconfig /flushdns | Out-Null
}

function Test-Docker {
    Write-Host "[INFO] Checking Docker..." -ForegroundColor Blue

    try {
        $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
        if ($dockerVersion) {
            Write-Host "[SUCCESS] Docker is running (version $dockerVersion)" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "[ERROR] Docker is not running" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
        return $false
    }
    return $false
}

function Start-LocalStack {
    Write-Host "[INFO] Building and starting local stack..." -ForegroundColor Blue

    Set-Location $PSScriptRoot\..\..

    # Create .env.local if not exists
    if (-not (Test-Path ".env.local")) {
        Write-Host "[INFO] Creating .env.local..." -ForegroundColor Blue
        @"
# Local Development Environment
POSTGRES_USER=mcp
POSTGRES_PASSWORD=mcp_local_password
POSTGRES_DB=mcp_agent_studio
JWT_SECRET=local_dev_jwt_secret_change_in_production
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    }

    # Build and start
    Write-Host "[INFO] Building images (this may take a few minutes)..." -ForegroundColor Blue
    docker compose -f docker-compose.local.yml --env-file .env.local build

    Write-Host "[INFO] Starting services..." -ForegroundColor Blue
    docker compose -f docker-compose.local.yml --env-file .env.local up -d

    # Wait for services
    Write-Host "[INFO] Waiting for services to be ready..." -ForegroundColor Blue
    Start-Sleep -Seconds 15

    # Run migrations
    Write-Host "[INFO] Running database migrations..." -ForegroundColor Blue
    docker compose -f docker-compose.local.yml exec server npx prisma migrate deploy 2>$null

    Write-Host "[SUCCESS] Local stack is running!" -ForegroundColor Green
}

function Stop-LocalStack {
    Write-Host "[INFO] Stopping local stack..." -ForegroundColor Blue

    Set-Location $PSScriptRoot\..\..
    docker compose -f docker-compose.local.yml down

    Write-Host "[SUCCESS] Local stack stopped" -ForegroundColor Green
}

function Show-Status {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Local Development Ready!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "URLs:" -ForegroundColor Cyan
    Write-Host "  Dashboard:        http://mcp.local"
    Write-Host "  API:              http://api.mcp.local"
    Write-Host "  API Health:       http://api.mcp.local/health"
    Write-Host "  Traefik Dashboard: http://traefik.mcp.local"
    Write-Host ""
    Write-Host "Database:" -ForegroundColor Cyan
    Write-Host "  PostgreSQL:       localhost:5432"
    Write-Host "  Redis:            localhost:6379"
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  View logs:        docker compose -f docker-compose.local.yml logs -f"
    Write-Host "  Stop:             docker compose -f docker-compose.local.yml down"
    Write-Host "  Restart:          docker compose -f docker-compose.local.yml restart"
    Write-Host "  Rebuild:          docker compose -f docker-compose.local.yml up -d --build"
    Write-Host ""
}

# Main
Write-Header

if (-not (Test-Administrator)) {
    Write-Host "[ERROR] This script requires Administrator privileges" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again" -ForegroundColor Yellow
    exit 1
}

if ($Remove) {
    Write-Host "Removing local development setup..." -ForegroundColor Yellow
    Stop-LocalStack
    Remove-HostsEntries
    Write-Host "[SUCCESS] Local setup removed" -ForegroundColor Green
    exit 0
}

if (-not $SkipHosts) {
    Add-HostsEntries
}

if (-not $SkipDocker) {
    if (Test-Docker) {
        Start-LocalStack
        Show-Status
    }
}

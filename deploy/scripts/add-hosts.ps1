# Add MCP hosts entries - Run as Administrator
# Usage: powershell -ExecutionPolicy Bypass -File deploy\scripts\add-hosts.ps1

$hostsFile = "C:\Windows\System32\drivers\etc\hosts"

$entries = @"

# MCP Agent Studio Local Development
127.0.0.1    mcp.local
127.0.0.1    api.mcp.local
127.0.0.1    traefik.mcp.local
# End MCP Agent Studio
"@

$content = Get-Content $hostsFile -Raw
if ($content -match "MCP Agent Studio") {
    Write-Host "Hosts entries already exist" -ForegroundColor Yellow
} else {
    Add-Content -Path $hostsFile -Value $entries
    Write-Host "Hosts entries added successfully" -ForegroundColor Green
}

ipconfig /flushdns
Write-Host "DNS cache flushed" -ForegroundColor Green

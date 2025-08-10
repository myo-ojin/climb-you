# Serena MCP Server起動スクリプト
Write-Host "Starting Serena MCP Server..." -ForegroundColor Green

# 現在のディレクトリを取得
$currentDir = Get-Location
Write-Host "Current directory: $currentDir" -ForegroundColor Yellow

# serena-mainディレクトリに移動
$serenaPath = "C:\Users\81906\Documents\app\console\climb-you-beta\serena-main\serena-main"
if (Test-Path $serenaPath) {
    Write-Host "Changing to serena directory: $serenaPath" -ForegroundColor Yellow
    Set-Location $serenaPath
    
    # Serena MCPサーバーを起動
    Write-Host "Starting MCP Server..." -ForegroundColor Yellow
    & uv run serena-mcp-server
} else {
    Write-Host "Serena directory not found: $serenaPath" -ForegroundColor Red
    exit 1
}
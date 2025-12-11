#!/bin/bash
# Start development environment with sample MCP server

echo "Starting MCP Agent Studio Development Environment"
echo "================================================="

# Start sample MCP server in background
echo "[1/2] Starting sample MCP server..."
cd tools/sample-mcp-server
npm install --silent 2>/dev/null
npm start &
MCP_PID=$!
cd ../..

# Wait for MCP server to be ready
sleep 2
echo "      Sample MCP server running on http://localhost:3001"

# Start main development environment
echo "[2/2] Starting main development environment..."
pnpm dev &
DEV_PID=$!

echo ""
echo "================================================="
echo "Development Environment Ready!"
echo "================================================="
echo ""
echo "Services:"
echo "  - Dashboard:    http://localhost:5173"
echo "  - Backend API:  http://localhost:3000"
echo "  - MCP Server:   http://localhost:3001"
echo ""
echo "MCP Server Token: sample-token-12345"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Handle shutdown
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $MCP_PID 2>/dev/null
    kill $DEV_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait

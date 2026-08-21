# RajMines VTS 1-Click Launch Script
Write-Host "===================================================================" -ForegroundColor Amber
Write-Host "  Starting RajMines VTS (Vehicle Tracking System) POC" -ForegroundColor Cyan
Write-Host "  Department of Mines & Geology, Govt. of Rajasthan • Rajdharaa GIS" -ForegroundColor Green
Write-Host "===================================================================" -ForegroundColor Amber

# Start Golang Backend in a new background process
Write-Host "`n[1/2] Launching Golang Backend API & AIS-140 WebSocket Server on port 8080..." -ForegroundColor Yellow
Start-Process -FilePath "go" -ArgumentList "run ./cmd/server/main.go" -WorkingDirectory "$PSScriptRoot\backend" -NoNewWindow

Start-Sleep -Seconds 2

# Start React Frontend in dev mode
Write-Host "[2/2] Launching React 19 Frontend with Rajdharaa GIS Map on port 3000..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot"

Write-Host "`nSystem Online!" -ForegroundColor Green
Write-Host "• Frontend Portal: http://localhost:3000" -ForegroundColor Cyan
Write-Host "• Backend API & WS: http://localhost:8080" -ForegroundColor Cyan
Write-Host "• Rajdharaa GIS Metadata: http://localhost:8080/api/v1/gis/layers" -ForegroundColor Cyan

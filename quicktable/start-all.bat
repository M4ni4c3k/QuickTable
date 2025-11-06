@echo off
REM QuickTable - Windows Batch Startup Script
REM Starts all microservices and frontend

echo.
echo ========================================
echo   QuickTable - Starting All Services
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Start all services in separate windows
echo Starting API Gateway...
start "QuickTable - API Gateway" cmd /k "cd services\api-gateway && node server.js"

timeout /t 1 /nobreak >nul

echo Starting Order Service...
start "QuickTable - Order Service" cmd /k "cd services\order-service && node server.js"

timeout /t 1 /nobreak >nul

echo Starting Reservation Service...
start "QuickTable - Reservation Service" cmd /k "cd services\reservation-service && node server.js"

timeout /t 1 /nobreak >nul

echo Starting Table Service...
start "QuickTable - Table Service" cmd /k "cd services\table-service && node server.js"

timeout /t 1 /nobreak >nul

echo Starting Menu Service...
start "QuickTable - Menu Service" cmd /k "cd services\menu-service && node server.js"

timeout /t 1 /nobreak >nul

echo Starting Hours Service...
start "QuickTable - Hours Service" cmd /k "cd services\hours-service && node server.js"

timeout /t 1 /nobreak >nul

echo Starting Notification Service...
start "QuickTable - Notification Service" cmd /k "cd services\notification-service && node server.js"

timeout /t 1 /nobreak >nul

echo Starting Real-time Service...
start "QuickTable - Real-time Service" cmd /k "cd services\realtime-service && node server.js"

timeout /t 1 /nobreak >nul

echo Starting Auth Service...
start "QuickTable - Auth Service" cmd /k "cd services\auth-service && node server.js"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Services Started!
echo ========================================
echo.
echo API Gateway:     http://localhost:3000
echo Order Service:   http://localhost:3001
echo Reservation:      http://localhost:3002
echo Table Service:   http://localhost:3003
echo Menu Service:    http://localhost:3004
echo Hours Service:   http://localhost:3005
echo Notification:     http://localhost:3006
echo Real-time:       http://localhost:3007
echo Auth Service:    http://localhost:3008
echo.
echo Starting Frontend...
echo.

REM Start frontend in current window
npm run dev



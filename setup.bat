@echo off
echo ========================================
echo   CONFIGURACION AUTOMATICA - FRONTEND
echo ========================================
echo.

echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 (
    echo ERROR: No se pudieron instalar las dependencias
    pause
    exit /b 1
)

echo [2/3] Creando archivo .env...
if not exist .env (
    (
        echo # URL del Backend API - Desarrollo Local
        echo VITE_API_URL=http://127.0.0.1:8000
    ) > .env
)

echo.
echo ========================================
echo   CONFIGURACION COMPLETADA!
echo ========================================
echo.
echo Para ejecutar el servidor:
echo   run.bat
echo.
pause

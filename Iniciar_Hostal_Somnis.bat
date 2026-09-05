@echo off
title Hostal Somnis - Iniciando Aplicacion
color 1F

echo ========================================================
echo        HOSTAL SOMNIS - APLICACION DE GESTION
echo ========================================================
echo.
echo Iniciando servidor...
echo Por favor, no cierres esta ventana mientras usas la app.
echo.

:: Iniciar el servidor de Node en segundo plano
start /B npm start

:: Esperar un par de segundos para que el servidor arranque
timeout /t 3 /nobreak > NUL

:: Abrir el navegador por defecto en la dirección local
start http://localhost:3000

echo La aplicacion deberia haberse abierto en tu navegador.
echo Si no es asi, abre tu navegador y entra en: http://localhost:3000
echo.
echo (Para cerrar la aplicacion, simplemente cierra esta ventana negra)
pause

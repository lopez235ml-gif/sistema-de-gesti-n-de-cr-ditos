@echo off
TITLE Sistema de Gestion de Creditos - GRAVITY
COLOR 0A
CLS
ECHO ========================================================
ECHO    SISTEMA DE GESTION DE CREDITOS Y PRESTAMOS (GRAVITY)
ECHO ========================================================
ECHO.
ECHO Iniciando servidor en local...
ECHO.
ECHO [INFO] Se abrira tu navegador automaticamente.
ECHO [IMPORTANTE] Mantener esta ventana negra abierta.
ECHO.

cd /d "%~dp0"

:: Abrir navegador automaticamente
TIMEOUT /T 2 >NOUL
start http://localhost:3000

:: Iniciar servidor
node server.js

ECHO.
ECHO El servidor se ha detenido.
PAUSE

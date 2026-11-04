@echo off
rem Recompila el juego (src\ -> dist\game.js) con el Node portable de tools\ y comprueba los tipos.
cd /d "%~dp0"
set "PATH=%~dp0tools\node-v24.22.2-win-x64;%PATH%"
node tools\build.mjs --check
node tools\test-sim.mjs
pause

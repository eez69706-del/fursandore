@echo off
set /p ADMIN_PASS=Admin password (leave empty for a random one): 
start "" http://localhost:3737
node server.js
pause

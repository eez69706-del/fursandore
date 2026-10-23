@echo off
chcp 65001 >nul
title 🏆 بطولة الفرسان - لوحة التحكم
color 0A
cls

:menu
echo.
echo  ============================================================
echo    🏆  مدارس الفرسان - بطولة الأبطال
echo    🎮  لوحة التحكم
echo  ============================================================
echo.
echo   [1] 🚀 تشغيل عادي (Production)
echo   [2] 💻 تشغيل تطوير (Hot Reload)
echo   [3] 📦 إعادة تثبيت الحزم
echo   [4] 💾 نسخ احتياطي للبيانات
echo   [5] 🛑 إيقاف السيرفر
echo   [6] 🌐 فتح الموقع
echo   [7] 📂 فتح مجلد البيانات
echo   [0] ❌ خروج
echo.
echo  ============================================================
set /p choice="  اختر رقم: "

if "%choice%"=="1" goto prod
if "%choice%"=="2" goto dev
if "%choice%"=="3" goto reinstall
if "%choice%"=="4" goto backup
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto open
if "%choice%"=="7" goto datafolder
if "%choice%"=="0" goto end
goto menu

:prod
cd /d "%~dp0server"
echo.
echo  🚀 جارٍ التشغيل...
start "" cmd /c "timeout /t 2 >nul && start http://localhost:3000"
call npm start
goto menu

:dev
cd /d "%~dp0server"
echo.
echo  💻 وضع التطوير...
start "" cmd /c "timeout /t 2 >nul && start http://localhost:3000"
call npm run dev
goto menu

:reinstall
cd /d "%~dp0server"
echo.
echo  🗑️  حذف node_modules...
if exist node_modules rmdir /S /Q node_modules
echo  📦 إعادة التثبيت...
call npm install
echo  ✅ انتهى
pause
goto menu

:backup
cd /d "%~dp0"
set BACKUP_DIR=backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
if exist "server\data\db.json" (
    copy "server\data\db.json" "%BACKUP_DIR%\db_%TIMESTAMP%.json" >nul
    echo  ✅ تم الحفظ: %BACKUP_DIR%\db_%TIMESTAMP%.json
) else (
    echo  ⚠️  لا يوجد ملف بيانات
)
pause
goto menu

:stop
echo.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>nul
    echo  ✅ تم إيقاف السيرفر
)
pause
goto menu

:open
start http://localhost:3000
goto menu

:datafolder
explorer "%~dp0server\data"
goto menu

:end
echo.
echo  👋 إلى اللقاء
timeout /t 1 >nul
exit
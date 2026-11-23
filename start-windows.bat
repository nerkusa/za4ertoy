@echo off
chcp 65001 >nul
rem Запуск игры с домашнего компьютера: сервер + туннель Cloudflare.
rem Двойной щелчок по этому файлу. Закроешь окна — игра остановится.
cd /d "%~dp0"
if not exist build\index.html (
  echo Собираю сайт, это пара минут...
  call npm install
  call npm run build
)
cd server
if not exist node_modules call npm install
if not exist gm.local.bat (
  set /p L=Придумай логин мастера: 
  set /p P=Придумай пароль мастера: 
  call :savegm
)
if exist gm.local.bat (call gm.local.bat) else (call :usegm)
rem проверка: можно ли писать в папку (там хранится мир)
echo ok> _write_test.tmp 2>nul
if not exist _write_test.tmp (
  echo.
  echo ВНИМАНИЕ: нет прав на запись в %cd% — мир НЕ будет сохраняться.
  echo Открой PowerShell от имени администратора и выполни:
  echo   icacls C:\za4ertoy /grant "%USERNAME%:(OI)(CI)F" /T
  echo.
) else del _write_test.tmp
start "Туннель - ссылка для друзей" cmd /k cloudflared tunnel --url http://localhost:8788
echo.
echo Сервер игры запущен. Ссылка для друзей появится в окне "Туннель"
echo (строка https://....trycloudflare.com). Это окно не закрывай.
echo Мир хранится здесь: %cd%\data.json
echo.
node index.js
pause
exit /b

:savegm
> gm.local.bat echo set GM_LOGIN=%L%
>> gm.local.bat echo set GM_PASSWORD=%P%
exit /b

:usegm
set GM_LOGIN=%L%
set GM_PASSWORD=%P%
exit /b

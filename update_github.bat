@echo off
echo Updating GitHub Repository...
echo.

git add .
set /p commitMsg="Enter commit message (Press Enter for 'Auto update'): "
if "%commitMsg%"=="" set commitMsg=Auto update

git commit -m "%commitMsg%"
git push

echo.
echo Update Complete! Changes pushed to GitHub (and Vercel).
pause

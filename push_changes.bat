@echo off
cd /d "c:\Users\desch\OneDrive\Desktop\JVS Private"
echo === Git Status ===
git status
echo.
echo === Git Log ===
git log --oneline -3
echo.
echo === Adding all files ===
git add -A
echo.
echo === Committing ===
git commit -m "fix: remove 0 Children from quotation display"
echo.
echo === Pushing to origin main ===
git push origin main
echo.
echo === Done ===
pause

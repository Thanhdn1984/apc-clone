@echo off
chcp 65001 >nul
git add .
git commit -m "feat(release): Auto create and upload latest.yml in release script"
git push
pause

#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/home/ubuntu/.openclaw/workspace/agents/susan/github-scan-docx/docxautomator"
WEB_DIR="/var/www/docx.aistacklab.org"
LOG_DIR="/home/ubuntu/.openclaw/workspace/agents/susan/logs"
mkdir -p "$LOG_DIR"
cd "$APP_DIR"
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
  git reset --hard origin/main
fi
npm ci --no-audit --no-fund
npm run build
sudo mkdir -p "$WEB_DIR"
sudo rsync -a --delete dist/ "$WEB_DIR/"
sudo install -m 0644 deploy/feedback.html "$WEB_DIR/feedback.html"
sudo install -m 0644 deploy/thanks.html "$WEB_DIR/thanks.html"
printf '%s deployed %s\n' "$(date -Is)" "$(git rev-parse --short HEAD)" | sudo tee "$WEB_DIR/deploy-version.txt" >/dev/null

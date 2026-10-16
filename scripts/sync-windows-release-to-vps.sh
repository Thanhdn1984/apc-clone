#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(git config --get remote.origin.url | sed -E 's#.*github.com[:/]([^/]+/[^/.]+)(\.git)?#\1#')}"
TAG="${TAG:-windows-latest}"
DEST="${DEST:-/var/www/docx.aistacklab.org/downloads}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP"
gh release download "$TAG" -R "$REPO" \
  -p 'DocXAutomationTool-Latest-Setup.exe' \
  -p 'DocXAutomationTool-Latest-Portable.exe' \
  -D "$TMP" --clobber

sudo mkdir -p "$DEST"
sudo install -m 0644 "$TMP/DocXAutomationTool-Latest-Setup.exe" "$DEST/DocXAutomationTool-Latest-Setup.exe"
sudo install -m 0644 "$TMP/DocXAutomationTool-Latest-Portable.exe" "$DEST/DocXAutomationTool-Latest-Portable.exe"

ls -lh "$DEST/DocXAutomationTool-Latest-Setup.exe" "$DEST/DocXAutomationTool-Latest-Portable.exe"
for f in DocXAutomationTool-Latest-Setup.exe DocXAutomationTool-Latest-Portable.exe; do
  curl -fsSI "https://docx.aistacklab.org/downloads/$f" | sed -n '1,8p'
done

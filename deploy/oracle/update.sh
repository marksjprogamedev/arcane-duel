#!/usr/bin/env bash
# Deploys the newest commit of the branch the VM is on. Run on the VM:
#   /opt/arcane-duel/deploy/oracle/update.sh
# or from your machine:
#   ssh ubuntu@<vm-ip> /opt/arcane-duel/deploy/oracle/update.sh
set -euo pipefail
APP_DIR=/opt/arcane-duel
cd "$APP_DIR"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git fetch origin
git reset --hard "origin/$BRANCH"
npm ci --omit=dev # postinstall rebuilds dist/
sudo systemctl restart arcane-duel
sleep 2
curl -fsS http://localhost:3036/stats >/dev/null && echo "deployed $(git log --oneline -1)"

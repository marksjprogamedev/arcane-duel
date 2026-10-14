#!/usr/bin/env bash
# One-time setup of an Oracle Cloud (or any Ubuntu 24.04) VM to run Arcane Duel.
# Run on the VM as the default `ubuntu` user (see docs/DEPLOY-ORACLE.md):
#
#   curl -fsSL https://raw.githubusercontent.com/marksjprogamedev/arcane-duel/<branch>/deploy/oracle/setup.sh \
#     | bash -s -- <branch> [domain]
#
# Without a domain the game is served over plain HTTP on port 80 (http://<vm-ip>/).
# With a domain pointing at the VM, Caddy gets a certificate and serves HTTPS.
# Safe to run again (e.g. to add a domain later).
set -euo pipefail

BRANCH="${1:?usage: setup.sh <branch> [domain]}"
DOMAIN="${2:-}"
REPO="https://github.com/marksjprogamedev/arcane-duel.git"
APP_DIR=/opt/arcane-duel
PORT=3036

echo "== swap (the 1 GB E2.1.Micro runs out of memory building the client without it)"
if ! swapon --show | grep -q .; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "== packages (git, Caddy, Node.js 24)"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git curl caddy iptables-persistent
if ! node --version 2>/dev/null | grep -q '^v24\.'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "== firewall: allow HTTP and HTTPS"
# Oracle's Ubuntu images reject everything but SSH in iptables, on top of the VCN security list.
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$p" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null ||
    sudo iptables -I INPUT 1 -p tcp --dport "$p" -m conntrack --ctstate NEW -j ACCEPT
done
sudo netfilter-persistent save

echo "== app: $BRANCH -> $APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER:$USER" "$APP_DIR"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi
# installs runtime dependencies only; postinstall builds client and server into dist/
(cd "$APP_DIR" && npm ci --omit=dev)

echo "== service"
sudo tee /etc/systemd/system/arcane-duel.service >/dev/null <<EOF
[Unit]
Description=Arcane Duel game server
After=network-online.target
Wants=network-online.target

[Service]
User=$USER
WorkingDirectory=$APP_DIR
Environment=PORT=$PORT
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now arcane-duel
sudo systemctl restart arcane-duel

echo "== Caddy in front (HTTPS when a domain is given; WebSockets pass through)"
SITE="${DOMAIN:-:80}"
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$SITE {
	reverse_proxy localhost:$PORT
}
EOF
sudo systemctl reload caddy || sudo systemctl restart caddy

sleep 2
if curl -fsS "http://localhost:$PORT/stats" >/dev/null; then
  IP=$(curl -fsS https://api.ipify.org || echo '<vm-ip>')
  echo "== done: open ${DOMAIN:+https://$DOMAIN/}${DOMAIN:-http://$IP/}"
else
  echo "== the game server is not answering; see: journalctl -u arcane-duel -n 50" >&2
  exit 1
fi

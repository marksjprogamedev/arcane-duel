#!/usr/bin/env bash
# One-time setup of an Oracle Cloud (or any Ubuntu 24.04) VM to run Arcane Duel, with three slots:
# main (port 80, always the main branch) and test1/test2 (ports 8081/8082, any branch).
# Run on the VM as the default `ubuntu` user (see docs/DEPLOY-ORACLE.md):
#
#   curl -fsSL https://raw.githubusercontent.com/marksjprogamedev/arcane-duel/main/deploy/oracle/setup.sh \
#     | bash -s -- [domain]
#
# Without a domain the slots are served over plain HTTP on the VM's IP. With a domain pointing at
# the VM, Caddy gets certificates for <domain>, test1.<domain> and test2.<domain> and serves HTTPS.
# Safe to run again (e.g. to add a domain later). Deploy branches afterwards with `arcane-deploy`.
set -euo pipefail

DOMAIN="${1:-}"
REPO="https://github.com/marksjprogamedev/arcane-duel.git"
ROOT=/srv/arcane-duel

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

echo "== firewall: allow 80, 443 and the test slots 8081-8082"
# Oracle's Ubuntu images reject everything but SSH in iptables, on top of the VCN security list.
for p in 80 443 8081 8082; do
  sudo iptables -C INPUT -p tcp --dport "$p" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null ||
    sudo iptables -I INPUT 1 -p tcp --dport "$p" -m conntrack --ctstate NEW -j ACCEPT
done
sudo netfilter-persistent save

echo "== service template (one instance per slot: arcane-duel@main, @test1, @test2)"
sudo mkdir -p /etc/arcane-duel "$ROOT"
sudo chown "$USER:$USER" "$ROOT"
curl -fsS https://api.ipify.org | sudo tee /etc/arcane-duel/ip >/dev/null || true
echo "$DOMAIN" | sudo tee /etc/arcane-duel/domain >/dev/null
sudo tee /etc/systemd/system/arcane-duel@.service >/dev/null <<EOF
[Unit]
Description=Arcane Duel game server (%i)
After=network-online.target
Wants=network-online.target

[Service]
User=$USER
WorkingDirectory=$ROOT/%i
EnvironmentFile=/etc/arcane-duel/%i.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload

# Earlier versions of this script ran a single copy as arcane-duel.service from /opt/arcane-duel.
if [ -f /etc/systemd/system/arcane-duel.service ]; then
  echo "== removing the old single-copy install"
  sudo systemctl disable --now arcane-duel
  sudo rm /etc/systemd/system/arcane-duel.service
  sudo systemctl daemon-reload
  sudo rm -rf /opt/arcane-duel
fi

echo "== Caddy in front (WebSockets pass through)"
if [ -n "$DOMAIN" ]; then
  SITES=("$DOMAIN" "test1.$DOMAIN" "test2.$DOMAIN")
else
  SITES=(":80" ":8081" ":8082")
fi
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
${SITES[0]} {
	reverse_proxy localhost:3036
}
${SITES[1]} {
	reverse_proxy localhost:3037
}
${SITES[2]} {
	reverse_proxy localhost:3038
}
EOF
sudo systemctl reload caddy || sudo systemctl restart caddy

echo "== main slot"
[ -d "$ROOT/main/.git" ] || git clone --quiet "$REPO" "$ROOT/main"
git -C "$ROOT/main" fetch --quiet origin
if [ -f "$ROOT/main/deploy/oracle/arcane-deploy" ] && [ ! -x /usr/local/bin/arcane-deploy ]; then
  git -C "$ROOT/main" checkout --quiet -B main origin/main
  sudo install -m 755 "$ROOT/main/deploy/oracle/arcane-deploy" /usr/local/bin/arcane-deploy
fi
# (arcane-deploy main installs both scripts from the main checkout from then on)
arcane-deploy main

# Once the deployed main has caddy.sh, Caddy serves the built client itself and only passes the game
# traffic (/ws, /stats, /version) to Node. Until then the plain proxy above keeps working: the Node
# processes still serve the client.
if [ -f "$ROOT/main/deploy/oracle/caddy.sh" ]; then
  echo "== Caddy serves the client files"
  bash "$ROOT/main/deploy/oracle/caddy.sh" "$DOMAIN"
fi
echo
arcane-deploy status

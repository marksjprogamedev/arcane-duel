#!/usr/bin/env bash
# One-time setup of an Oracle Cloud (or any Ubuntu 24.04) VM to run Arcane Duel, with four slots:
# main (port 80, always the main branch) and test1/test2/test3 (ports 8081/8082/8083, any branch).
# Run on the VM as the default `ubuntu` user (see docs/DEPLOY-ORACLE.md):
#
#   curl -fsSL https://raw.githubusercontent.com/marksjprogamedev/arcane-duel/main/deploy/oracle/setup.sh \
#     | bash -s -- [domain]
#
# Without a domain the slots are served over plain HTTP on the VM's IP. With a domain pointing at
# the VM, Caddy gets certificates for <domain>, mark.<domain>, jesse.<domain> and adnan.<domain> (slots
# test1-3) and serves HTTPS; for a *.duckdns.org domain, put the token in /etc/arcane-duel/duckdns-token first.
# Safe to run again (e.g. to add a domain later). Deploy branches afterwards with `arcane-deploy`.
set -euo pipefail

DOMAIN="${1:-}"
REPO="https://github.com/marksjprogamedev/arcane-duel.git"
ROOT=/srv/arcane-duel

# Path of a script from deploy/oracle/: next to this file when run from a checkout, else from the main
# checkout (when this script is piped in with curl).
HERE=
if [ -f "${BASH_SOURCE[0]:-}" ]; then HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd); fi
oracle_script() {
  if [ -n "$HERE" ] && [ -f "$HERE/$1" ]; then echo "$HERE/$1"; else echo "$ROOT/main/deploy/oracle/$1"; fi
}

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

echo "== firewall: allow 80, 443 and the test slots 8081-8083"
# Oracle's Ubuntu images reject everything but SSH in iptables, on top of the VCN security list.
for p in 80 443 8081 8082 8083; do
  sudo iptables -C INPUT -p tcp --dport "$p" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null ||
    sudo iptables -I INPUT 1 -p tcp --dport "$p" -m conntrack --ctstate NEW -j ACCEPT
done
sudo netfilter-persistent save

echo "== service template (one instance per slot: arcane-duel@main, @test1, @test2, @test3)"
sudo mkdir -p /etc/arcane-duel "$ROOT"
sudo chown "$USER:$USER" "$ROOT"
curl -fsS https://api.ipify.org | sudo tee /etc/arcane-duel/ip >/dev/null || true
echo "$DOMAIN" | sudo tee /etc/arcane-duel/domain >/dev/null
# The main checkout carries the deploy scripts, so it is cloned (or brought up to date) first.
[ -d "$ROOT/main/.git" ] || git clone --quiet "$REPO" "$ROOT/main"
git -C "$ROOT/main" fetch --quiet origin
git -C "$ROOT/main" checkout --quiet -B main origin/main
bash "$(oracle_script service.sh)"

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
  SITES=("$DOMAIN" "mark.$DOMAIN" "jesse.$DOMAIN" "adnan.$DOMAIN")
else
  SITES=(":80" ":8081" ":8082" ":8083")
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
${SITES[3]} {
	reverse_proxy localhost:3039
}
EOF
sudo systemctl reload caddy || sudo systemctl restart caddy

echo "== main slot"
if [ -f "$ROOT/main/deploy/oracle/arcane-deploy" ] && [ ! -x /usr/local/bin/arcane-deploy ]; then
  sudo install -m 755 "$ROOT/main/deploy/oracle/arcane-deploy" /usr/local/bin/arcane-deploy
fi
# (arcane-deploy main installs arcane-deploy, arcane-deploy-ci and arcane-admin from the main checkout
# from then on)
arcane-deploy main
# again here in case the installed arcane-deploy predates arcane-admin
if [ -f "$ROOT/main/deploy/oracle/arcane-admin" ]; then
  sudo install -m 755 "$ROOT/main/deploy/oracle/arcane-admin" /usr/local/bin/arcane-admin
fi

# Once the deployed main has caddy.sh, Caddy serves the built client itself and only passes the game
# traffic (/ws, /stats, /version) to Node. Until then the plain proxy above keeps working: the Node
# processes still serve the client.
if [ -f "$ROOT/main/deploy/oracle/caddy.sh" ]; then
  echo "== Caddy serves the client files"
  bash "$ROOT/main/deploy/oracle/caddy.sh" "$DOMAIN"
fi
if [ -f "$ROOT/main/deploy/oracle/duckdns.sh" ]; then
  echo "== DuckDNS keep-alive"
  bash "$ROOT/main/deploy/oracle/duckdns.sh" "$DOMAIN"
fi
echo "== nightly database backup of main"
bash "$(oracle_script backup-timer.sh)"
echo
arcane-deploy status

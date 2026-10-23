#!/usr/bin/env bash
# Installs a weekly systemd timer that tells DuckDNS the VM's IP again. The IP is static, so this is
# only a keep-alive (DuckDNS does not document whether unused names expire). Called by setup.sh for a
# *.duckdns.org domain; safe to run again:
#
#   bash /srv/arcane-duel/<slot>/deploy/oracle/duckdns.sh [domain]
#
# Needs the account token in /etc/arcane-duel/duckdns-token (root only, mode 600; never in the repo).
set -euo pipefail

DOMAIN="${1-$(cat /etc/arcane-duel/domain 2>/dev/null || true)}"
NAME="${DOMAIN%.duckdns.org}"
if [ -z "$DOMAIN" ] || [ "$NAME" = "$DOMAIN" ]; then
  echo "not a duckdns.org domain ('$DOMAIN'); nothing to do"
  exit 0
fi
if ! sudo test -s /etc/arcane-duel/duckdns-token; then
  echo "no token in /etc/arcane-duel/duckdns-token; see docs/DEPLOY-ORACLE.md" >&2
  exit 1
fi

# The token goes to curl on stdin (-K -), not on its command line, so `ps` never shows it.
sudo tee /usr/local/bin/duckdns-refresh >/dev/null <<EOF
#!/usr/bin/env bash
set -euo pipefail
printf 'url = "https://www.duckdns.org/update?domains=%s&token=%s&ip=%s"\n' \\
  '$NAME' "\$(cat /etc/arcane-duel/duckdns-token)" "\$(cat /etc/arcane-duel/ip)" |
  curl -fsS --max-time 30 -K - | grep -qx OK
EOF
sudo chmod 755 /usr/local/bin/duckdns-refresh

sudo tee /etc/systemd/system/duckdns-refresh.service >/dev/null <<'EOF'
[Unit]
Description=Re-send the VM's IP to DuckDNS
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/duckdns-refresh
EOF
sudo tee /etc/systemd/system/duckdns-refresh.timer >/dev/null <<'EOF'
[Unit]
Description=Weekly DuckDNS keep-alive

[Timer]
OnCalendar=weekly
RandomizedDelaySec=6h
Persistent=true

[Install]
WantedBy=timers.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now --quiet duckdns-refresh.timer
sudo systemctl start duckdns-refresh.service
echo "DuckDNS refresh for $NAME works; next run: $(systemctl show -p NextElapseUSecRealtime --value duckdns-refresh.timer)"

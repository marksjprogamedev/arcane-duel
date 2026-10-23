#!/usr/bin/env bash
# Writes the systemd template arcane-duel@.service (one instance per slot: arcane-duel@main, @test1,
# @test2, @test3) and reloads systemd. Called by setup.sh; run it on its own to apply a new version of
# the template to a running server:
#
#   bash /srv/arcane-duel/<slot>/deploy/oracle/service.sh
#
# Each slot keeps its database in /var/lib/arcane-duel/<slot>/arcane.db (systemd creates the folder,
# owned by the service user, mode 700). It is outside the git checkout, so deploys, rebuilds and
# `git reset` never touch it. MemoryHigh squeezes a runaway slot before it can starve the others.
#
# It does not restart anything: running slots pick the new template up on their next restart or
# deploy (it prints the commands). Safe to run again.
set -euo pipefail

ROOT=/srv/arcane-duel
# The game runs as whoever owns the checkouts (setup.sh makes that the `ubuntu` user), never as root,
# even when this script is run with sudo.
RUN_AS=$(stat -c %U "$ROOT" 2>/dev/null || true)
[ -n "$RUN_AS" ] && [ "$RUN_AS" != root ] || RUN_AS=${SUDO_USER:-$USER}
if [ "$RUN_AS" = root ]; then
  echo "can't tell which user runs the game ($ROOT missing or owned by root); run setup.sh first" >&2
  exit 1
fi

NEW=$(mktemp)
cat >"$NEW" <<EOF
[Unit]
Description=Arcane Duel game server (%i)
After=network-online.target
Wants=network-online.target

[Service]
User=$RUN_AS
WorkingDirectory=$ROOT/%i
EnvironmentFile=/etc/arcane-duel/%i.env
Environment=NODE_ENV=production
# The slot's database: /var/lib/arcane-duel/%i, created by systemd, outside the checkout.
StateDirectory=arcane-duel/%i
StateDirectoryMode=0700
Environment=ARCANE_DB_PATH=/var/lib/arcane-duel/%i/arcane.db
# Above this the slot is slowed down and pushed to swap (not killed), before it can starve the others.
MemoryHigh=200M
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

UNIT=/etc/systemd/system/arcane-duel@.service
if [ -f "$UNIT" ] && cmp -s "$NEW" "$UNIT"; then
  rm -f "$NEW"
  echo "service template unchanged ($UNIT)"
  exit 0
fi
sudo install -m 644 "$NEW" "$UNIT"
rm -f "$NEW"
sudo systemctl daemon-reload
echo "service template written ($UNIT)"

# Running slots keep the old settings until they restart. Restarting ends the matches on that slot,
# so that is left to a person (a deploy restarts the slot anyway).
running=()
for slot in main test1 test2 test3; do
  systemctl is-active --quiet "arcane-duel@$slot" && running+=("$slot")
done
if [ ${#running[@]} -gt 0 ]; then
  echo "running slots use the new template after their next deploy or restart; to apply it now:"
  for slot in "${running[@]}"; do
    echo "  sudo systemctl restart arcane-duel@$slot"
  done
  echo "(test slots first; main last, when no match is on: a restart ends its running matches)"
fi

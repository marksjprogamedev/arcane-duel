#!/usr/bin/env bash
# Installs the nightly backup of main's database: `age` (to encrypt), /usr/local/bin/arcane-backup and
# a systemd timer, arcane-backup.timer, that runs it every day at 03:00 Perth time (19:00 UTC; Perth has
# no daylight saving). Called by setup.sh; safe to run again:
#
#   bash /srv/arcane-duel/<slot>/deploy/oracle/backup-timer.sh
#
# arcane-backup runs backup.sh from main's checkout, or from test2's (Jesse's slot) while main does not
# have it yet: the backup scripts reach test2 before they are merged into main. The choice is made at
# every run, so once main has backup.sh it is used without running this again. What backup.sh needs
# (the age public key, the Object Storage key) is in docs/DEPLOY-ORACLE.md, "Database and backups".
set -euo pipefail

echo "== age (encrypts the backups)"
if ! command -v age >/dev/null; then
  sudo apt-get update -y -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq age
fi
age --version

# `arcane-backup [slot]` (default main), also handy by hand: sudo arcane-backup
sudo tee /usr/local/bin/arcane-backup >/dev/null <<'EOF'
#!/usr/bin/env bash
# Runs the newest backup.sh available on this server: main's checkout first, else test2's.
set -euo pipefail
for dir in main test2; do
  script=/srv/arcane-duel/$dir/deploy/oracle/backup.sh
  [ -f "$script" ] && exec bash "$script" "${1:-main}"
done
echo "no backup.sh in /srv/arcane-duel/main or /srv/arcane-duel/test2" >&2
exit 1
EOF
sudo chmod 755 /usr/local/bin/arcane-backup

sudo tee /etc/systemd/system/arcane-backup.service >/dev/null <<'EOF'
[Unit]
Description=Back up main's Arcane Duel database (encrypted, to Object Storage)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/arcane-backup main
# Stay out of the way of running matches.
Nice=10
IOSchedulingClass=idle
EOF
sudo tee /etc/systemd/system/arcane-backup.timer >/dev/null <<'EOF'
[Unit]
Description=Nightly backup of main's Arcane Duel database (03:00 Perth)

[Timer]
OnCalendar=*-*-* 19:00:00 UTC
RandomizedDelaySec=10m
Persistent=true

[Install]
WantedBy=timers.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now --quiet arcane-backup.timer
echo "backup timer on; next run: $(systemctl show -p NextElapseUSecRealtime --value arcane-backup.timer)"
[ -f /etc/arcane-duel/backup-age-recipient ] ||
  echo "still needed before the first backup: /etc/arcane-duel/backup-age-recipient (see docs/DEPLOY-ORACLE.md)"
sudo test -f /etc/arcane-duel/backup.env ||
  echo "no /etc/arcane-duel/backup.env yet: backups stay on this server only (see docs/DEPLOY-ORACLE.md)"

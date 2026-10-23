#!/usr/bin/env bash
# Copies database backups from the server to this machine (Jesse's laptop), into ~/arcane-duel-backups/,
# and, when the private key ~/.config/arcane-duel/backup-key.txt is here, decrypts the newest one to a
# plain SQLite file next to it and prints its path. Run from the repo:
#
#   scripts/pull-backup.sh [--latest-only | --all] [--slot <slot>] [--host <user@host>]
#
#   --latest-only   only the newest backup (the default)
#   --all           every backup still on the server (the newest 7 per slot)
#   --slot          whose backups (default main)
#   --host          the server (default ubuntu@159.13.37.255, or $ARCANE_HOST)
#
# Files already here are not copied again. Needs ssh access to the server, and `age` to decrypt
# (Ubuntu/WSL: sudo apt-get install age; macOS: brew install age).
set -euo pipefail

HOST=${ARCANE_HOST:-ubuntu@159.13.37.255}
SLOT=main
ALL=false
DEST=$HOME/arcane-duel-backups
KEY=$HOME/.config/arcane-duel/backup-key.txt
REMOTE=/var/backups/arcane-duel

while [ $# -gt 0 ]; do
  case "$1" in
    --latest-only) ALL=false ;;
    --all) ALL=true ;;
    --slot) SLOT=${2:?--slot needs a slot}; shift ;;
    --host) HOST=${2:?--host needs user@host}; shift ;;
    *)
      sed -n '6,11p' "$0" | sed 's/^# \{0,1\}//' >&2
      exit 1
      ;;
  esac
  shift
done
[[ $SLOT =~ ^(main|test1|test2|test3)$ ]] || { echo "unknown slot: $SLOT" >&2; exit 1; }

# Newest first (the names carry a UTC timestamp, so they sort by time).
mapfile -t files < <(ssh "$HOST" "ls -1 $REMOTE/arcane-$SLOT-*.db.gz.age 2>/dev/null | sort -r")
if [ ${#files[@]} -eq 0 ]; then
  echo "no backups of $SLOT found in $HOST:$REMOTE (or ssh failed)" >&2
  exit 1
fi
$ALL || files=("${files[0]}")

mkdir -p "$DEST"
chmod 700 "$DEST"
for f in "${files[@]}"; do
  if [ -f "$DEST/$(basename "$f")" ]; then
    echo "already here: $DEST/$(basename "$f")"
  else
    scp -q "$HOST:$f" "$DEST/"
    echo "copied: $DEST/$(basename "$f")"
  fi
done

NEWEST=$DEST/$(basename "${files[0]}")
if [ ! -f "$KEY" ]; then
  echo "no private key at $KEY; copied but not decrypted"
  exit 0
fi
command -v age >/dev/null || {
  echo "age is not installed here; copied but not decrypted (sudo apt-get install age)" >&2
  exit 1
}
DB=${NEWEST%.gz.age}
if [ ! -f "$DB" ]; then
  age -d -i "$KEY" "$NEWEST" | gunzip >"$DB.part"
  mv "$DB.part" "$DB"
  chmod 600 "$DB"
fi
echo "decrypted: $DB"

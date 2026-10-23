#!/usr/bin/env bash
# Backs up one slot's database: a consistent snapshot (SQLite's online backup, safe while the game
# runs), gzipped, encrypted with `age` for Jesse's public key, kept in /var/backups/arcane-duel/ (newest
# 7 per slot) and uploaded to Oracle Object Storage. Run nightly for main by arcane-backup.timer
# (backup-timer.sh); by hand, on the VM:
#
#   bash /srv/arcane-duel/<slot>/deploy/oracle/backup.sh [slot]      (default: main)
#
# Needs (see docs/DEPLOY-ORACLE.md, "Database and backups"):
#   /etc/arcane-duel/backup-age-recipient  the age public key (age1...; public, not a secret)
#   /etc/arcane-duel/backup.env            S3_ACCESS_KEY, S3_SECRET_KEY, S3_NAMESPACE, S3_BUCKET and
#                                          optionally S3_REGION (default ap-sydney-1); root only, mode 600.
#                                          Without it the encrypted copy is still kept locally.
# The VM never holds the private key, so it can't read its own backups. Exits 0 when the slot has no
# database yet, non-zero when a backup or upload fails.
set -euo pipefail

# Root reads backup.env and writes /var/backups; re-run with sudo if needed.
[ "$(id -u)" = 0 ] || exec sudo bash "$0" "$@"

SLOT=${1:-main}
case "$SLOT" in main | test1 | test2 | test3) ;; *)
  echo "usage: backup.sh [main|test1|test2|test3]" >&2
  exit 1
  ;;
esac
DB=/var/lib/arcane-duel/$SLOT/arcane.db
OUT=/var/backups/arcane-duel
RECIPIENT=/etc/arcane-duel/backup-age-recipient
ENV_FILE=/etc/arcane-duel/backup.env
KEEP=7

if [ ! -f "$DB" ]; then
  echo "no database for $SLOT yet ($DB); nothing to back up"
  exit 0
fi
command -v age >/dev/null || {
  echo "age is not installed; run deploy/oracle/backup-timer.sh (or: sudo apt-get install -y age)" >&2
  exit 1
}
grep -q '^age1' "$RECIPIENT" 2>/dev/null || {
  echo "no age public key (age1...) in $RECIPIENT; see docs/DEPLOY-ORACLE.md" >&2
  exit 1
}

# The snapshot runs as the database's owner (the game's user), never as root: opening the database
# can create its -wal/-shm files, and root-owned ones would stop the game from opening it.
OWNER=$(stat -c %U "$DB")
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
chown "$OWNER" "$WORK"
SNAP=$WORK/arcane.db

# node:sqlite's backup() copies page by page through SQLite itself, so the copy is consistent even
# while the game writes (a plain cp of a WAL database is not). Then a quick check that it opens.
cd "/srv/arcane-duel/$SLOT" 2>/dev/null || cd /
runuser -u "$OWNER" -- node --no-warnings --input-type=module - "$DB" "$SNAP" <<'JS'
import { DatabaseSync, backup } from 'node:sqlite';
const [src, dest] = process.argv.slice(2);
const db = new DatabaseSync(src, { timeout: 5000 });
const pages = await backup(db, dest);
db.close();
// One self-contained file (no -wal beside it); the game turns WAL back on when it opens a restore.
const copy = new DatabaseSync(dest);
copy.exec('PRAGMA journal_mode=DELETE');
const check = copy.prepare('PRAGMA quick_check').get();
const version = copy.prepare('PRAGMA user_version').get();
copy.close();
if (Object.values(check)[0] !== 'ok') {
  console.error('snapshot failed its check:', check);
  process.exit(1);
}
console.log(`snapshot: ${pages} pages, schema version ${Object.values(version)[0]}`);
JS

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
NAME=arcane-$SLOT-$STAMP.db.gz.age
# Readable by the game's user too, so scripts/pull-backup.sh can fetch it over ssh as ubuntu. The
# files are encrypted; only Jesse's private key opens them.
install -d -m 750 -o root -g "$(stat -c %G "$DB")" "$OUT"
gzip -9 -c "$SNAP" | age -R "$RECIPIENT" -o "$OUT/$NAME.part"
chgrp "$(stat -c %G "$DB")" "$OUT/$NAME.part"
chmod 640 "$OUT/$NAME.part"
mv "$OUT/$NAME.part" "$OUT/$NAME"
echo "encrypted copy: $OUT/$NAME ($(stat -c %s "$OUT/$NAME") bytes)"

# Keep the newest $KEEP of this slot (the names sort by time).
ls -1 "$OUT"/arcane-"$SLOT"-*.db.gz.age | sort -r | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -f "$old"
  echo "removed old copy: $old"
done

if [ ! -f "$ENV_FILE" ]; then
  echo "upload skipped: no $ENV_FILE (the local encrypted copy is kept)"
  exit 0
fi
# Read KEY=VALUE lines without running the file as a script.
declare -A CFG=()
while IFS='=' read -r key value; do
  key=${key//[[:space:]]/}
  [[ $key =~ ^S3_[A-Z_]+$ ]] || continue
  value=${value%$'\r'}
  value=${value#\"}
  value=${value%\"}
  value=${value#\'}
  value=${value%\'}
  CFG[$key]=$value
done <"$ENV_FILE"
REGION=${CFG[S3_REGION]:-ap-sydney-1}
for key in S3_ACCESS_KEY S3_SECRET_KEY S3_NAMESPACE S3_BUCKET; do
  if [ -z "${CFG[$key]:-}" ]; then
    echo "upload failed: $key is missing from $ENV_FILE (the local encrypted copy is kept)" >&2
    exit 1
  fi
done

# Oracle Object Storage's S3-compatible API, signed with AWS signature v4 by curl. The key pair goes
# to curl on stdin (-K -), not on its command line, so `ps` never shows it. The payload hash is sent
# so the signature covers the file itself.
URL="https://${CFG[S3_NAMESPACE]}.compat.objectstorage.$REGION.oraclecloud.com/${CFG[S3_BUCKET]}/$NAME"
SHA=$(sha256sum "$OUT/$NAME" | cut -d' ' -f1)
if ! printf 'user = "%s:%s"\n' "${CFG[S3_ACCESS_KEY]}" "${CFG[S3_SECRET_KEY]}" |
  curl -sS --fail-with-body --max-time 300 --retry 3 -K - --aws-sigv4 "aws:amz:$REGION:s3" \
    -H "x-amz-content-sha256: $SHA" -H 'Content-Type: application/octet-stream' \
    -T "$OUT/$NAME" "$URL" -o "$WORK/response" -w '%{http_code}\n' >"$WORK/status" 2>"$WORK/error"; then
  echo "upload failed ($(cat "$WORK/status" 2>/dev/null)): $(cat "$WORK/error")" >&2
  [ -s "$WORK/response" ] && head -c 1000 "$WORK/response" >&2 && echo >&2
  echo "(the local encrypted copy is kept: $OUT/$NAME)" >&2
  exit 1
fi
echo "uploaded: ${CFG[S3_BUCKET]}/$NAME"

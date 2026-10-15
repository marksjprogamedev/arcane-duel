#!/usr/bin/env bash
# Writes /etc/caddy/Caddyfile for the three slots and reloads Caddy. Caddy serves each slot's built
# client (dist/client) itself, compressed, and passes only /ws, /stats and /version to that slot's
# Node process, so Node spends its time on the matches. Called by setup.sh; run it on its own to
# change the Caddy config without redoing the whole setup:
#
#   bash /srv/arcane-duel/<slot>/deploy/oracle/caddy.sh [domain]
#
# The domain defaults to the one saved by setup.sh (empty = plain HTTP on the VM's IP). The new
# config is validated first; if Caddy rejects it, the running config is left alone.
set -euo pipefail

DOMAIN="${1-$(cat /etc/arcane-duel/domain 2>/dev/null || true)}"
ROOT=/srv/arcane-duel

# site <address> <internal port> <slot>
site() {
  cat <<SITE
$1 {
	@game path /ws /stats /version
	handle @game {
		reverse_proxy localhost:$2
	}
	handle {
		root * $ROOT/$3/dist/client
		encode zstd gzip
		@assets path /assets/*
		header @assets Cache-Control "public, max-age=31536000, immutable"
		@other not path /assets/*
		header @other Cache-Control "no-cache"
		header X-Content-Type-Options nosniff
		file_server
	}
}
SITE
}

if [ -n "$DOMAIN" ]; then
  SITES=("$DOMAIN" "test1.$DOMAIN" "test2.$DOMAIN")
else
  SITES=(":80" ":8081" ":8082")
fi

NEW=$(mktemp)
{
  site "${SITES[0]}" 3036 main
  site "${SITES[1]}" 3037 test1
  site "${SITES[2]}" 3038 test2
} >"$NEW"

if ! caddy validate --config "$NEW" --adapter caddyfile >/dev/null 2>&1; then
  caddy validate --config "$NEW" --adapter caddyfile || true
  echo "Caddy rejected the new config; the running one is unchanged (draft: $NEW)" >&2
  exit 1
fi
[ -f /etc/caddy/Caddyfile ] && sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.previous
sudo install -m 644 "$NEW" /etc/caddy/Caddyfile
rm -f "$NEW"
sudo systemctl reload caddy || sudo systemctl restart caddy
echo "Caddy now serves the client files itself (previous config: /etc/caddy/Caddyfile.previous)"

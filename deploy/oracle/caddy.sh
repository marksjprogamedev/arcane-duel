#!/usr/bin/env bash
# Writes /etc/caddy/Caddyfile for the four slots and reloads Caddy. Caddy serves each slot's built
# client (dist/client) itself, compressed, and passes only /ws, /api, /stats and /version to that
# slot's Node process, so Node spends its time on the matches. Called by setup.sh; run it on its own
# to change the Caddy config without redoing the whole setup:
#
#   bash /srv/arcane-duel/<slot>/deploy/oracle/caddy.sh [domain]
#
# With a domain (saved in /etc/arcane-duel/domain for next time) each slot gets an HTTPS name, by
# person: <domain> (main), mark.<domain> (test1), jesse.<domain> (test2), adnan.<domain> (test3).
# Caddy fetches and renews their certificates, and the old http://<ip>[:port]/ addresses redirect to
# them. Without a domain the slots are plain HTTP on the VM's IP (ports 80, 8081-8083).
#
# The new config is validated first; if Caddy rejects it, the running one is left alone.
# CADDY_PRINT=1 only prints the config (used by tests/deploy/caddy.test.ts).
set -euo pipefail

DOMAIN="${1-$(cat /etc/arcane-duel/domain 2>/dev/null || true)}"
IP="${CADDY_IP:-$(cat /etc/arcane-duel/ip 2>/dev/null || true)}"
ROOT=/srv/arcane-duel

# slot -> internal port, public test port, person (the slot's subdomain; main has none)
SLOTS=(main test1 test2 test3)
declare -A PORT=([main]=3036 [test1]=3037 [test2]=3038 [test3]=3039)
declare -A PUBLIC=([main]=80 [test1]=8081 [test2]=8082 [test3]=8083)
declare -A PERSON=([main]= [test1]=mark [test2]=jesse [test3]=adnan)

# site <address> <slot>
site() {
  cat <<SITE
$1 {
	@game path /ws /api/* /stats /version
	handle @game {
		reverse_proxy localhost:${PORT[$2]}
	}
	handle {
		root * $ROOT/$2/dist/client
		encode zstd gzip
		@assets path /assets/*
		header @assets Cache-Control "public, max-age=31536000, immutable"
		@other not path /assets/*
		header @other Cache-Control "no-cache"
		file_server
	}
	header X-Content-Type-Options nosniff
	header X-Frame-Options DENY
	header Referrer-Policy same-origin
}
SITE
}

# redirect <address> <target host>
redirect() {
  cat <<SITE
$1 {
	redir https://$2{uri} permanent
}
SITE
}

host_of() { [ -n "${PERSON[$1]}" ] && echo "${PERSON[$1]}.$DOMAIN" || echo "$DOMAIN"; }

NEW=$(mktemp)
{
  for slot in "${SLOTS[@]}"; do
    if [ -n "$DOMAIN" ]; then
      site "$(host_of "$slot")" "$slot"
      # old bookmarks: http://<ip>/ and http://<ip>:808x/
      if [ "${PUBLIC[$slot]}" = 80 ]; then
        [ -n "$IP" ] && redirect "http://$IP" "$(host_of "$slot")"
      else
        redirect "http://:${PUBLIC[$slot]}" "$(host_of "$slot")"
      fi
    else
      site ":${PUBLIC[$slot]}" "$slot"
    fi
  done
} >"$NEW"

if [ -n "${CADDY_PRINT:-}" ]; then
  cat "$NEW"
  rm -f "$NEW"
  exit 0
fi

if ! caddy validate --config "$NEW" --adapter caddyfile >/dev/null 2>&1; then
  caddy validate --config "$NEW" --adapter caddyfile || true
  echo "Caddy rejected the new config; the running one is unchanged (draft: $NEW)" >&2
  exit 1
fi
[ -f /etc/caddy/Caddyfile ] && sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.previous
sudo install -m 644 "$NEW" /etc/caddy/Caddyfile
rm -f "$NEW"
sudo mkdir -p /etc/arcane-duel
echo "$DOMAIN" | sudo tee /etc/arcane-duel/domain >/dev/null
sudo systemctl reload caddy || sudo systemctl restart caddy
if [ -n "$DOMAIN" ]; then
  echo "Caddy serves https://$DOMAIN/ and the person subdomains (previous config: /etc/caddy/Caddyfile.previous)"
else
  echo "Caddy serves plain HTTP on the IP (previous config: /etc/caddy/Caddyfile.previous)"
fi

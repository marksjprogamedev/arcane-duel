# Hosting on Oracle Cloud (Always Free, Australia)

A small always-on Ubuntu VM in Sydney or Melbourne, with Caddy in front of the game server.
No code changes are needed: the client connects back to whatever host served the page.

**Current server:** VM.Standard.E2.1.Micro (1/8 core, 1 GB RAM) in Sydney, `159.13.37.255`, user
`ubuntu`. Free, always on, ~50 ms from Perth. Sections 1-2 below are for building a new one.

## 1. Account and VM (once, in the Oracle console)

1. Sign up at cloud.oracle.com. **Home region: Australia East (Sydney) or Australia Southeast
   (Melbourne).** Always Free resources only exist in the home region and it can't be changed.
   A card is needed for verification; stay on the free tier (don't upgrade to Pay As You Go
   unless you mean to).
2. Compute -> Instances -> Create instance:
   - Image: **Canonical Ubuntu 24.04**.
   - Shape: **Ampere (VM.Standard.A1.Flex), 1 OCPU, 6 GB** is plenty (one match uses ~5% of a
     core), but Sydney often reports "out of capacity" (it has a single availability domain). Then
     use **VM.Standard.E2.1.Micro** (Specialty and previous generation); it handles a couple of busy
     matches. `setup.sh` adds a 2 GB swap file because 1 GB is too little to build the client.
   - Networking: create a new VCN with a public subnet, assign a public IPv4 address.
   - SSH keys: upload your public key (`~/.ssh/id_ed25519.pub`; make one with
     `ssh-keygen -t ed25519` if needed).
3. Open ports 80 and 443: Networking -> Virtual cloud networks -> your VCN -> Security ->
   default security list -> Add ingress rules: source `0.0.0.0/0`, TCP, destination ports `80,443`,
   and another for `8081-8083` (the test slots).
4. Note the instance's public IP.

## 2. Install the game (on the VM)

`setup.sh` installs Node 24, Caddy and a systemd service template, opens the VM's own firewall for
80/443/8081/8082/8083 (Oracle's Ubuntu image blocks everything but SSH on top of the console's rules),
and deploys `main`. It is safe to run again.

```bash
ssh ubuntu@<vm-ip>
curl -fsSL https://raw.githubusercontent.com/marksjprogamedev/arcane-duel/main/deploy/oracle/setup.sh | bash
```

This deploys `main` to `http://<vm-ip>/`. Plain HTTP works for the game (WebSockets go over `ws://`).

### HTTPS with DuckDNS (on since 0.36.0)

The live server uses **`arcaneduel.duckdns.org`**, a free DuckDNS name (owner: Jesse's GitHub login at duckdns.org; IPv4
`159.13.37.255`, IPv6 left empty because the VM has none). Every name under it points at the same IP, so the
slots are subdomains by person, and Caddy fetches and renews one Let's Encrypt certificate per name by itself
(HTTP-01 on port 80). The old `http://<vm-ip>[:808x]/` addresses redirect to the new names.

For a new VM or a new name:

1. At duckdns.org: claim the name, set its IPv4 to the VM's IP. No extra names are needed for the slots.
2. Put the account token on the VM (in your own terminal, so it stays out of chats and logs):
   `ssh ubuntu@<vm-ip> 'sudo install -d -m 755 /etc/arcane-duel && read -rsp "token: " t && echo "$t" | sudo tee /etc/arcane-duel/duckdns-token >/dev/null && sudo chmod 600 /etc/arcane-duel/duckdns-token'`
3. Run the setup with the domain (or, on a running server, just the two scripts from any slot's checkout):

```bash
curl -fsSL https://raw.githubusercontent.com/marksjprogamedev/arcane-duel/main/deploy/oracle/setup.sh \
  | bash -s -- arcaneduel.duckdns.org
# or
ssh ubuntu@<vm-ip> 'bash /srv/arcane-duel/test2/deploy/oracle/caddy.sh arcaneduel.duckdns.org && bash /srv/arcane-duel/test2/deploy/oracle/duckdns.sh'
```

`duckdns.sh` installs a weekly timer (`duckdns-refresh.timer`) that re-sends the IP: the IP never changes, it
only keeps the name in use. Check it with `systemctl list-timers duckdns-refresh` and
`sudo systemctl start duckdns-refresh; journalctl -u duckdns-refresh -n 5`.

**If DuckDNS is down or gone:** the names stop resolving. Switch to a name that needs no account (it encodes the
IP): `ssh ubuntu@<vm-ip> bash /srv/arcane-duel/main/deploy/oracle/caddy.sh 159-13-37-255.sslip.io`. The slots
are then `https://159-13-37-255.sslip.io/`, `https://jesse.159-13-37-255.sslip.io/` and so on. Nothing is lost,
but cookies belong to a hostname, so anything stored per site in the browser starts empty. Switch back the
same way. **Certificates:** Caddy renews them about a month before they expire and retries on failure;
`journalctl -u caddy | grep -i -E 'acme|certificate'` shows what it did.

### Who serves what (Caddy and Node)

Caddy serves each slot's built client (`/srv/arcane-duel/<slot>/dist/client`) itself, compressed, and
passes only `/ws` (the game), `/api/*` (accounts, from 0.38), `/stats` and `/version` to that slot's Node
process. Every response gets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and
`Referrer-Policy: same-origin`. The hashed files
in `assets/` are cached for good; the page and the images are revalidated each time. The Node process
can still serve the client (that is how `npm start` works locally), so an older Caddy config that
proxies everything keeps working too.

The config is written by `deploy/oracle/caddy.sh` (run by `setup.sh` after the first deploy). To
apply a new version of it to a running server, from any slot's checkout:

```bash
ssh ubuntu@<vm-ip> bash /srv/arcane-duel/test2/deploy/oracle/caddy.sh
```

It checks the new config with `caddy validate` first and leaves the running one alone if Caddy
rejects it. One Caddyfile covers all four slots, so this also changes the live site: try
`https://jesse.arcaneduel.duckdns.org/` and `https://arcaneduel.duckdns.org/` right after. To go back:

```bash
ssh ubuntu@<vm-ip> 'sudo cp /etc/caddy/Caddyfile.previous /etc/caddy/Caddyfile && sudo systemctl reload caddy'
```

## 3. Slots and deploying

The server runs up to four copies of the game, each from its own checkout:

| Slot    | Branch (usually)     | URL (with domain)         | URL (no domain)        |
| ------- | -------------------- | ------------------------- | ---------------------- |
| `main`  | always `main`        | `https://<domain>/`       | `http://<vm-ip>/`      |
| `test1` | `test` (Mark)        | `https://mark.<domain>/`  | `http://<vm-ip>:8081/` |
| `test2` | `test-jesse` (Jesse) | `https://jesse.<domain>/` | `http://<vm-ip>:8082/` |
| `test3` | `test-adnan` (Adnan) | `https://adnan.<domain>/` | `http://<vm-ip>:8083/` |

Workflow: branch off `main`, push, deploy the branch to a free test slot, test it, merge it into
`main` with a pull request, deploy `main`, delete the branch.

```bash
ssh ubuntu@<vm-ip> arcane-deploy test1 my-feature   # put a branch on test slot 1
ssh ubuntu@<vm-ip> arcane-deploy test1              # redeploy the newest commit of that branch
ssh ubuntu@<vm-ip> arcane-deploy main               # after merging: update the live site
ssh ubuntu@<vm-ip> arcane-deploy test1 stop         # free a slot
ssh ubuntu@<vm-ip> arcane-deploy status             # what every slot runs
```

Pushes deploy automatically once a branch is on a slot; see below.

## Automatic deploys (GitHub Actions)

`.github/workflows/deploy.yml` runs `arcane-deploy` over SSH:

- push to `main`: the live site redeploys
- push to any other branch: every test slot running that branch redeploys (if none, nothing
  happens). So put a branch on a slot once (`arcane-deploy test1 my-feature`, or the manual
  run below), and every push after that updates it.
- Actions -> Deploy to Oracle -> Run workflow: pick a slot and a branch, no SSH needed.

It logs in with a deploy key stored as the repository secret `ORACLE_DEPLOY_KEY`. On the server
that key is restricted (`restrict,command="/usr/local/bin/arcane-deploy-ci"` in
`~/.ssh/authorized_keys`), so it can only run `arcane-deploy` push/slot/status commands. To
replace the key: make a new pair, put the public half in `authorized_keys` with the same prefix
(removing the old line), and set the private half as the secret
(`gh secret set ORACLE_DEPLOY_KEY < key`). If the VM's IP or host key changes, update `HOST` and
`HOST_KEY` in the workflow.

## Checking on it

- Live numbers: `http://<vm-ip>/stats` (during a match `lastSecond.ticks` should be ~60 per match).
- Logs: `journalctl -u arcane-duel@main -f` (or `@test1`, `@test2`, `@test3`)
- Restart: `sudo systemctl restart arcane-duel@main` (they also restart by themselves on crash and reboot).
- Oracle may stop a free VM it considers idle (very low CPU, network and memory for ~7 days). It is
  stopped, not deleted: start it from the console and the services come back. Upgrading the account to
  Pay As You Go prevents this and keeps Always Free resources free, but only create Always Free shapes
  after that.
- Deploying a slot restarts only that slot, so a test deploy never interrupts `main`.
- Letting someone else deploy: they use Actions -> Deploy to Oracle -> Run workflow (needs write access
  to the repo), or you give them SSH access.

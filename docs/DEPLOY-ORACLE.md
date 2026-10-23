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
2. Put the account token on the VM, in an editor (a hidden `read` prompt over ssh lost the paste twice):
   `ssh ubuntu@<vm-ip>`, then `sudo install -d -m 755 /etc/arcane-duel`,
   `sudo nano /etc/arcane-duel/duckdns-token` (paste the token, Ctrl+O, Enter, Ctrl+X) and
   `sudo chmod 600 /etc/arcane-duel/duckdns-token`. Never paste it into a chat or commit it.
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
ssh ubuntu@<vm-ip> arcane-deploy test1 reset-db     # empty a test slot's database (never main)
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
`~/.ssh/authorized_keys`), so it can only run `arcane-deploy` push/slot/status commands (never
`reset-db`: deleting data needs someone logged in to the server). To
replace the key: make a new pair, put the public half in `authorized_keys` with the same prefix
(removing the old line), and set the private half as the secret
(`gh secret set ORACLE_DEPLOY_KEY < key`). If the VM's IP or host key changes, update `HOST` and
`HOST_KEY` in the workflow.

## Database and backups (from 0.37.0)

**Where the data lives.** Each slot has its own SQLite database, `/var/lib/arcane-duel/<slot>/arcane.db`
(plus `arcane.db-wal` and `arcane.db-shm` while it runs). `main` holds the real accounts; the test slots hold
throwaway test accounts. systemd creates the folder (`StateDirectory=` in `arcane-duel@.service`, owned by
`ubuntu`, mode 700) and tells the server where the file is (`ARCANE_DB_PATH`). It is outside the checkout, so
deploys, rebuilds and switching a slot's branch never touch it. The service template is written by
`deploy/oracle/service.sh` (run by `setup.sh`); it also caps each slot with `MemoryHigh=200M`. A new version of the
template applies to a slot on its next deploy or restart; `service.sh` never restarts anything itself.

**Migrations run on start.** A deploy restarts the slot; before it listens, the server brings the database up to
its version (after a copy, `pre-migrate-<n>.db`, in the same folder). A server that finds a database **newer**
than it knows refuses to start (the log says so: `journalctl -u arcane-duel@<slot> -n 50`). That happens when a
test slot is switched to an older branch. Fix on a test slot by wiping its database:

```bash
ssh ubuntu@<vm-ip> arcane-deploy test2 reset-db
```

It stops the slot, deletes `arcane.db`, `-wal` and `-shm` (the `pre-migrate-*.db` copies stay), and starts it
with an empty database. It refuses on `main`, and GitHub Actions can't run it. On `main` never reset: deploy a
newer `main`, or restore a backup (below).

### Backups

Every night at 03:00 Perth time (`arcane-backup.timer`, set up by `deploy/oracle/backup-timer.sh`), `backup.sh`
takes a consistent copy of `main`'s database while the game runs (SQLite's online backup; never a plain `cp`),
gzips it and encrypts it with `age` for Jesse's **public** key. The encrypted file is kept on the VM in
`/var/backups/arcane-duel/arcane-main-<UTC time>.db.gz.age` (newest 7) and uploaded to the private Object
Storage bucket `arcane-duel-backups`, which deletes files after 30 days. The VM can't decrypt its own backups;
only the private key on Jesse's laptop can, so a stolen backup is useless.

Run a backup by hand (any slot; without `/etc/arcane-duel/backup.env` it only keeps the local copy and says the
upload was skipped):

```bash
ssh ubuntu@<vm-ip> sudo arcane-backup          # main
ssh ubuntu@<vm-ip> sudo arcane-backup test2    # another slot
ssh ubuntu@<vm-ip> 'systemctl list-timers arcane-backup; journalctl -u arcane-backup -n 20'
```

Copy the newest to the laptop (into `~/arcane-duel-backups/`, decrypted next to it when the key is there):

```bash
scripts/pull-backup.sh                  # newest backup of main
scripts/pull-backup.sh --all            # every copy still on the VM
scripts/pull-backup.sh --slot test2
```

### One-time setup (Jesse)

Console menu names below were written from Oracle's documentation, not clicked through; the ones marked
_(not checked)_ may be named a little differently.

1. **Bucket.** Storage -> Object Storage & Archive Storage -> Buckets -> Create bucket. Name
   `arcane-duel-backups`, in the root compartment, Standard tier, visibility **private** (the default). Always
   Free includes 20 GB.
2. **Delete after 30 days.** Open the bucket -> Lifecycle policy rules -> Create rule: action **Delete**, 30
   days, enabled (done on the live server, 2026-10-23). Oracle only runs lifecycle rules once Object Storage itself may delete
   objects: Identity & Security -> Policies -> Create policy in the root compartment with the statement
   `Allow service objectstorage-ap-sydney-1 to manage object-family in tenancy` (exactly `in tenancy`, not
   `in compartment ...`). Bucket options: name scope **Namespace**, tier Standard, auto-tiering, versioning
   and object events off.
3. **Access key.** Profile icon (top right) -> My profile -> Customer secret keys -> Generate secret key (name it
   `arcane-backup`). Copy the **secret** at once: it is shown only once. The **access key** is the value shown
   in the list afterwards (40 hex characters, not the OCID); the secret is 44 characters ending in `=`. A new
   key can take a few minutes to work: until then uploads fail with `SignatureDoesNotMatch` ("The secret key
   required to complete authentication could not be found"). If it still fails after that, delete the key and
   generate a new one.
4. **Namespace.** Profile icon -> Tenancy: <name> -> Object storage namespace (a short random string). It is
   also on the bucket's details page.
5. **Credentials on the VM**, in an editor (a hidden `read` prompt over ssh lost the paste before):
   `ssh ubuntu@<vm-ip>`, then `sudo nano /etc/arcane-duel/backup.env`, type

   ```
   S3_ACCESS_KEY=<access key>
   S3_SECRET_KEY=<secret>
   S3_NAMESPACE=<namespace>
   S3_BUCKET=arcane-duel-backups
   S3_REGION=ap-sydney-1
   ```

   save (Ctrl+O, Enter, Ctrl+X), then `sudo chmod 600 /etc/arcane-duel/backup.env`. Never paste these into a
   chat or commit them.

6. **Encryption key, on the laptop** (needs `age`: `sudo apt-get install age`):

   ```bash
   mkdir -p ~/.config/arcane-duel && chmod 700 ~/.config/arcane-duel
   age-keygen -o ~/.config/arcane-duel/backup-key.txt     # prints "Public key: age1..."
   ```

   Put only the public key (the `age1...` line; it is not a secret) on the VM: `ssh ubuntu@<vm-ip>`,
   `sudo nano /etc/arcane-duel/backup-age-recipient`, paste the `age1...` line, save.
   **Keep a second copy of `backup-key.txt` somewhere safe** (a password manager or a USB stick in a drawer):
   if it is lost, every backup is useless.

7. Check: `ssh ubuntu@<vm-ip> sudo arcane-backup` should end with `uploaded: ...`, and the file shows up in the
   bucket in the console. Then `scripts/pull-backup.sh` on the laptop should print `decrypted: ...`.

### Restore

The private key is only on the laptop, so decrypt there and send the plain database to the VM. Example for
`main` (rehearse on `test2` first: same steps with `test2`):

```bash
# on the laptop: newest backup, decrypted (or pick an older one in ~/arcane-duel-backups/)
scripts/pull-backup.sh
scp ~/arcane-duel-backups/arcane-main-<time>.db ubuntu@<vm-ip>:/tmp/restore.db

# on the VM
ssh ubuntu@<vm-ip>
S=/var/lib/arcane-duel/main
sudo systemctl stop arcane-duel@main
sudo mkdir -p $S.before-restore && sudo cp -a $S/. $S.before-restore/   # keep what was there
sudo rm -f $S/arcane.db-wal $S/arcane.db-shm
sudo install -o ubuntu -g ubuntu -m 600 /tmp/restore.db $S/arcane.db
rm /tmp/restore.db
sudo systemctl start arcane-duel@main
journalctl -u arcane-duel@main -n 20     # migrations (if the backup is older) and "listening"
```

If the VM is gone: download the newest object from the bucket in the console (bucket -> object -> ... ->
Download), then `age -d -i ~/.config/arcane-duel/backup-key.txt <file>.db.gz.age | gunzip > restore.db` on the
laptop, and continue from the `scp` step on the new VM (after `setup.sh` and deploying `main`). Remove
`$S.before-restore` once the restored slot works.

## Accounts admin (from 0.38.0)

`arcane-admin <slot> <command>` looks after one slot's accounts (`node dist/server/admin.js` in that slot's
checkout, run as `ubuntu` against `/var/lib/arcane-duel/<slot>/arcane.db`). It works while the slot runs (the
server has the same database open in WAL mode and waits for the other's writes). Usernames can be typed in any
case. It is not available to GitHub Actions (only `arcane-deploy-ci` commands are).

```bash
ssh ubuntu@<vm-ip> arcane-admin main list            # newest 50 users (list 200: newest 200)
ssh ubuntu@<vm-ip> arcane-admin main show merlin     # details, sessions, ban reason (never hashes)
ssh ubuntu@<vm-ip> arcane-admin main reset-password merlin
ssh ubuntu@<vm-ip> arcane-admin main rename merlin "The Wizard"
ssh ubuntu@<vm-ip> arcane-admin main ban merlin "rude names in lobby"
ssh ubuntu@<vm-ip> arcane-admin main unban merlin
ssh ubuntu@<vm-ip> arcane-admin main delete merlin   # only says what would be deleted
ssh ubuntu@<vm-ip> arcane-admin main delete merlin --yes
ssh ubuntu@<vm-ip> arcane-admin test2 help
```

- `reset-password` prints a new password and a new recovery code **once** (only their hashes are stored) and
  logs the player out everywhere. Pass both on in person, not by chat or email.
- `rename` uses the same display-name rules as the game. `ban` logs the player out and stops them logging in
  until `unban`. `delete` removes the account with its sessions, saved look, friends and blocks; backups still
  hold it until they age out (30 days).
- What it prints is the only record: nothing goes to the systemd journal. Exit code 0 ok, 1 error (e.g. unknown
  user), 2 usage.
- A display name or reason is everything after the username (words joined with single spaces), so quotes are
  optional. Over `ssh` the VM's shell reads the line again: avoid `'`, `"`, `$` and the like there, or log in
  first.

`arcane-deploy main` installs it to `/usr/local/bin` (as it does `arcane-deploy`), and `setup.sh` too. Until
`test-jesse` is merged into `main`, install it by hand from the `test2` checkout:

```bash
ssh ubuntu@<vm-ip> sudo install -m 755 /srv/arcane-duel/test2/deploy/oracle/arcane-admin /usr/local/bin/arcane-admin
```

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

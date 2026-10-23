# Accounts and HTTPS: plan

Status: **draft for Jesse's approval** (written 2026-10-23 AWST, on 0.35.7-0). Nothing here is built yet.
Facts about free services were checked on 2026-10-23; the ones that could not be checked are listed in
[What could not be verified](#what-could-not-be-verified).

## 1. Decisions

### Made by Jesse

| Topic         | Decision                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data we hold  | The absolute minimum: username, password hash, display name. No email, real name, birthday or age.                                                    |
| Names         | Username is permanent (gone only when the account is deleted, by the player or by Jesse). Display name can be changed in settings.                    |
| Sign-in       | Username + password, no email.                                                                                                                        |
| Recovery      | A one-time recovery code shown at sign-up (and re-issued from Account); failing that, Jesse resets the password with an admin command.                |
| Sign-up       | Open to anyone with the URL, rate-limited. Jesse can ban or delete.                                                                                   |
| Display names | 3-16 letters, digits and spaces, small rude-word blocklist, **not unique**; the friends list shows `Merlin (@jesse)` to tell them apart.              |
| Guests        | Keep everything they have today (create/join rooms, local Workshop and loadouts, "Player N"). Accounts add persistence and friends.                   |
| v1 features   | Account + display name, Workshop look on the account, spellbook loadouts on the account, friends (requests, online status, invite to lobby; no chat). |
| Later         | Stats and match history, unlocks/cosmetics, reporting, Discord login, chat (probably never).                                                          |
| Slots         | A separate database per slot. `main` holds the real accounts; test slots hold throwaway test accounts.                                                |
| Domain        | A DuckDNS name; slots by person: `<name>.duckdns.org` (main), `jesse.`, `mark.`, `adnan.<name>.duckdns.org`.                                          |
| Backups       | Losing up to a day is acceptable: nightly encrypted snapshot of `main`'s database.                                                                    |

**Still open for Jesse:** the DuckDNS name itself (`arcaneduel` is assumed below; check it is free at
duckdns.org when signing in with GitHub).

### Technical choices (recommended, with reasons)

| Topic           | Choice                                                                                                                                                    | Why                                                                                                                                                                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order           | **HTTPS first, accounts after**                                                                                                                           | Cookies ignore ports, so on `http://159.13.37.255:808x` all four slots would share one login cookie. `Secure` cookies, `__Host-` cookies and `crypto.randomUUID` all need HTTPS. Doing HTTPS first means we never build for the insecure context.                                                                                     |
| Database        | **SQLite file on the VM**, via Node's built-in `node:sqlite`                                                                                              | Zero extra RAM (in-process), zero cost, zero network, nothing that pauses. Hosted free tiers pause or sleep (Supabase pauses after 7 idle days, Neon sleeps after 5 min, Oracle Autonomous DB stops after 7 idle days), D1 is Workers-only. One small module wraps it so we can swap to `better-sqlite3` if `node:sqlite` misbehaves. |
| Node            | Stay on Node 24, require **>= 24.16**                                                                                                                     | Node 24 already has `node:sqlite` (prints an "experimental" warning; text values with a NUL were cut short before 24.16) and `crypto.argon2`. No native modules to compile on a 1/8 core VM.                                                                                                                                          |
| Passwords       | **argon2id** via `crypto.argon2`, OWASP minimum: m=19 MiB, t=2, p=1                                                                                       | Built into Node, no dependency. scrypt at OWASP strength needs ~128 MiB per hash, too much for 1 GB. At most one hash at a time on the server (a queue), so logins can't starve a running match. Parameters stored with each hash so they can be raised later.                                                                        |
| Sessions        | Random 32-byte token in a cookie; the database stores only its SHA-256                                                                                    | Simple, revocable (log out, log out everywhere, ban). A stolen database copy gives no working sessions. No JWTs: nothing to gain at this size.                                                                                                                                                                                        |
| Account traffic | Sign up / log in / log out / password / delete over **HTTP `/api/*`**; everything else over the existing **WebSocket**                                    | Only an HTTP response can set an `HttpOnly` cookie. Profile saves, friends, presence and invites are live, and the WebSocket is already authenticated and pushes updates.                                                                                                                                                             |
| Data location   | `/var/lib/arcane-duel/<slot>/arcane.db` (systemd `StateDirectory`)                                                                                        | Outside the git checkout, so deploys, `git reset` and rebuilds never touch it.                                                                                                                                                                                                                                                        |
| Backups         | Nightly `node:sqlite` `backup()` -> gzip -> `age` encrypted -> Oracle Object Storage (Always Free), 30 days kept; script to pull a copy to Jesse's laptop | No extra always-on process (Litestream would be one, and could eat the free request quota). The VM only holds the age **public** key; the private key lives on Jesse's laptop, so a stolen backup is useless.                                                                                                                         |
| Secrets         | `/etc/arcane-duel/` files, root-owned, mode 0640, read via systemd `EnvironmentFile`                                                                      | The repo is public: nothing secret is ever committed. The only secrets are the DuckDNS token and the Object Storage key.                                                                                                                                                                                                              |

## 2. HTTPS with DuckDNS

**Chosen:** one DuckDNS name, with slots as sub-subdomains. Sub-subdomains of a DuckDNS name resolve to the
same IP (checked live), so each slot gets its own name and certificate with Caddy's normal HTTP-01
challenge. `duckdns.org` is on the Public Suffix List, so our certificates don't share Let's Encrypt's rate
limit (50 per week per registered domain) with other DuckDNS users.

| Slot (dir) | Branch       | Today                      | After                                 |
| ---------- | ------------ | -------------------------- | ------------------------------------- |
| `main`     | `main`       | http://159.13.37.255/      | https://arcaneduel.duckdns.org/       |
| `test1`    | `test`       | http://159.13.37.255:8081/ | https://mark.arcaneduel.duckdns.org/  |
| `test2`    | `test-jesse` | http://159.13.37.255:8082/ | https://jesse.arcaneduel.duckdns.org/ |
| `test3`    | `test-adnan` | http://159.13.37.255:8083/ | https://adnan.arcaneduel.duckdns.org/ |

Setup (once): sign in to duckdns.org with GitHub, claim the name, set its IP to `159.13.37.255`, store the token
in `/etc/arcane-duel/duckdns-token`. A weekly systemd timer re-sends the IP to DuckDNS (harmless, and guards
against any inactivity expiry, which DuckDNS doesn't document).

Changes: `caddy.sh` gets the person names (`mark`, `jesse`, `adnan`) instead of `test1/2/3.` and keeps the old
`http://<ip>:808x` addresses as permanent redirects to the new names (so old bookmarks work); `/api/*` joins
`/ws /stats /version` in the list Caddy passes to Node. `arcane-deploy`'s `public_url` prints the new names.
`AGENTS.md`, `docs/WORKFLOW.md`, `docs/DEPLOY-ORACLE.md` and `docs/UI.md` get the new URLs. The client already
picks `wss://` on https (`client/src/net/client.ts`). Caddy adds headers on every site:
`X-Frame-Options: DENY` (no framing of the login page), `Referrer-Policy: same-origin`, and a
Content-Security-Policy once we have checked nothing inline needs it. No HSTS at first: if DuckDNS ever
fails, we want to be able to fall back.

**Failure modes and fallbacks**

- **DuckDNS DNS down or gone:** names stop resolving; the game is unreachable by name. Fallback, ready in the
  runbook: run `caddy.sh 159-13-37-255.sslip.io` (no signup, works today; checked live). Everyone must log in
  again (cookies are per host); no data is lost. Long-term alternative: deSEC (`dedyn.io`, non-profit, also on
  the Public Suffix List).
- **Certificate renewal fails:** certificates last 90 days (Let's Encrypt moves to 64 days in Feb 2027 and 45
  days in Feb 2028); Caddy renews about a third of the way before expiry and retries, so there are weeks of
  warning. Check: `journalctl -u caddy | grep -i acme`.
- **New VM or IP:** update the IP at DuckDNS; the names, cookies and accounts survive (with the database restored).
- Also possible now: Let's Encrypt certificates for a bare IP (generally available since Jan 2026), but they last
  ~6 days and need a very recent Caddy. Kept only as an emergency option.

## 3. Database

SQLite in WAL mode (`journal_mode=WAL`, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout=2000`,
small page cache). One file per slot. Tests use `:memory:`; local dev uses `data/arcane.db` (gitignored); the
path comes from `ARCANE_DB_PATH`.

**Migrations:** a numbered list of SQL steps in `server/db/migrations.ts`, the database's `PRAGMA user_version`
says how many have run. On start, before listening: copy the file (`VACUUM INTO pre-migrate-<n>.db`, last 3
kept), run the missing steps in one transaction, then listen. A server that finds a database **newer** than it
knows refuses to start with a clear log line (this happens when a test slot is switched to an older branch:
`arcane-deploy <slot> reset-db` wipes a **test** slot's database; it refuses on `main`). Migrations only add
(new tables, new columns with defaults); removing something takes two releases.

**Redeploys:** the database stays (it lives outside the checkout). A deploy restarts the slot; migrations run
on that start.

### Data model

```sql
CREATE TABLE users (
  id             INTEGER PRIMARY KEY,
  username       TEXT NOT NULL UNIQUE,         -- lowercase a-z 0-9 _, 3-20 chars, permanent
  display_name   TEXT NOT NULL,                -- 3-16 chars, filtered, not unique
  password_hash  TEXT NOT NULL,                -- "argon2id$m=19456,t=2,p=1$<salt>$<hash>"
  recovery_hash  TEXT,                         -- SHA-256 of the current recovery code (80 random bits)
  created_at     INTEGER NOT NULL,             -- unix seconds
  banned_at      INTEGER,                      -- set: cannot log in
  ban_reason     TEXT                          -- for Jesse; never shown to others
);

CREATE TABLE sessions (
  token_hash   TEXT PRIMARY KEY,               -- SHA-256 of the cookie value
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL                -- 30 days, slid forward at most once a day
);

CREATE TABLE profiles (
  user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  workshop     TEXT,                           -- JSON, the Workshop look (cap 32 KB)
  loadout      TEXT,                           -- JSON, spellbook choices (cap 4 KB)
  updated_at   INTEGER NOT NULL
);

CREATE TABLE friend_requests (
  from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (from_id, to_id)
);

CREATE TABLE friends (                         -- one row per pair, smaller id first
  a_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  b_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (a_id, b_id),
  CHECK (a_id < b_id)
);

CREATE TABLE blocks (
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);
```

Not stored: IP addresses, user agents, login history, emails, ages. Deleting an account deletes every row
about it (cascade) and frees the username. Friend lists are keyed by id, so someone who later takes a freed
username is a stranger to the old friends.

## 4. Security basics

- **Passwords:** 8-128 characters, no composition rules (passphrases welcome), rejected if on a bundled list of
  the 10,000 most common passwords or equal to the username. Hashed with argon2id (above); compared in constant
  time. Never logged.
- **Usernames:** reserved list (`admin`, `jesse`-style staff names, `system`, `guest`, `player*`, ...) so nobody
  impersonates the server or a guest label.
- **Cookie:** `__Host-session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`. The `__Host-`
  prefix makes the browser refuse it unless it is Secure, host-only and Path=/, so `jesse.` and `main` can never
  share a session.
- **CSRF:** `SameSite=Lax`, every changing request is a `POST` with `Content-Type: application/json` (cross-site
  forms can't send that without a CORS preflight, and we send no CORS headers), and the server rejects any
  `/api` request whose `Origin` header is not its own host.
- **WebSocket:** browsers attach cookies to the WebSocket upgrade and don't apply CORS to it, so the server
  **checks `Origin` on the upgrade** (cross-site WebSocket hijacking) and then reads the session cookie: the
  socket is bound to that user for its whole life (`ws.userId`). Logging in or out in the client reconnects the
  socket. Log out, password change, ban and delete close all that user's sockets (`userId -> Set<Client>`).
- **Rate limits** (in memory, per IP from Caddy's `X-Forwarded-For`, trusted only from 127.0.0.1): log in 10 per
  minute per IP and 5 failures per 15 minutes per username (then 15 minute lockout for that username, which
  only slows the attacker since the real owner still can't be locked out for long); sign up 5 per hour per IP;
  recovery 5 per hour per IP; friend requests 20 per hour; invites 1 per friend per 30 s. Maps are capped and
  expire, so they can't grow without bound.
- **Input:** `/api` bodies capped at 4 KB (profile 32 KB), parsed and checked like `server/validate.ts` (unknown
  fields dropped, wrong types rejected). Workshop and loadout JSON are re-checked (`sanitizeLoadout`, and a
  Workshop sanitiser moved into `shared/` from `client/src/workshop/store.ts`) before they are stored or sent.
  Display names go through the same filter on the server; the client only shows them as text (never
  `innerHTML`).
- **Errors:** "Wrong username or password" for both cases; sign-up does say "username taken" (unavoidable,
  rate-limited).
- **Logging:** one line per sign-up, deletion, ban and admin action (user id, no IP); repeated failed logins
  logged as a count per minute with the IP, kept only as long as the systemd journal. Never: passwords,
  tokens, cookies, recovery codes, request bodies.
- **Privacy:** a short plain-language page (`/privacy.html`): what we store (above), why, that nothing is
  shared or sold, no tracking or ads, how to delete your account (Account > Delete) and that deletion is
  immediate (backups age out within 30 days). A hobby project with no turnover is most likely under the Privacy
  Act's small-business exemption, and the Children's Online Privacy Code (due to be registered by 10 Dec 2026)
  binds only organisations the Act already covers; not legal advice. A game whose main purpose is playing
  with others is excluded from the under-16 social media ban; eSafety warns that adding chat or feeds could
  change that, which is one reason there is no chat.

## 5. How accounts fit the existing model

- **Guests** are unchanged: `clientId` per tab, resume tokens per seat, "Player N".
- **Identity key.** Rooms today recognise a returning player by `clientId` (`seatOwners`, `playerNos`,
  `hostClientId`). This becomes an identity key: `u:<userId>` for a logged-in socket, `c:<clientId>` for a guest.
  So a logged-in player can retake their seat from another tab or device, not just the same tab.
- **One account, two tabs:** allowed to be online in several tabs. One seat per account per room: if the
  account's second tab joins a room where it is already seated, it takes the seat over (like a resume) and the
  first tab is sent back to the menu with "Opened in another tab".
- **Names:** lobby and match names are the display name for account players, "Player N" for guests. A display
  name change shows from the next lobby update.
- **Resume tokens** stay as they are: they are the fast path for a dropped connection, and they work for guests.
- **Local data:** Workshop look and loadouts stay in localStorage for everyone. On **sign-up** the local ones are
  copied to the new account. On **log in** the account's replace the local ones (the old local copy is kept
  under a backup key and can be restored with "Use this device's look" in Account). While logged in, every
  local save also goes to the server (debounced).
- **Slots:** each slot has its own database and cookies (separate hosts), so a test account on `jesse.` does
  not exist on `main`.

## 6. Cheating, trust, moderation

The server is already authoritative, so accounts add no new cheating surface: they only add persistence. What
they add is accountability: an admin command (`arcane-admin <slot> ...`, a wrapper for
`node dist/server/admin.js`) to `list`, `show <username>`, `reset-password <username>` (prints a one-time
password and a new recovery code), `rename <username> <display name>`, `ban <username> <reason>`,
`unban`, `delete <username>`. Players can **block** another account (no requests, invites or presence between
them). No reporting button in v1.

## 7. Protocol and server changes

`PROTOCOL_VERSION` 21 -> 22 (identity), 23 (profile), 24 (friends). All message types go in
`shared/protocol.ts`; the `/api` request and response types go in `shared/accountApi.ts` (re-exported from
`protocol.ts`, so there is still one place to look).

**HTTP (`/api`, JSON):**

| Request                    | Body                                                   | Result                                                      |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| `POST /api/signup`         | `username, password, displayName, workshop?, loadout?` | sets cookie; `{ account, recoveryCode }`                    |
| `POST /api/login`          | `username, password`                                   | sets cookie; `{ account }`                                  |
| `POST /api/logout`         | `{ everywhere?: true }`                                | clears cookie                                               |
| `GET /api/me`              |                                                        | `{ account }` or `{ account: null }`                        |
| `POST /api/password`       | `current, next`                                        | other sessions revoked                                      |
| `POST /api/recover`        | `username, recoveryCode, next`                         | sets cookie; new `recoveryCode`; all other sessions revoked |
| `POST /api/recovery-code`  | `password`                                             | new `recoveryCode`                                          |
| `POST /api/display-name`   | `displayName`                                          | `{ account }`                                               |
| `POST /api/delete-account` | `password`                                             | everything deleted, cookie cleared                          |

`account = { id, username, displayName }`.

**WebSocket:** identity comes from the cookie on the upgrade, so `hello` doesn't change.

- server -> client: `welcome { account | null }` after a good `hello`; `profile { workshop, loadout }`;
  `friends { friends: FriendEntry[], incoming: Person[], outgoing: Person[], blocked: Person[] }` (whole list on
  every change; it is small); `invited { from: Person, code, expiresAt }`; `signed_out { reason: 'logout' |
'password' | 'banned' | 'deleted' | 'elsewhere' }`; `friend_error { message }`.
  `Person = { id, username, displayName }`, `FriendEntry = Person & { presence: 'offline' | 'menu' | 'lobby' |
'match' }`.
- client -> server: `save_profile { workshop?, loadout? }`; `friend_request { username }`;
  `friend_answer { id, accept }`; `friend_remove { id }`; `block { id }`; `unblock { id }`; `invite { id }`
  (the server sends the inviter's current room code).
- `lobby`: `names` as today, plus `guests: boolean[]` so the lobby can mark guests.

**New server files:** `server/db/` (open, migrations, backup), `server/accounts/` (passwords, sessions, http
routes, rate limits, names and blocklists), `server/friends/` (store, presence, invites), `server/admin.ts`.
`server/app.ts` routes `/api/*` and handles the upgrade (Origin + cookie) before `ws` accepts it.
`server/rooms/state.ts` swaps `clientId` for the identity key.

## 8. Client screens

All built from the `.ui-*` components (`docs/UI.md`); missing pieces go into `components.css` and the style
guide first: **`.ui-tabs`** (Log in / Sign up), **`.ui-toast`** (invites, "saved"), **`.ui-list`** with
**`.ui-dot`** presence dots (friends), **`.ui-chip`** (account button on the menu).

1. **Main menu:** account chip top-right: "Log in" (guest) or the display name (logged in), opens 2 or 4.
2. **Log in / Sign up** (`.ui-screen`, `.ui-panel`, `.ui-tabs`): username, password, (display name on sign-up);
   green hero button; error line as `.ui-note`; link to Forgot password; brown Back.
3. **Recovery code** after sign-up: the code large, Copy (beige), "I've saved it" checkbox before Continue
   (green). Same screen after re-issuing a code.
4. **Account:** display name (edit, save), `@username` (read-only), change password, new recovery code, use this
   device's look, log out (beige), log out everywhere, delete account (red; type your username to confirm),
   privacy link.
5. **Forgot password:** username, recovery code, new password.
6. **Friends** (from menu and lobby): list with presence dot and `Name (@username)`, Invite (green, only when
   you are in a lobby and they are online), Remove / Block (behind a small menu); incoming requests with Accept
   (green) / Decline (beige); "Add by username" field.
7. **Invite toast** on any screen: "Merlin (@jesse) invites you to a lobby", Join (green) / Dismiss, gone after 2
   minutes. During a match it waits until the match ends.
8. **`/privacy.html`**: plain static page.

## 9. Operations

- **Memory:** the database adds a few MB; argon2 uses 19 MiB per hash, one at a time. `/stats` gains `accounts`,
  `onlineAccounts`, `dbBytes`, `hashQueue`. Each slot's systemd unit gets `MemoryHigh=200M` so a runaway test
  slot is squeezed before `main` is.
- **Measure first:** the first accounts version logs how long one hash takes on the VM while a match runs.
  If ticks drop below 60/s during a login, lower `t` before raising anything else.
- **Backups:** `arcane-backup` systemd timer, 03:00 AWST, `main` only: snapshot -> gzip -> `age` -> upload with
  `curl --aws-sigv4` to an Object Storage bucket (S3-compatible endpoint, a "customer secret key"), bucket
  lifecycle rule deletes after 30 days. `scripts/pull-backup.sh` copies the newest to Jesse's laptop.
  **Restore:** stop the slot, decrypt and gunzip into `/var/lib/arcane-duel/main/arcane.db`, start. Rehearsed on
  a test slot once (rollout step 2).
- **Oracle idle reclaim:** Always Free VMs can be stopped (not deleted) when idle for ~7 days; data survives a
  stop. Backups cover the worse case (account closure or a broken disk).

### Making the repo private later

Nothing in this plan needs the repo to be public: neither Oracle Always Free nor DuckDNS cares, and the plan
keeps all secrets out of the repo either way. What does assume a public repo today is the VM fetching code
anonymously over https (`REPO=` in `deploy/oracle/setup.sh` and `arcane-deploy`, and the `curl
raw.githubusercontent.com/.../setup.sh` install line). To go private: add a read-only **deploy key** to the
repo (Settings > Deploy keys), put its private half in `~ubuntu/.ssh/` on the VM, switch `REPO` to
`git@github.com:marksjprogamedev/arcane-duel.git` and `git remote set-url` in each `/srv/arcane-duel/<slot>`,
and run `setup.sh` from a checkout instead of `curl`. GitHub Free private repos allow unlimited collaborators
and include 2,000 Actions minutes a month (the deploy job uses well under one minute per push). Some branch
protection features need a paid plan for private repos (not checked).

## 10. Risks

| Risk                                                                | Mitigation                                                                                    |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| DuckDNS goes away or has an outage (one volunteer-run service)      | sslip.io fallback in the runbook (one command); deSEC as the long-term move. Data unaffected. |
| `node:sqlite` is still "release candidate" in Node and has had bugs | Node >= 24.16; all access through `server/db/`; `better-sqlite3` is a drop-in swap.           |
| Password hashing slows matches on a 1/8 core VM                     | One hash at a time; measured in step 3; parameters stored per hash, so tunable.               |
| Weak or reused passwords on accounts held by kids                   | Common-password blocklist, rate limits, no email to leak, little of value in an account.      |
| Test branch migration damages data                                  | Per-slot databases; pre-migration copy; newer-than-known database refuses to start.           |
| Strangers bothering kids                                            | No chat; friend requests only by exact username; block; display-name filter; admin ban.       |
| Secrets committed to the public repo                                | None needed in the repo; secrets only in `/etc/arcane-duel/`.                                 |
| Data loss                                                           | Nightly encrypted offsite backups, 30 days, restore rehearsed.                                |
| Mark's or Adnan's branches drift from the auth code                 | Tests cover sessions, Origin checks and cascades; they run on every push (hooks).             |

## 11. Rollout

One step per minor version, each pushed to `test-jesse`, tested on `jesse.` (or `:8082` for step 1), merged to
`main` by PR only when Jesse says so. Each step adds its checklist section to `docs/TEST-CHECKLIST.md` and its
tests in the same commit, plus section 7 (regression).

### 0.36.0 HTTPS (ops and docs only)

Work: DuckDNS name, token file and timer; `caddy.sh` person names, `/api` in the proxy list, redirects from the
old IP addresses, security headers; `arcane-deploy` URLs; all docs with URLs. Run `caddy.sh` on the VM.
Tests: `tests/deploy/caddy.test.ts` runs `caddy.sh` in a dry mode and checks the four sites and redirects.
Checklist:

- **HT1** Each of the four https names opens the game with a valid padlock; a match works online (wss) on `jesse.`.
- **HT2** `http://159.13.37.255:8082/` and `http://159.13.37.255/` redirect to the right https name.
- **HT3** In the browser console on an https slot: `crypto.randomUUID()` works (secure context).

### 0.37.0 Database foundation (no visible change)

Work: `server/db/`, migration 1 (the tables above), `ARCANE_DB_PATH`, systemd `StateDirectory`, `MemoryHigh`,
`arcane-deploy <slot> reset-db`, backup timer and pull script, `/stats` fields.
Tests: migrations from empty, re-run is a no-op, a newer database refuses to start, pre-migration copy made,
backup produces a readable copy.
Checklist:

- **DB1** After deploying, `/stats` on `jesse.` shows `dbBytes` > 0; redeploy: still there, not reset.
- **DB2** Run the backup by hand, pull it with `scripts/pull-backup.sh`, decrypt it on the laptop, open it.
- **DB3** Restore rehearsal on the `jesse.` slot from that backup.

### 0.38.0 Accounts: sign up, log in, log out, Account screen

Work: `server/accounts/`, `/api` routes, cookie, rate limits, admin command, `/privacy.html`, screens 1-5, the
new UI components in the style guide.
Tests: password rules and hash round-trip; cookie flags; wrong `Origin` rejected; rate limits; recovery flow
revokes sessions; delete cascades; ban blocks login; the admin command.
Checklist:

- **AC1** Sign up as a new user: recovery code screen shown, then the menu shows your display name. Reload: still
  logged in. Second browser: not logged in.
- **AC2** Log out, log in with a wrong password (message), then the right one. Log in from another browser too;
  "log out everywhere" logs out both.
- **AC3** Change display name (filter rejects a rude word); change password; forgot password with the recovery
  code; the old code no longer works.
- **AC4** Delete account (type the username): logged out, username can be signed up again.
- **AC5** Six quick wrong passwords on one username: lockout message. `arcane-admin test2 reset-password <name>`
  lets you in.
- **AC6** `/styleguide.html` shows tabs, toast, list with dots, chip.

### 0.39.0 The logged-in player in rooms (protocol 22)

Work: Origin check and cookie on the WebSocket upgrade, `welcome`, identity key in rooms, display names in
lobby and match, guest marking, `signed_out`.
Tests: upgrade with a foreign Origin refused; logged-in seat retaken from a second socket; one seat per
account; guests unchanged (the existing reconnect tests pass); logout closes sockets.
Checklist:

- **ID1** Logged-in host and a guest in a lobby: names show the display name and "Player 2 (guest)".
- **ID2** Logged in, mid-match: open the game on another device/browser logged into the same account, join with
  the code: you take your seat there and the first tab returns to the menu ("Opened in another tab").
- **ID3** Log out in another tab mid-match: this tab is told and returns to the menu. Section 7 (regression),
  as a guest.

### 0.40.0 Workshop look and loadouts on the account (protocol 23)

Work: shared Workshop sanitiser, `save_profile` / `profile`, copy on sign-up, replace on login with backup,
"use this device's look".
Tests: sanitiser drops bad fields; size caps; profile round-trip; sign-up copies local data.
Checklist:

- **PF1** Make a look and loadout as a guest, sign up: both kept. Log in on another browser: same look and
  loadout.
- **PF2** Change the look on browser A; reload browser B: it has the new look. Log out: the look stays local.
- **PF3** "Use this device's look" restores the pre-login local look.

### 0.41.0 Friends (protocol 24)

Work: requests, accept/decline, remove, block, the Friends screen.
Tests: request both ways becomes friends; block stops requests; caps (100 friends, 20 pending); deletion removes
friendships.
Checklist:

- **FR1** A adds B by username; B sees the request live and accepts; both lists show `Name (@username)`.
- **FR2** Remove, re-add, then block: B can no longer send A requests. Unknown username: clear message.

### 0.41.1 Presence and invites

Work: presence updates, `invite` / `invited`, the invite toast.
Tests: presence changes on menu/lobby/match/offline; invite rate limit; blocked users invisible.
Checklist:

- **FR3** B sees A go offline, menu, lobby and match within a second or two.
- **FR4** A in a lobby invites B: toast on B's menu; Join puts B in the lobby. Invite during B's match waits until
  it ends. Expired invite (2 min) disappears.

## 12. Later (not v1)

Stats and match history; unlockable cosmetics; other players seeing your Workshop look in matches (needs the
shared sanitiser from 0.40.0); reporting; optional "link Discord"; a real domain if DuckDNS proves flaky.

## What could not be verified

- DuckDNS: the 5-names-per-account limit and any inactivity expiry (not in its FAQ; the plan needs one name).
- deSEC account limits.
- Which tagged Caddy release fully supports Let's Encrypt IP certificates (emergency option only).
- Oracle Object Storage Always Free figures (reported as 20 GB and 50,000 requests a month; we use ~1 request a
  night) and the S3-compatible upload from `curl`: to be proven in step 2.
- Whether the Children's Online Privacy Code reaches organisations under the small-business exemption.
- Exact `crypto.argon2` stability label in Node 24 (it is present and works in 24.12 locally).

# Hosting on Oracle Cloud (Always Free, Australia)

A small always-on Ubuntu VM in Sydney or Melbourne, with Caddy in front of the game server.
No code changes are needed: the client connects back to whatever host served the page.

## 1. Account and VM (once, in the Oracle console)

1. Sign up at cloud.oracle.com. **Home region: Australia East (Sydney) or Australia Southeast
   (Melbourne).** Always Free resources only exist in the home region and it can't be changed.
   A card is needed for verification; stay on the free tier (don't upgrade to Pay As You Go
   unless you mean to).
2. Compute -> Instances -> Create instance:
   - Image: **Canonical Ubuntu 24.04**.
   - Shape: **Ampere (VM.Standard.A1.Flex), 1 OCPU, 6 GB** is plenty (one match uses ~5% of a
     core). If Ampere says "out of capacity", try again later or use VM.Standard.E2.1.Micro.
   - Networking: create a new VCN with a public subnet, assign a public IPv4 address.
   - SSH keys: upload your public key (`~/.ssh/id_ed25519.pub`; make one with
     `ssh-keygen -t ed25519` if needed).
3. Open ports 80 and 443: Networking -> Virtual cloud networks -> your VCN -> Security ->
   default security list -> Add ingress rules: source `0.0.0.0/0`, TCP, destination port `80`,
   and the same for `443`.
4. Note the instance's public IP.

## 2. Install the game (on the VM)

```bash
ssh ubuntu@<vm-ip>
curl -fsSL https://raw.githubusercontent.com/marksjprogamedev/arcane-duel/refactor-and-cleanup-2/deploy/oracle/setup.sh \
  | bash -s -- refactor-and-cleanup-2
```

Then open `http://<vm-ip>/`. Plain HTTP works for the game (WebSockets go over `ws://`).

### Optional: HTTPS with a free domain

Get a free subdomain (e.g. duckdns.org), point it at the VM's IP, then run the setup again with
the domain; Caddy fetches and renews the certificate:

```bash
bash /opt/arcane-duel/deploy/oracle/setup.sh refactor-and-cleanup-2 yourname.duckdns.org
```

## 3. Deploying new commits

After pushing to the branch:

```bash
ssh ubuntu@<vm-ip> /opt/arcane-duel/deploy/oracle/update.sh
```

To switch branch, run `setup.sh <other-branch>` again.

## Checking on it

- Live numbers: `http://<vm-ip>/stats` (during a match `lastSecond.ticks` should be ~60 per match).
- Logs: `journalctl -u arcane-duel -f`
- Restart: `sudo systemctl restart arcane-duel` (it also restarts by itself on crash and reboot).

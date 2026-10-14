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
   default security list -> Add ingress rules: source `0.0.0.0/0`, TCP, destination ports `80,443`,
   and another for `8081-8082` (the test slots).
4. Note the instance's public IP.

## 2. Install the game (on the VM)

```bash
ssh ubuntu@<vm-ip>
curl -fsSL https://raw.githubusercontent.com/marksjprogamedev/arcane-duel/main/deploy/oracle/setup.sh | bash
```

This deploys `main` to `http://<vm-ip>/`. Plain HTTP works for the game (WebSockets go over `ws://`).

### Optional: HTTPS with a free domain

Get a free subdomain (e.g. duckdns.org), point it at the VM's IP, then run the setup again with
the domain; Caddy fetches and renews the certificates for all three slots:

```bash
curl -fsSL https://raw.githubusercontent.com/marksjprogamedev/arcane-duel/main/deploy/oracle/setup.sh \
  | bash -s -- yourname.duckdns.org
```

## 3. Slots and deploying

The server runs up to three copies of the game, each from its own checkout:

| Slot    | Branch                | URL (no domain)        | URL (with domain)         |
| ------- | --------------------- | ---------------------- | ------------------------- |
| `main`  | always `main`         | `http://<vm-ip>/`      | `https://<domain>/`       |
| `test1` | whatever was deployed | `http://<vm-ip>:8081/` | `https://test1.<domain>/` |
| `test2` | whatever was deployed | `http://<vm-ip>:8082/` | `https://test2.<domain>/` |

Workflow: branch off `main`, push, deploy the branch to a free test slot, test it, merge it into
`main` with a pull request, deploy `main`, delete the branch.

```bash
ssh ubuntu@<vm-ip> arcane-deploy test1 my-feature   # put a branch on test slot 1
ssh ubuntu@<vm-ip> arcane-deploy test1              # redeploy the newest commit of that branch
ssh ubuntu@<vm-ip> arcane-deploy main               # after merging: update the live site
ssh ubuntu@<vm-ip> arcane-deploy test1 stop         # free a slot
ssh ubuntu@<vm-ip> arcane-deploy status             # what every slot runs
```

## Checking on it

- Live numbers: `http://<vm-ip>/stats` (during a match `lastSecond.ticks` should be ~60 per match).
- Logs: `journalctl -u arcane-duel@main -f` (or `@test1`, `@test2`)
- Restart: `sudo systemctl restart arcane-duel@main` (they also restart by themselves on crash and reboot).

# Arcane Duel v25.0 — Online Multiplayer

## Run locally

1. Install Node.js 18 or newer.
2. In this folder, run `npm install` then `npm start`.
3. Open `http://localhost:3000` in your browser.
4. Click **Create Private Room**, then share the six-letter code.
5. Your friend opens the same server URL and clicks **Join Room** with your code.

## Play from different computers over the internet

Deploy this entire folder to a Node.js-compatible hosting provider that supports WebSockets and a persistent server process. Configure the host's start command as `npm start`. Share its public HTTPS URL with your friend. Both players must use the **same server**. Room codes alone do not create a network connection.

This version uses a host-authoritative browser simulation and relays controls and snapshots through a WebSocket server. It's a prototype, not a hardened competitive multiplayer backend; latency, cheating prevention and reconnect support are limited. Rooms support two players and are deleted when either disconnects. The original AI and dummy modes remain available.

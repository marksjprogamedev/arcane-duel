# Arcane Duel

Browser-based 2-player wizard duel (Magicka-style elemental spellcasting).
Runs on HTML5 canvas, with a Node.js WebSocket server for online play.

## Run locally

1. Install Node.js 18 or newer.
2. `npm install`
3. `npm start`
4. Open `http://localhost:3036` (override with the `PORT` env var).
5. Click **Create Private Room** and share the six-letter code. Your friend
   joins from the same server URL.

Optional lag simulation: `ARCANE_LATENCY_MS=100 ARCANE_JITTER_MS=20 npm start`

## Deployment

Needs a host with persistent processes and WebSocket support. Current host:
Ondeploy free tier (0.1 CPU, 512 MB RAM, Singapore). Start command: `npm start`.

## Current networking model (being replaced)

Host-authoritative: one player's browser runs the simulation and the server
only relays messages. See the `refactor/project-structure` branch for the
ongoing restructure toward a server-authoritative design.

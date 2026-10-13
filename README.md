# Arcane Duel

Browser-based 2-player wizard duel (Magicka-style elemental spellcasting).
Runs on HTML5 canvas, with a Node.js WebSocket server for online play.

## Project layout

```
client/    Browser game source (index.html, styles.css, src/*.ts). Edit these.
server/    Node WebSocket server (TypeScript): index.ts (boot), rooms.ts, static.ts.
shared/    Code used by both client and server: protocol.ts (message types), constants, math.
           The game simulation will move here (see roadmap).
tests/     Automated tests (Playwright smoke test).
dist/      GENERATED build output from `npm run build`. Gitignored. Never edit.
           dist/client/ is the browser bundle, dist/server/ the compiled server.
```

## Run locally

1. Install Node.js 18 or newer.
2. `npm install`
3. `npm run build` then `npm start` (build compiles both client and server)
4. Open `http://localhost:3036` (override with the `PORT` env var).
5. Click **Create Private Room** and share the six-letter code. Your friend
   joins from the same server URL.

For client development with hot reload, run `npm run dev:server` and `npm run dev`
together and open the Vite URL.

Optional lag simulation: `ARCANE_LATENCY_MS=100 ARCANE_JITTER_MS=20 npm start`

## Deployment

Needs a host with persistent processes and WebSocket support. Current host:
Ondeploy free tier (0.1 CPU, 512 MB RAM, Singapore). Build command: `npm install && npm run build`. Start command: `npm start`.

## Current networking model (being replaced)

Host-authoritative: one player's browser runs the simulation and the server
only relays messages. See the `refactor/project-structure` branch for the
ongoing restructure toward a server-authoritative design.

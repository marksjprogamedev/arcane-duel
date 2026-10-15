import path from 'node:path';
import { createGameServer } from './app';

const VERSION = 'Arcane Duel v0.12.13-0 beam bounce';
const PORT = Number(process.env.PORT) || 3036;
// Compiled to dist/server/index.js; the client bundle is in dist/client.
const clientRoot = path.join(__dirname, '..', 'client');

const server = createGameServer(clientRoot, VERSION);
server.on('error', (err) => {
  console.error(`Unable to start server on port ${PORT}: ${err.message}`);
  process.exit(1);
});
server.listen(PORT, '0.0.0.0', () => console.log(`${VERSION} listening on 0.0.0.0:${PORT}`));

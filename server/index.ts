import path from 'node:path';
import { createGameServer } from './app';
import { openDatabase } from './db';

const VERSION = 'Arcane Duel v0.42.1-0 docs';
const PORT = Number(process.env.PORT) || 3036;
// Compiled to dist/server/index.js; the client bundle is in dist/client.
const clientRoot = path.join(__dirname, '..', 'client');

// The slot's database lives outside the checkout (systemd sets ARCANE_DB_PATH on the server, see
// deploy/oracle/service.sh); locally it is data/arcane.db.
const dbPath = process.env.ARCANE_DB_PATH || path.join(process.cwd(), 'data', 'arcane.db');
let db;
try {
  db = openDatabase(dbPath);
} catch (err) {
  console.error(`Unable to open the database ${dbPath}: ${(err as Error).message}`);
  process.exit(1);
}

const server = createGameServer(clientRoot, VERSION, { database: { db, path: dbPath } });
server.on('error', (err) => {
  console.error(`Unable to start server on port ${PORT}: ${err.message}`);
  process.exit(1);
});
server.listen(PORT, '0.0.0.0', () => console.log(`${VERSION} listening on 0.0.0.0:${PORT}`));

// systemd stops the service with SIGTERM: close the database properly, so its last writes move from the
// write-ahead log (arcane.db-wal) into arcane.db and the folder holds one complete file.
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => {
    server.close();
    db.close();
    process.exit(0);
  });

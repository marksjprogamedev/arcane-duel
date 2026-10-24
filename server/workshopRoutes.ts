// `GET /api/workshop-layouts`: the shared Workshop layouts, open to everyone (guests too).
// `PUT /api/workshop-layouts`: publish a new copy; logged-in workshop editors only
// (`arcane-admin <slot> workshop-editor <user>`), from this site only.

import type http from 'node:http';
import {
  MAX_SHARED_WORKSHOP_BYTES,
  parseSharedWorkshop,
  type SharedWorkshopResponse,
} from '../shared/workshopShared';
import { sameOrigin, sessionUser } from './accounts/http';
import type { Db } from './db';
import { isWorkshopEditor, loadSharedWorkshop, saveSharedWorkshop } from './workshopShared';

function reply(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

export function handleWorkshopLayouts(db: Db, req: http.IncomingMessage, res: http.ServerResponse) {
  const session = sessionUser(db, req);
  const canEdit = !!session && isWorkshopEditor(db, session.account.id);
  if (req.method === 'GET') {
    const body: SharedWorkshopResponse = { shared: loadSharedWorkshop(db), canEdit };
    reply(res, 200, body);
    return;
  }
  if (req.method !== 'PUT') {
    reply(res, 405, { error: 'Method not allowed.' });
    return;
  }
  // a page on another site must not publish with the visitor's cookie
  if (!sameOrigin(req)) return reply(res, 403, { error: 'Not allowed from this site.' });
  if (!session) return reply(res, 401, { error: 'Please log in.' });
  if (!canEdit) return reply(res, 403, { error: 'This account cannot publish the layouts.' });
  const chunks: Buffer[] = [];
  let size = 0;
  let tooBig = false;
  req.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size > MAX_SHARED_WORKSHOP_BYTES) tooBig = true;
    else chunks.push(chunk);
  });
  req.on('end', () => {
    if (tooBig) return reply(res, 413, { error: 'That is too large.' });
    let doc;
    try {
      doc = parseSharedWorkshop(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } catch {
      doc = null;
    }
    if (!doc) return reply(res, 400, { error: 'That is not a valid layout copy.' });
    saveSharedWorkshop(db, doc, session.account.id);
    reply(res, 200, { shared: doc, canEdit });
  });
}

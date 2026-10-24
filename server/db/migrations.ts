// The database's schema, as a list of steps. `PRAGMA user_version` records how many have run; on start
// the server runs the rest (see migrate in ./index.ts). Never edit or reorder a step that has been
// pushed: add a new one. Steps only add (tables, columns with defaults); removing something takes two
// releases, so a slot running the previous version still works. The plan is in docs/ACCOUNTS-PLAN.md.

export const MIGRATIONS: readonly string[] = [
  // 1 (0.37.0): accounts, sessions, saved looks and loadouts, friends.
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    recovery_hash TEXT,
    created_at    INTEGER NOT NULL,
    banned_at     INTEGER,
    ban_reason    TEXT
  ) STRICT;

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE profiles (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    workshop   TEXT,
    loadout    TEXT,
    updated_at INTEGER NOT NULL
  ) STRICT;

  CREATE TABLE friend_requests (
    from_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (from_id, to_id)
  ) STRICT;
  CREATE INDEX friend_requests_to ON friend_requests(to_id);

  CREATE TABLE friends (
    a_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    b_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (a_id, b_id),
    CHECK (a_id < b_id)
  ) STRICT;
  CREATE INDEX friends_b ON friends(b_id);

  CREATE TABLE blocks (
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id)
  ) STRICT;
  CREATE INDEX blocks_blocked ON blocks(blocked_id);
  `,
  // 2 (0.42.0): the Wizard Workshop layouts everyone shares (one row), and who may publish them.
  `
  CREATE TABLE workshop_shared (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    data       TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  ) STRICT;

  CREATE TABLE workshop_editors (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  ) STRICT;
  `,
  // 3 (0.44.0): the saved outfits ("appearance slots") of an account, as JSON next to its current look.
  `
  ALTER TABLE profiles ADD COLUMN slots TEXT;
  `,
];

// src/lib/db/index.ts
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'path';

const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

type Params = any[] | Record<string, any> | undefined;

function toArray(params: Params): any[] {
  if (!params) return [];
  if (Array.isArray(params)) return params;
  // named params -> ordered array
  return Object.values(params);
}

let localDb: BetterSqlite3Database | null = null;
let remoteDb: any = null;

if (isProd) {
  // For production, we'll use the existing build-safe approach
  // This avoids the Node.js 14 compatibility issue with @libsql/client
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.log('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN, using in-memory database');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    remoteDb = require('./memory');
  } else {
    // For now, fall back to in-memory in production until we can upgrade Node.js
    console.log('Turso not yet configured, using in-memory database');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    remoteDb = require('./memory');
  }
} else {
  // Local dev uses the existing SQLite file (better-sqlite3)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BetterSqlite3 = require('better-sqlite3');
  const dbPath = process.env.LOCAL_SQLITE_PATH || path.join(process.cwd(), 'data', 'ugc-tracker.db');
  localDb = new BetterSqlite3(dbPath);
}

// Unified API
export const db = {
  async all<T = any>(sql: string, params?: Params): Promise<T[]> {
    if (remoteDb) {
      // For in-memory database, use the same interface as SQLite
      return remoteDb.prepare(sql).all(...toArray(params)) as T[];
    }
    // local
    return localDb!.prepare(sql).all(...toArray(params)) as T[];
  },

  async get<T = any>(sql: string, params?: Params): Promise<T | undefined> {
    if (remoteDb) {
      // For in-memory database, use the same interface as SQLite
      return remoteDb.prepare(sql).get(...toArray(params)) as T | undefined;
    }
    return localDb!.prepare(sql).get(...toArray(params)) as T | undefined;
  },

  async run(sql: string, params?: Params): Promise<void> {
    if (remoteDb) {
      // For in-memory database, use the same interface as SQLite
      remoteDb.prepare(sql).run(...toArray(params));
      return;
    }
    localDb!.prepare(sql).run(...toArray(params));
  },
};

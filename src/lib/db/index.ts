// src/lib/db/index.ts
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import { createClient, type Client } from '@libsql/client';

const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

type Params = any[] | Record<string, any> | undefined;

function toArray(params: Params): any[] {
  if (!params) return [];
  if (Array.isArray(params)) return params;
  // named params -> ordered array
  return Object.values(params);
}

let localDb: BetterSqlite3Database | null = null;
let remoteDb: Client | null = null;

if (isProd) {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  }
  remoteDb = createClient({ url, authToken });
} else {
  // Local dev uses the existing SQLite file (better-sqlite3)
  // Adjust the import/path if your local DB file lives elsewhere.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BetterSqlite3 = require('better-sqlite3');
  const path = process.env.LOCAL_SQLITE_PATH || './data/ugc-tracker.db';
  localDb = new BetterSqlite3(path);
}

// Unified API
export const db = {
  async all<T = any>(sql: string, params?: Params): Promise<T[]> {
    if (remoteDb) {
      const res = await remoteDb.execute({ sql, args: toArray(params) });
      return (res.rows as unknown as T[]) ?? [];
    }
    // local
    return localDb!.prepare(sql).all(...toArray(params)) as T[];
  },

  async get<T = any>(sql: string, params?: Params): Promise<T | undefined> {
    if (remoteDb) {
      const res = await remoteDb.execute({ sql, args: toArray(params) });
      return (res.rows?.[0] as unknown as T) ?? undefined;
    }
    return localDb!.prepare(sql).get(...toArray(params)) as T | undefined;
  },

  async run(sql: string, params?: Params): Promise<void> {
    if (remoteDb) {
      await remoteDb.execute({ sql, args: toArray(params) });
      return;
    }
    localDb!.prepare(sql).run(...toArray(params));
  },
};

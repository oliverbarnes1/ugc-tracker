// src/lib/db/index.ts
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const isLocal = !isProd;

type Params = any[] | Record<string, any> | undefined;

function toArray(params: Params): any[] {
  if (!params) return [];
  if (Array.isArray(params)) return params;
  // named params -> ordered array
  return Object.values(params);
}

let localDb: BetterSqlite3Database | null = null;
let remoteDb: any = null;
let isTurso = false;

if (isProd) {
  // In production, use Turso if credentials are available
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url && authToken) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createClient } = require('@libsql/client');
      remoteDb = createClient({
        url,
        authToken,
      });
      isTurso = true;
      console.log('✅ Connected to Turso database');
    } catch (error) {
      console.error('❌ Failed to connect to Turso:', error);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      remoteDb = require('./memory');
    }
  } else {
    console.log('⚠️ Missing TURSO credentials, using in-memory database');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    remoteDb = require('./memory');
  }
} else {
  // Local dev uses SQLite file (better-sqlite3)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BetterSqlite3 = require('better-sqlite3');
    const dbPath = process.env.LOCAL_SQLITE_PATH || path.join(process.cwd(), 'data', 'ugc-tracker.db');
    const dataDir = path.dirname(dbPath);
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    localDb = new BetterSqlite3(dbPath);
    console.log('✅ Connected to local SQLite database:', dbPath);
  } catch (error) {
    console.error('❌ Failed to initialize local database:', error);
    localDb = null;
  }
}

// Unified API
export const db = {
  async all<T = any>(sql: string, params?: Params): Promise<T[]> {
    if (localDb) {
      return localDb.prepare(sql).all(...toArray(params)) as T[];
    }
    if (isTurso && remoteDb) {
      const result = await remoteDb.execute(sql, toArray(params));
      return result.rows as T[];
    }
    if (remoteDb) {
      return remoteDb.prepare(sql).all(...toArray(params)) as T[];
    }
    throw new Error('No database connection available');
  },

  async get<T = any>(sql: string, params?: Params): Promise<T | undefined> {
    if (localDb) {
      return localDb.prepare(sql).get(...toArray(params)) as T | undefined;
    }
    if (isTurso && remoteDb) {
      const result = await remoteDb.execute(sql, toArray(params));
      return result.rows[0] as T | undefined;
    }
    if (remoteDb) {
      return remoteDb.prepare(sql).get(...toArray(params)) as T | undefined;
    }
    throw new Error('No database connection available');
  },

  async run(sql: string, params?: Params): Promise<{ changes: number; lastInsertRowid?: number }> {
    if (localDb) {
      const result = localDb.prepare(sql).run(...toArray(params));
      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined,
      };
    }
    if (isTurso && remoteDb) {
      const result = await remoteDb.execute(sql, toArray(params));
      return {
        changes: result.rowsAffected || 0,
        lastInsertRowid: undefined, // Turso doesn't provide this easily
      };
    }
    if (remoteDb) {
      const result = remoteDb.prepare(sql).run(...toArray(params));
      return {
        changes: result.changes || 0,
        lastInsertRowid: result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined,
      };
    }
    throw new Error('No database connection available');
  },
};

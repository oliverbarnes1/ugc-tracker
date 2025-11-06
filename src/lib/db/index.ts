// src/lib/db/index.ts
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'path';

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
      // Use @libsql/client for Turso
      const { createClient } = require('@libsql/client');
      remoteDb = createClient({
        url,
        authToken,
      });
      isTurso = true;
      console.log('Using Turso database in production');
    } catch (err) {
      console.error('Failed to initialize Turso client:', err);
      console.log('Falling back to in-memory database');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      remoteDb = require('./memory');
      isTurso = false;
    }
  } else {
    console.log('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN, using in-memory database');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    remoteDb = require('./memory');
    isTurso = false;
  }
} else {
  // Local dev uses the existing SQLite file (better-sqlite3)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BetterSqlite3 = require('better-sqlite3');
    const dbPath = process.env.LOCAL_SQLITE_PATH || path.join(process.cwd(), 'data', 'ugc-tracker.db');
    localDb = new BetterSqlite3(dbPath);
  } catch (err) {
    console.error('Failed to initialize local SQLite database:', err);
    // Don't throw - let it fail gracefully and use in-memory as fallback
    localDb = null;
  }
}

// Unified API
export const db = {
  async all<T = any>(sql: string, params?: Params): Promise<T[]> {
    // Always prefer local database if available
    if (localDb) {
      return localDb.prepare(sql).all(...toArray(params)) as T[];
    }
    
    if (remoteDb) {
      if (isTurso) {
        // Turso client uses execute() method
        try {
          const result = await remoteDb.execute(sql, toArray(params));
          // Turso returns rows as an array of objects with column names as keys
          // Convert to plain objects if needed
          return result.rows.map((row: any) => {
            if (row && typeof row === 'object') {
              // Convert row object to plain object
              const plain: any = {};
              for (const key in row) {
                plain[key] = row[key];
              }
              return plain as T;
            }
            return row as T;
          });
        } catch (err) {
          console.error('Turso all error:', err);
          console.error('SQL:', sql);
          console.error('Params:', params);
          throw err;
        }
      }
      // For in-memory database, use the same interface as SQLite
      return remoteDb.prepare(sql).all(...toArray(params)) as T[];
    }
    
    throw new Error('No database connection available');
  },

  async get<T = any>(sql: string, params?: Params): Promise<T | undefined> {
    // Always prefer local database if available
    if (localDb) {
      return localDb.prepare(sql).get(...toArray(params)) as T | undefined;
    }
    
    if (remoteDb) {
      if (isTurso) {
        // Turso client uses execute() method
        try {
          const result = await remoteDb.execute(sql, toArray(params));
          if (result.rows.length === 0) {
            return undefined;
          }
          // Convert row to plain object if needed
          const row = result.rows[0];
          if (row && typeof row === 'object') {
            return row as T;
          }
          return undefined;
        } catch (err) {
          console.error('Turso get error:', err);
          console.error('SQL:', sql);
          console.error('Params:', params);
          throw err;
        }
      }
      // For in-memory database, use the same interface as SQLite
      return remoteDb.prepare(sql).get(...toArray(params)) as T | undefined;
    }
    
    throw new Error('No database connection available');
  },

  async run(sql: string, params?: Params): Promise<{ changes: number; lastInsertRowid?: number }> {
    // Always prefer local database if available
    if (localDb) {
      const result = localDb.prepare(sql).run(...toArray(params));
      return {
        changes: result.changes || 0,
        lastInsertRowid: result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
      };
    }
    
    if (remoteDb) {
      if (isTurso) {
        // Turso client uses execute() method
        try {
          const result = await remoteDb.execute(sql, toArray(params));
          // Turso/libsql client returns result with meta information
          // Check what properties are available
          const meta = (result as any).meta || {};
          const changes = meta.rows_written || meta.rows_read || 0;
          const lastInsertRowidRaw = meta.last_insert_rowid || undefined;
          const lastInsertRowid = lastInsertRowidRaw !== undefined ? Number(lastInsertRowidRaw) : undefined;
          
          // Log the full result structure for debugging (first time only to avoid spam)
          if (!(globalThis as any).__turso_logged) {
            console.log('Turso execute result structure:', JSON.stringify(result, null, 2));
            (globalThis as any).__turso_logged = true;
          }
          
          return {
            changes: changes || 0,
            lastInsertRowid: lastInsertRowid,
          };
        } catch (err) {
          console.error('Turso execute error:', err);
          console.error('SQL:', sql);
          console.error('Params:', params);
          throw err;
        }
      }
      // For in-memory database, use the same interface as SQLite
      const result = remoteDb.prepare(sql).run(...toArray(params));
      return {
        changes: result.changes || 0,
        lastInsertRowid: result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
      };
    }
    
    throw new Error('No database connection available');
  },
};

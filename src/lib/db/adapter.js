// Database adapter that works with both SQLite (local) and PostgreSQL (production)

const isProduction = process.env.NODE_ENV === 'production' && process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');

if (isProduction) {
  // Use PostgreSQL in production
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  module.exports = {
    query: async (text, params) => {
      const client = await pool.connect();
      try {
        const result = await client.query(text, params);
        return {
          rows: result.rows,
          rowCount: result.rowCount,
          lastInsertRowid: result.rows[0]?.id || 0
        };
      } finally {
        client.release();
      }
    },
    prepare: (text) => ({
      run: async (params) => {
        const result = await module.exports.query(text, params);
        return {
          lastInsertRowid: result.lastInsertRowid,
          changes: result.rowCount
        };
      },
      get: async (params) => {
        const result = await module.exports.query(text, params);
        return result.rows[0] || null;
      },
      all: async (params) => {
        const result = await module.exports.query(text, params);
        return result.rows;
      }
    })
  };
} else {
  // Use SQLite in development
  const Database = require('better-sqlite3');
  const path = require('path');
  
  const dbPath = path.join(process.cwd(), 'data', 'ugc-tracker.db');
  const db = new Database(dbPath);
  
  module.exports = {
    query: async (text, params) => {
      // Convert PostgreSQL-style queries to SQLite
      const sqliteText = text
        .replace(/\$(\d+)/g, '?') // Replace $1, $2, etc. with ?
        .replace(/CURRENT_TIMESTAMP/g, "datetime('now')")
        .replace(/ON CONFLICT\(([^)]+)\) DO UPDATE SET/g, 'ON CONFLICT($1) DO UPDATE SET');
      
      const stmt = db.prepare(sqliteText);
      const result = stmt.run(params);
      return {
        rows: result.changes > 0 ? [result] : [],
        rowCount: result.changes,
        lastInsertRowid: result.lastInsertRowid
      };
    },
    prepare: (text) => {
      // Convert PostgreSQL-style queries to SQLite
      const sqliteText = text
        .replace(/\$(\d+)/g, '?') // Replace $1, $2, etc. with ?
        .replace(/CURRENT_TIMESTAMP/g, "datetime('now')")
        .replace(/ON CONFLICT\(([^)]+)\) DO UPDATE SET/g, 'ON CONFLICT($1) DO UPDATE SET');
      
      const stmt = db.prepare(sqliteText);
      return {
        run: (params) => stmt.run(params),
        get: (params) => stmt.get(params),
        all: (params) => stmt.all(params)
      };
    }
  };
}

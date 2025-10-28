// Build-safe database that never tries to access SQLite during build
const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV === 'production' && process.env.VERCEL === '1';

let db;

if (isBuildTime) {
  // During build time, use a minimal mock database
  db = {
    prepare: () => ({
      run: () => ({ lastInsertRowid: 0, changes: 0 }),
      get: () => null,
      all: () => []
    }),
    exec: () => {},
    pragma: () => {}
  };
} else {
  // At runtime, use the proper database
  db = require('./simple');
}

module.exports = db;

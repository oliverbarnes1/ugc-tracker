// Simple database wrapper that works in all environments
const isProduction = process.env.NODE_ENV === 'production';

let db;

if (isProduction) {
  // Always use in-memory database in production
  db = require('./memory');
} else {
  // Try SQLite in development, fallback to memory
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');
    
    const dbPath = path.join(process.cwd(), 'data', 'ugc-tracker.db');
    const dataDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = new Database(dbPath);
  } catch (error) {
    console.log('SQLite not available, using in-memory database');
    db = require('./memory');
  }
}

module.exports = db;

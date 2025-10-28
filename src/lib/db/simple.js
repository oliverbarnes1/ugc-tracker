// Simple database wrapper that works in all environments
const isProduction = process.env.NODE_ENV === 'production';
const isBuild = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1';

let db;

// Always use in-memory database during build and production
if (isProduction || isBuild) {
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

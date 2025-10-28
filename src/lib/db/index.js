// Use different database implementations for development vs production
let db;

try {
  if (process.env.NODE_ENV === 'production') {
    // In production (Vercel), use in-memory database
    console.log('Using in-memory database for production');
    db = require('./memory');
  } else {
    // In development, try to use SQLite
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');
    
    const dbPath = path.join(process.cwd(), 'data', 'ugc-tracker.db');
    const dataDir = path.dirname(dbPath);
    
    // Ensure data directory exists in development
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Initialize SQLite database
    db = new Database(dbPath);
  }
} catch (error) {
  console.log('SQLite not available, falling back to in-memory database:', error.message);
  // Fallback to in-memory database if SQLite fails
  db = require('./memory');
}

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Read and execute schema
const schemaPath = path.join(__dirname, 'schema.sql');
let schema;
try {
  schema = fs.readFileSync(schemaPath, 'utf8');
} catch (error) {
  console.error('Could not read schema file:', schemaPath);
  // Create a minimal schema if file doesn't exist
  schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS creators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      platform TEXT DEFAULT 'tiktok',
      profile_url TEXT,
      avatar_url TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER,
      external_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      content_type TEXT DEFAULT 'video',
      caption TEXT,
      media_url TEXT,
      thumbnail_url TEXT,
      post_url TEXT,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES creators (id)
    );
    
    CREATE TABLE IF NOT EXISTS post_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      engagement_rate REAL DEFAULT 0,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts (id)
    );
    
    CREATE TABLE IF NOT EXISTS creator_stats_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER,
      date DATE NOT NULL,
      posts_count INTEGER DEFAULT 0,
      total_views INTEGER DEFAULT 0,
      total_likes INTEGER DEFAULT 0,
      total_comments INTEGER DEFAULT 0,
      total_shares INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES creators (id)
    );
    
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER,
      status TEXT NOT NULL,
      message TEXT,
      error_details TEXT,
      processed_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES creators (id)
    );
  `;
}

// Split schema into individual statements and execute
const statements = schema
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0);

statements.forEach(statement => {
  try {
    db.exec(statement);
  } catch (error) {
    console.error('Error executing statement:', statement);
    console.error('Error:', error.message);
  }
});

module.exports = db;
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'data', 'ugc-tracker.db');
const dataDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Read and execute schema
const schemaPath = path.join(__dirname, '..', 'src', 'lib', 'db', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Split schema into individual statements and execute
const statements = schema
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0);

console.log('Initializing database...');

statements.forEach(statement => {
  try {
    db.exec(statement);
    console.log('✓ Executed statement');
  } catch (error) {
    console.error('Error executing statement:', statement);
    console.error('Error:', error.message);
  }
});

console.log('Database initialized successfully!');
console.log('Database location:', dbPath);

db.close();

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'ugc-tracker.db');

// Open database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Updating creator username from leo.nasr to leo.picks...');

try {
  // First, check if the old username exists
  const oldCreator = db.prepare('SELECT id, username FROM creators WHERE username = ?').get('leo.nasr');
  
  if (!oldCreator) {
    console.log('No creator found with username "leo.nasr". Checking if "leo.picks" already exists...');
    const newCreator = db.prepare('SELECT id, username FROM creators WHERE username = ?').get('leo.picks');
    
    if (newCreator) {
      console.log(`✓ Creator already exists with username "leo.picks" (ID: ${newCreator.id})`);
    } else {
      console.log('⚠ No creator found with either username. The creator may not exist in the database yet.');
    }
    db.close();
    process.exit(0);
  }

  console.log(`Found creator with old username (ID: ${oldCreator.id})`);

  // Check if the new username already exists
  const existingNewCreator = db.prepare('SELECT id FROM creators WHERE username = ?').get('leo.picks');
  if (existingNewCreator) {
    console.log('⚠ Creator with username "leo.picks" already exists! Cannot update.');
    db.close();
    process.exit(1);
  }

  // Update the username
  const result = db.prepare('UPDATE creators SET username = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?').run(
    'leo.picks',
    'leo.picks',
    'leo.nasr'
  );

  if (result.changes > 0) {
    console.log(`✓ Successfully updated creator username from "leo.nasr" to "leo.picks"`);
    console.log(`  - Rows updated: ${result.changes}`);
    
    // Verify the update
    const updatedCreator = db.prepare('SELECT id, username, display_name FROM creators WHERE username = ?').get('leo.picks');
    if (updatedCreator) {
      console.log(`✓ Verified: Creator ID ${updatedCreator.id} now has username "${updatedCreator.username}"`);
    }
  } else {
    console.log('⚠ No rows were updated. The creator may not exist or already has the new username.');
  }

} catch (error) {
  console.error('Error updating username:', error);
  db.close();
  process.exit(1);
}

db.close();
console.log('Update complete!');




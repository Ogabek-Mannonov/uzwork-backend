const pool = require('../src/db/pool');

async function updateConstraint() {
  try {
    console.log("Dropping old constraint...");
    await pool.query(`ALTER TABLE messages DROP CONSTRAINT messages_type_check;`);
    console.log("Dropped.");
    
    console.log("Adding new constraint...");
    await pool.query(`ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('text', 'image', 'file', 'voice', 'video', 'video_call'));`);
    console.log("Added constraint successfully.");
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateConstraint();

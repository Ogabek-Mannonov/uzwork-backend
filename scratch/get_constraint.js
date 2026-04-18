const pool = require('../src/db/pool');
pool.query(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'messages_type_check'`)
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });

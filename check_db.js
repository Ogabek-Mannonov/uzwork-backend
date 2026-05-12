const pool = require('./src/db/pool.js');

async function main() {
  try {
    console.log("--- CONTRACTS ---");
    const contractsRes = await pool.query("SELECT id, client_id, freelancer_id, status FROM contracts ORDER BY updated_at DESC LIMIT 5");
    console.log(JSON.stringify(contractsRes.rows, null, 2));

    console.log("--- RATINGS ---");
    const ratingsRes = await pool.query("SELECT id, contract_id, from_user_id, to_user_id, created_at FROM ratings ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(ratingsRes.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();

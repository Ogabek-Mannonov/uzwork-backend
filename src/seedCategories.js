// backend/src/seedCategories.js
const pool = require("./db/pool");

const categories = [
  // Development & IT
  "Frontend Development",
  "Backend Development",
  "Full Stack Development",
  "Mobile App Development",
  "Game Development",
  "DevOps & Cloud",
  "Data Science & ML",
  "Cybersecurity",
  "Blockchain & Web3",
  "QA & Testing",
  "Desktop Software",
  "Embedded Systems",
  
  // Design & Creative
  "UI/UX Design",
  "Graphic Design",
  "Motion Graphics",
  "3D Modeling & Rendering",
  "Video Editing",
  "Illustration",
  "Brand Identity",
  "Photography",

  // Writing & Translation
  "Content Writing",
  "Copywriting",
  "Technical Writing",
  "Translation & Localization",
  "Proofreading & Editing",

  // Marketing & Sales
  "Digital Marketing",
  "SEO Optimization",
  "SMM Management",
  "Sales & Business Development",
  "Email Marketing",
  "Ads Management",

  // Admin & Others
  "Virtual Assistant",
  "Customer Support",
  "Data Entry",
  "Project Management",
  "Business Analysis",
  "Legal & Finance",
  "Other / Boshqa"
];

const seed = async () => {
  try {
    console.log("Seeding comprehensive categories...");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      );
    `);

    for (const name of categories) {
      // Manual existence check to avoid "missing unique constraint" errors
      const exists = await pool.query("SELECT id FROM categories WHERE name = $1", [name]);
      if (exists.rows.length === 0) {
        await pool.query("INSERT INTO categories (name) VALUES ($1)", [name]);
      }
    }
    
    console.log("✅ Comprehensive categories seeded successfully!");
    
    const res = await pool.query("SELECT COUNT(*) FROM categories");
    console.log(`Total categories in DB: ${res.rows[0].count}`);
    
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    process.exit();
  }
};

seed();

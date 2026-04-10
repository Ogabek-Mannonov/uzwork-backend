const pool = require("../src/db/pool");

const migration = `
-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id INTEGER REFERENCES public.categories(id) ON DELETE CASCADE,
    icon VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 2. Add category_id to freelancer_profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='freelancer_profiles' AND column_name='category_id') THEN
        ALTER TABLE public.freelancer_profiles ADD COLUMN category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Seed initial categories
INSERT INTO public.categories (name, slug) VALUES 
('Web Development', 'web-development'),
('Mobile Development', 'mobile-development'),
('Design & Creative', 'design-creative'),
('Writing & Translation', 'writing-translation'),
('IT & Networking', 'it-networking'),
('Data Science & AI', 'data-science-ai'),
('Marketing', 'marketing'),
('Business Consulting', 'business-consulting'),
('Video & Animation', 'video-animation')
ON CONFLICT (slug) DO NOTHING;
`;

async function run() {
    try {
        console.log("🚀 Starting database migration...");
        await pool.query(migration);
        console.log("✅ Migration completed successfully!");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        process.exit();
    }
}

run();

const pool = require('../src/db/pool');

const INITIAL_SKILLS = [
  "React", "Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS", "GraphQL", "Python", "REST API", "MongoDB",
  "JavaScript", "HTML5", "CSS3", "Next.js", "Vue.js", "Angular", "PHP", "Laravel", "MySQL", "Redis",
  "Flutter", "React Native", "Swift", "Kotlin", "Java", "C#", "C++", "Unity", "Unreal Engine",
  "Go", "Rust", "Ruby on Rails", "Django", "Flask", "Spring Boot", "ASP.NET", "Kubernetes", "Azure", "Google Cloud",
  "Figma", "UI/UX Design", "Prototyping", "Adobe XD", "Webflow", "Sketch", "Design Systems",
  "Photoshop", "Illustrator", "Indesign", "After Effects", "Premiere Pro", "3D Modeling", "Blender",
  "Motion Graphics", "Logo Design", "Branding", "Typography", "Color Theory", "Vector Art",
  "Social Media Marketing", "Email Marketing", "Google Ads", "Facebook Ads", "Instagram Marketing", 
  "SEO", "SEM", "Content Strategy", "Growth Hacking", "Affiliate Marketing",
  "SEO Writing", "Copywriting", "Blog Posts", "Technical Writing", "Proofreading", "Translation", 
  "Transcription", "Creative Writing", "Grant Writing", "Ghostwriting",
  "Machine Learning", "Data Science", "Artificial Intelligence", "Natural Language Processing", "Computer Vision",
  "Data Analysis", "Big Data", "Pandas", "NumPy", "TensorFlow", "PyTorch", "Tableau", "Power BI",
  "Project Management", "Agile", "Scrum", "Product Management", "QA Testing", "Cyber Security",
  "Data Entry", "Virtual Assistant", "Customer Support", "Sales", "Business Analysis", "Financial Modeling",
  "Blockchain", "Solidity", "Web3", "Smart Contracts", "Crypto", "NestJS", "Express.js", "Svelte", "Sass",
  "Tailwind CSS", "Bootstrap", "Material UI", "Redux", "Zustand", "Jest", "Cypress", "Selenium",
  "Webpack", "Babel", "Vite", "Linux", "Bash", "Shell Scripting", "Git", "GitHub", "GitLab",
  "CI/CD", "Jenkins", "Travis CI", "CircleCI", "Nginx", "Apache", "Elasticsearch", "RabbitMQ", "Kafka",
  "GraphQL API", "Apollo", "Prisma", "TypeORM", "Sequelize", "Mongoose", "Socket.io", "WebRTC",
  "UI Design", "UX Research", "Wireframing", "User Testing", "Information Architecture", "Interaction Design",
  "Framer", "InVision", "Marvel", "Zeplin", "CorelDRAW", "Lightroom", "Final Cut Pro", "DaVinci Resolve",
  "Animation", "2D Animation", "3D Animation", "Character Design", "Illustration", "Digital Painting",
  "Video Editing", "Audio Editing", "Podcasting", "Voice Over", "Music Production", "Sound Design",
  "Content Writing", "Article Writing", "Resume Writing", "Cover Letter Writing", "Press Releases",
  "Sales Copy", "Product Descriptions", "Editing", "Data Visualization", "Excel", "Google Sheets",
  "Financial Analysis", "Accounting", "Bookkeeping", "Tax Preparation", "QuickBooks", "Xero",
  "HR Management", "Recruiting", "Interviewing", "Employee Relations", "Training & Development",
  "Lead Generation", "B2B Sales", "B2C Sales", "Cold Calling", "Email Outreach", "CRM", "Salesforce", "HubSpot",
  "Zendesk", "Intercom", "Chat Support", "Technical Support", "IT Helpdesk", "Network Administration"
];

async function seedSkills() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create table if it doesn't exist at all
    await client.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Just in case the table already existed but without these columns
    await client.query(`
      ALTER TABLE skills ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0;
      ALTER TABLE skills ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    
    // Insert skills
    for (const skill of INITIAL_SKILLS) {
      await client.query(`
        INSERT INTO skills (name, usage_count) 
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET usage_count = skills.usage_count + 1
      `, [skill.trim(), 1]);
    }

    await client.query('COMMIT');
    console.log(`✅ O'rnatish muvaffaqiyatli! Jami ${INITIAL_SKILLS.length} ta ko'nikmalar bazaga yozildi.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Xatolik yuz berdi:', error);
  } finally {
    client.release();
    pool.end();
  }
}

seedSkills();

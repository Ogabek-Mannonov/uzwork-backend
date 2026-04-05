-- UzWork Backend - New Database Schema
-- Using UUID for all IDs

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users (umumiy foydalanuvchilar – asosiy jadval)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,               -- profil linki uchun (masalan: ogabek_dev)
    first_name VARCHAR(100) NOT NULL,                   -- real ism
    last_name VARCHAR(100) NOT NULL,                    -- real familiya
    display_name VARCHAR(100),                          -- foydalanuvchi xohlagan nom (ixtiyoriy)
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(20) CHECK (role IN ('freelancer', 'client', 'admin')) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    premium_until TIMESTAMP,
    balance_uzs DECIMAL(15,2) DEFAULT 0,
    balance_usd DECIMAL(15,2) DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Indexlar (tez qidirish uchun)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Profiles (freelancer va client uchun alohida)
CREATE TABLE IF NOT EXISTS freelancer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    bio TEXT,
    hourly_rate DECIMAL(10,2),
    location VARCHAR(100),
    languages JSONB DEFAULT '[]', -- ["uz", "ru", "en"]
    skills JSONB DEFAULT '[]',    -- ["React", "Python", "Design"]
    portfolio_urls JSONB DEFAULT '[]', -- portfolio linklari
    rating DECIMAL(3,2) DEFAULT 0,
    completed_jobs INT DEFAULT 0,
    avatar_url TEXT,
    cover_url TEXT,
    cv_url TEXT, -- CV fayli uchun link
    availability_status VARCHAR(20) DEFAULT 'available', -- available, busy, offline
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS client_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    company_website TEXT,
    company_size VARCHAR(50),
    rating DECIMAL(3,2) DEFAULT 0,
    spent_total DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Skills & Categories
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_skills (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    level INT CHECK (level BETWEEN 1 AND 5),
    PRIMARY KEY (user_id, skill_id)
);

-- 4. Jobs (loyihalar)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    job_type VARCHAR(20) CHECK (job_type IN ('fixed', 'hourly')) NOT NULL,
    budget_min DECIMAL(15,2),
    budget_max DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'UZS',
    deadline TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    is_boosted BOOLEAN DEFAULT false,
    boosted_until TIMESTAMP,
    proposals_count INT DEFAULT 0,
    attachments JSONB DEFAULT '[]', -- fayllar linklari
    required_skills JSONB DEFAULT '[]',
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- 5. Job Skills
CREATE TABLE IF NOT EXISTS job_skills (
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, skill_id)
);

-- 6. Proposals (takliflar)
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    freelancer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    proposed_price DECIMAL(15,2),
    proposed_duration INT, -- kunlarda
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    ai_score DECIMAL(3,2),
    files JSONB DEFAULT '[]', -- taklifda fayllar
    milestones JSONB DEFAULT '[]', -- taklifdagi milestone lar
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Contracts & Milestones
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    freelancer_id UUID REFERENCES users(id),
    client_id UUID REFERENCES users(id),
    total_amount DECIMAL(15,2),
    platform_fee DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'disputed')),
    signed_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    title VARCHAR(255),
    amount DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'released')),
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Payments & Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(20) CHECK (type IN ('deposit', 'withdrawal', 'escrow_release', 'fee', 'refund')),
    amount DECIMAL(15,2),
    currency VARCHAR(10),
    gateway VARCHAR(50), -- payme, click, visa
    gateway_transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Messages & Chat
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    contract_id UUID REFERENCES contracts(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'file', 'voice', 'video')),
    file_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Digital Marketplace
CREATE TABLE IF NOT EXISTS marketplace_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(id),
    title VARCHAR(255),
    description TEXT,
    price DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'UZS',
    files JSONB DEFAULT '[]',
    sales_count INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Disputes & Support
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id),
    raised_by UUID REFERENCES users(id),
    reason TEXT,
    evidence_files JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'open',
    resolved_at TIMESTAMP,
    resolution TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 12. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    body TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexlar (tezkor ishlash uchun)
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_job ON proposals(job_id);
CREATE INDEX IF NOT EXISTS idx_proposals_freelancer ON proposals(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_job ON contracts(job_id);
CREATE INDEX IF NOT EXISTS idx_contracts_freelancer ON contracts(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_milestones_contract ON milestones(contract_id);
CREATE INDEX IF NOT EXISTS idx_disputes_contract ON disputes(contract_id);


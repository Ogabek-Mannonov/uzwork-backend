<h1 align="center">UzWork Backend API 🚀</h1>

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="NodeJS" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="ExpressJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens" alt="JWT" />
  <img src="https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101" alt="Socket.io" />
</div>

<br />

<p align="center">
  <b>A robust, scalable, and secure RESTful API built for a modern freelance marketplace (similar to Upwork).</b><br/>
  It powers user authentication, project management, proposals, contract tracking, real-time messaging, and KYC verification.
</p>

---

## ✨ Key Features

- **🔐 Advanced Authentication & Security:** 
  - JWT-based authentication (Access & Refresh tokens).
  - Two-Factor Authentication (2FA) via Google Authenticator.
  - Password hashing with Bcrypt & security headers via Helmet.
- **💼 Project & Proposal Management:** 
  - Clients can post projects (Fixed & Hourly).
  - Freelancers can submit proposals and bid on projects.
  - Full project lifecycle tracking (Open -> In Progress -> Completed).
- **📝 Contracts & Escrow logic:** 
  - Seamlessly convert accepted proposals into active contracts.
  - Milestone tracking and status updates.
- **💬 Real-time Communication:** 
  - Integrated `Socket.io` for instant messaging between clients and freelancers.
- **⭐ Reviews & Ratings:** 
  - Comprehensive rating system for completed contracts.
- **🛡️ KYC & Identity Verification:** 
  - Passport and ID verification flows for platform safety.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js (v5)
- **Database:** PostgreSQL (pg)
- **Authentication:** JSON Web Tokens (JWT), Google Auth Library
- **Real-time:** Socket.io
- **File Uploads:** Multer & Sharp (Image Processing)
- **Email Services:** Nodemailer

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### 1. Clone the repository
```bash
git clone https://github.com/Ogabek-Mannonov/uzwork-backend.git
cd uzwork-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory and add the following variables:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/uzwork_db

# Security
JWT_SECRET=your_jwt_secret_key
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
BCRYPT_SALT_ROUNDS=10

# Third-party integrations
GOOGLE_CLIENT_ID=your_google_client_id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_app_password
```

### 4. Database Setup
Create a new PostgreSQL database and run the schema files located in the `/database` folder to generate the tables.

### 5. Run the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

---

## 📁 Project Structure

```text
uzwork-backend/
├── database/           # SQL schema files and migrations
├── scripts/            # Helper and testing scripts
├── src/
│   ├── config/         # App configurations (DB, Socket, etc.)
│   ├── controllers/    # Request handlers (Auth, Projects, etc.)
│   ├── middlewares/    # Custom middlewares (Auth guard, Error handler)
│   ├── routes/         # Express API route definitions
│   ├── utils/          # Helper functions (JWT, Email, Hash)
│   └── server.js       # Application entry point
├── uploads/            # Local storage for file uploads
└── .env                # Environment variables
```

---

## 🌐 Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register a new user |
| `POST` | `/auth/login` | Authenticate user & get tokens |
| `POST` | `/projects` | Create a new project |
| `GET` | `/projects` | List projects with filters & pagination |
| `POST` | `/proposals` | Submit a proposal for a project |
| `POST` | `/contracts` | Create a contract from a proposal |
| `GET` | `/messages` | Fetch chat history |
| `POST` | `/reviews` | Leave a review for a user |

---

<div align="center">
  <i>Developed with ❤️ for the modern freelance economy.</i>
</div>

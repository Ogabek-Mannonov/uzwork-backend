# UzWork Backend

Backend API для платформы фриланса UzWork (аналог Upwork).

## Технологии

- **Node.js** + **Express.js** 5.2.1
- **PostgreSQL** (pg 8.16.3)
- **JWT** для аутентификации
- **bcryptjs** для хеширования паролей
- **Helmet** для безопасности
- **CORS** для кросс-доменных запросов
- **Morgan** для логирования

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/Ogabek-Mannonov/uzwork-backend.git
cd uzwork-backend
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` в корне проекта:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/uzwork_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

4. Создайте базу данных и выполните миграции:
```bash
# Подключитесь к PostgreSQL и выполните:
psql -U postgres -d uzwork_db -f database/schema.sql
```

5. Запустите сервер:
```bash
# Production
npm start

# Development (с автоперезагрузкой)
npm run dev
```

## API Endpoints

### Аутентификация и безопасность

#### POST /auth/signup
Регистрация нового пользователя.

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+998901234567",
  "password": "securepass",
  "role": "freelancer",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ro'yxatdan muvaffaqiyatli o'tdingiz!",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "phone": "+998901234567",
      "role": "freelancer",
      "first_name": "John",
      "last_name": "Doe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "smsCode": "123456" // Только в development режиме
  }
}
```

#### POST /auth/login
Вход в систему (по email/phone + password или SMS коду).

**Request Body (с паролем):**
```json
{
  "email": "user@example.com",
  "password": "securepass"
}
```

**Request Body (с SMS кодом):**
```json
{
  "phone": "+998901234567",
  "sms_code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Muvaffaqiyatli kirildi!",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "phone": "+998901234567",
      "role": "freelancer",
      "is_email_verified": true,
      "is_phone_verified": true,
      "is_kyc_verified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /auth/refresh
Обновление access token с помощью refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token yangilandi!",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /auth/verify
Верификация SMS кода или паспорта.

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body (SMS):**
```json
{
  "sms_code": "123456"
}
```

**Request Body (Passport):**
```json
{
  "passport_number": "AB1234567",
  "passport_image_url": "https://example.com/passport.jpg"
}
```

#### POST /auth/kyc
Отправка KYC заявки (Know Your Customer).

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "passport_number": "AB1234567",
  "passport_image_url": "https://example.com/passport.jpg"
}
```

#### GET /auth/me
Получение информации о текущем пользователе.

**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "phone": "+998901234567",
      "role": "freelancer",
      "first_name": "John",
      "last_name": "Doe",
      "is_email_verified": true,
      "is_phone_verified": true,
      "is_kyc_verified": false,
      "kyc_status": "pending",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### POST /auth/logout
Выход из системы (инвалидация refresh token).

**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "success": true,
  "message": "Muvaffaqiyatli chiqildi!"
}
```

### Проекты (Projects)

#### POST /projects
Создание нового проекта (только для клиентов).

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "title": "Web sayt yaratish",
  "description": "Modern web sayt yaratish kerak",
  "category": "Web Development",
  "skills": ["React", "Node.js", "PostgreSQL"],
  "budget_type": "fixed",
  "budget_min": 500,
  "budget_max": 1000,
  "duration": "1-3 months",
  "experience_level": "intermediate",
  "attachments": ["https://example.com/file.pdf"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Loyiha muvaffaqiyatli yaratildi!",
  "data": {
    "project": {
      "id": 1,
      "client_id": 1,
      "title": "Web sayt yaratish",
      "description": "Modern web sayt yaratish kerak",
      "status": "open",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### GET /projects
Получение списка проектов с фильтрацией и пагинацией.

**Query Parameters:**
- `status` - Статус проекта (open, in_progress, completed, cancelled, closed)
- `category` - Категория
- `budget_type` - Тип бюджета (fixed, hourly)
- `experience_level` - Уровень опыта (entry, intermediate, expert)
- `min_budget` - Минимальный бюджет
- `max_budget` - Максимальный бюджет
- `search` - Поиск по названию и описанию
- `page` - Номер страницы (по умолчанию 1)
- `limit` - Количество на странице (по умолчанию 20)
- `sort_by` - Сортировка (created_at, budget_min, budget_max, title)
- `order` - Порядок сортировки (ASC, DESC)

**Example:** `GET /projects?status=open&category=Web Development&page=1&limit=10`

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "title": "Web sayt yaratish",
        "description": "Modern web sayt yaratish kerak",
        "client_first_name": "John",
        "client_last_name": "Doe",
        "proposals_count": 5,
        "status": "open"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

#### GET /projects/:id
Получение проекта по ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "title": "Web sayt yaratish",
      "description": "Modern web sayt yaratish kerak",
      "client_first_name": "John",
      "client_last_name": "Doe",
      "proposals_count": 5
    }
  }
}
```

#### GET /projects/my
Получение проектов текущего пользователя.

**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**
- `status` - Фильтр по статусу
- `page` - Номер страницы
- `limit` - Количество на странице

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [...],
    "pagination": {...}
  }
}
```

#### PUT /projects/:id
Обновление проекта (только владелец).

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:** (все поля опциональны)
```json
{
  "title": "Yangilangan sarlavha",
  "description": "Yangilangan tavsif",
  "budget_max": 1500
}
```

#### DELETE /projects/:id
Удаление проекта (только владелец).

**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "success": true,
  "message": "Loyiha muvaffaqiyatli o'chirildi!"
}
```

### Предложения (Proposals)

#### POST /proposals
Создание предложения на проект (только для фрилансеров).

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body (для fixed проекта):**
```json
{
  "project_id": 1,
  "cover_letter": "Men bu loyihani bajarishga tayyorman...",
  "proposed_amount": 800,
  "estimated_days": 30
}
```

**Request Body (для hourly проекта):**
```json
{
  "project_id": 1,
  "cover_letter": "Men bu loyihani bajarishga tayyorman...",
  "proposed_rate": 25,
  "estimated_hours": 40
}
```

**Response:**
```json
{
  "success": true,
  "message": "Taklif muvaffaqiyatli yuborildi!",
  "data": {
    "proposal": {
      "id": 1,
      "project_id": 1,
      "freelancer_id": 2,
      "status": "pending",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### GET /proposals
Получение списка предложений с фильтрацией.

**Query Parameters:**
- `project_id` - ID проекта
- `freelancer_id` - ID фрилансера
- `status` - Статус (pending, accepted, rejected, withdrawn)
- `page` - Номер страницы
- `limit` - Количество на странице

#### GET /proposals/:id
Получение предложения по ID.

#### GET /proposals/my
Получение моих предложений (только для фрилансеров).

**Headers:** `Authorization: Bearer <accessToken>`

#### GET /proposals/project/:projectId
Получение предложений на конкретный проект (только для владельца проекта).

**Headers:** `Authorization: Bearer <accessToken>`

#### PUT /proposals/:id
Обновление предложения (только автор).

**Headers:** `Authorization: Bearer <accessToken>`

#### DELETE /proposals/:id
Отзыв предложения (только автор).

**Headers:** `Authorization: Bearer <accessToken>`

#### POST /proposals/:id/accept
Принятие предложения (только владелец проекта).

**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "success": true,
  "message": "Taklif qabul qilindi! Loyiha \"in_progress\" statusiga o'tdi."
}
```

#### POST /proposals/:id/reject
Отклонение предложения (только владелец проекта).

**Headers:** `Authorization: Bearer <accessToken>`

### Контракты (Contracts)

#### POST /contracts
Создание контракта из принятого предложения (только для клиентов).

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "proposal_id": 1
}
```

#### GET /contracts
Получение списка контрактов с фильтрацией.

**Query Parameters:**
- `project_id` - ID проекта
- `client_id` - ID клиента
- `freelancer_id` - ID фрилансера
- `status` - Статус (active, completed, cancelled, disputed)
- `page` - Номер страницы
- `limit` - Количество на странице

#### GET /contracts/:id
Получение контракта по ID.

**Headers:** `Authorization: Bearer <accessToken>`

#### GET /contracts/my
Получение моих контрактов.

**Headers:** `Authorization: Bearer <accessToken>`

#### PUT /contracts/:id
Обновление контракта (даты, milestones).

**Headers:** `Authorization: Bearer <accessToken>`

#### POST /contracts/:id/complete
Завершение контракта (только клиент).

**Headers:** `Authorization: Bearer <accessToken>`

#### POST /contracts/:id/cancel
Отмена контракта.

**Headers:** `Authorization: Bearer <accessToken>`

### Отзывы (Reviews)

#### POST /reviews
Создание отзыва для завершенного контракта.

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "contract_id": 1,
  "rating": 5,
  "comment": "Ajoyib ish! Juda yaxshi natija."
}
```

#### GET /reviews
Получение списка отзывов с фильтрацией.

**Query Parameters:**
- `reviewee_id` - ID пользователя, на которого отзыв
- `reviewer_id` - ID автора отзыва
- `contract_id` - ID контракта
- `min_rating` - Минимальный рейтинг
- `page` - Номер страницы
- `limit` - Количество на странице

#### GET /reviews/user/:userId
Получение отзывов пользователя с статистикой.

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [...],
    "stats": {
      "total_reviews": 10,
      "average_rating": "4.5",
      "rating_distribution": {
        "five_star": 5,
        "four_star": 3,
        "three_star": 1,
        "two_star": 1,
        "one_star": 0
      }
    }
  }
}
```

#### PUT /reviews/:id
Обновление отзыва (только автор).

**Headers:** `Authorization: Bearer <accessToken>`

### Профили (Profiles)

#### GET /profiles/me
Получение своего профиля.

**Headers:** `Authorization: Bearer <accessToken>`

#### GET /profiles/:userId
Получение профиля пользователя по ID.

#### PUT /profiles/me
Обновление своего профиля.

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "bio": "Experienced web developer",
  "avatar_url": "https://example.com/avatar.jpg",
  "location": "Tashkent, Uzbekistan",
  "hourly_rate": 25,
  "skills": ["React", "Node.js", "PostgreSQL"],
  "portfolio_urls": ["https://example.com/portfolio"],
  "languages": [
    {"language": "English", "level": "Fluent"},
    {"language": "Russian", "level": "Native"}
  ],
  "education": [
    {
      "degree": "Bachelor",
      "field": "Computer Science",
      "university": "TUIT",
      "year": 2020
    }
  ],
  "work_experience": [
    {
      "title": "Senior Developer",
      "company": "Tech Corp",
      "duration": "2020-2023"
    }
  ],
  "availability": "available"
}
```

## Структура проекта

```
uzwork-backend/
├── database/
│   └── schema.sql          # SQL схема базы данных
├── src/
│   ├── config/
│   │   └── index.js        # Конфигурация приложения
│   ├── controllers/
│   │   ├── authController.js  # Контроллеры аутентификации
│   │   ├── projectController.js  # Контроллеры проектов
│   │   ├── proposalController.js  # Контроллеры предложений
│   │   ├── contractController.js  # Контроллеры контрактов
│   │   ├── reviewController.js  # Контроллеры отзывов
│   │   └── profileController.js  # Контроллеры профилей
│   ├── db/
│   │   └── pool.js         # Пул подключений к БД
│   ├── middlewares/
│   │   └── authMiddleware.js  # Middleware для аутентификации
│   ├── routes/
│   │   ├── authRoutes.js   # Маршруты аутентификации
│   │   ├── projectRoutes.js  # Маршруты проектов
│   │   ├── proposalRoutes.js  # Маршруты предложений
│   │   ├── contractRoutes.js  # Маршруты контрактов
│   │   ├── reviewRoutes.js  # Маршруты отзывов
│   │   └── profileRoutes.js  # Маршруты профилей
│   ├── utils/
│   │   ├── hashPassword.js # Утилиты для паролей
│   │   └── jwt.js          # Утилиты для JWT
│   └── server.js           # Главный файл сервера
├── .env                    # Переменные окружения (не в git)
├── package.json
└── README.md
```

## Роли пользователей

- **freelancer** - Фрилансер (исполнитель)
- **client** - Клиент (заказчик)

## Безопасность

- Пароли хешируются с помощью bcrypt (10 раундов)
- JWT токены с коротким временем жизни (15 минут)
- Refresh токены для обновления access токенов
- Helmet для защиты от распространенных уязвимостей
- CORS настроен для кросс-доменных запросов

## TODO

- [ ] Интеграция SMS сервиса для отправки кодов
- [ ] Email верификация
- [ ] Интеграция с сервисом верификации паспортов
- [ ] Система уведомлений
- [ ] Rate limiting
- [ ] Логирование в файл

## Лицензия

ISC

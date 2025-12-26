# Тестирование UzWork Backend с Postman

## 🚀 Быстрый старт

### 1. Настройка Postman

1. Откройте Postman
2. Создайте новую коллекцию: `UzWork Backend`
3. Создайте переменные окружения:
   - `baseUrl` = `http://localhost:3000`
   - `accessToken` = (будет заполнено после входа)

### 2. Проверка сервера

**GET** `{{baseUrl}}/`

**Ожидаемый ответ:**
```json
{
  "message": "UzWork backend ishlayapti! 🇺🇿🚀",
  "database_time": "2024-12-26T..."
}
```

---

## 🔐 Аутентификация

### 1. Регистрация клиента

**POST** `{{baseUrl}}/auth/signup`

**Body (raw JSON):**
```json
{
  "email": "client@test.com",
  "phone": "+998901234567",
  "password": "password123",
  "role": "client",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Сохраните `accessToken` из ответа в переменную `accessToken`!**

### 2. Регистрация фрилансера

**POST** `{{baseUrl}}/auth/signup`

**Body:**
```json
{
  "email": "freelancer@test.com",
  "phone": "+998901234568",
  "password": "password123",
  "role": "freelancer",
  "first_name": "Jane",
  "last_name": "Smith"
}
```

### 3. Вход в систему

**POST** `{{baseUrl}}/auth/login`

**Body:**
```json
{
  "email": "client@test.com",
  "password": "password123"
}
```

**В ответе получите `accessToken` - сохраните его!**

### 4. Получить информацию о себе

**GET** `{{baseUrl}}/auth/me`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

### 5. Обновить токен

**POST** `{{baseUrl}}/auth/refresh`

**Body:**
```json
{
  "refreshToken": "ваш_refresh_token"
}
```

### 6. Выход

**POST** `{{baseUrl}}/auth/logout`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

## 📁 Проекты

### 1. Создать проект (только клиент)

**POST** `{{baseUrl}}/projects`

**Headers:**
```
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Web sayt yaratish",
  "description": "Modern va responsive web sayt yaratish kerak. React va Node.js ishlatiladi.",
  "category": "Web Development",
  "skills": ["React", "Node.js", "PostgreSQL"],
  "budget_type": "fixed",
  "budget_min": 500,
  "budget_max": 1000,
  "duration": "1-3 months",
  "experience_level": "intermediate"
}
```

### 2. Создать проект с почасовой оплатой

**POST** `{{baseUrl}}/projects`

**Body:**
```json
{
  "title": "Mobile app yaratish",
  "description": "iOS va Android uchun mobile ilova",
  "category": "Mobile Development",
  "skills": ["React Native", "TypeScript"],
  "budget_type": "hourly",
  "hourly_rate": 25,
  "duration": "Less than 1 month",
  "experience_level": "expert"
}
```

### 3. Получить все проекты

**GET** `{{baseUrl}}/projects?status=open&page=1&limit=10`

**Query параметры:**
- `status` - open, in_progress, completed, cancelled, closed
- `category` - Web Development, Mobile Development, etc.
- `budget_type` - fixed, hourly
- `min_budget` - минимальный бюджет
- `max_budget` - максимальный бюджет
- `search` - поиск по названию/описанию
- `page` - номер страницы
- `limit` - количество на странице

### 4. Получить проект по ID

**GET** `{{baseUrl}}/projects/1`

### 5. Получить мои проекты

**GET** `{{baseUrl}}/projects/my`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

### 6. Обновить проект

**PUT** `{{baseUrl}}/projects/1`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body:**
```json
{
  "title": "Yangilangan sarlavha",
  "budget_max": 1500
}
```

### 7. Удалить проект

**DELETE** `{{baseUrl}}/projects/1`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

## 💼 Предложения

### 1. Создать предложение (только фрилансер)

**POST** `{{baseUrl}}/proposals`

**Headers:**
```
Authorization: Bearer {{freelancerToken}}
```

**Body (для fixed проекта):**
```json
{
  "project_id": 1,
  "cover_letter": "Men bu loyihani bajarishga tayyorman. Katta tajribam bor...",
  "proposed_amount": 800,
  "estimated_days": 30
}
```

**Body (для hourly проекта):**
```json
{
  "project_id": 2,
  "cover_letter": "Men bu loyihani bajarishga tayyorman...",
  "proposed_rate": 25,
  "estimated_hours": 40
}
```

### 2. Получить все предложения

**GET** `{{baseUrl}}/proposals?status=pending&page=1&limit=10`

### 3. Получить мои предложения

**GET** `{{baseUrl}}/proposals/my`

**Headers:**
```
Authorization: Bearer {{freelancerToken}}
```

### 4. Получить предложения на проект (только владелец)

**GET** `{{baseUrl}}/proposals/project/1`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

### 5. Принять предложение (только клиент)

**POST** `{{baseUrl}}/proposals/1/accept`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

### 6. Отклонить предложение

**POST** `{{baseUrl}}/proposals/1/reject`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

## 📝 Контракты

### 1. Создать контракт (только клиент)

**POST** `{{baseUrl}}/contracts`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body:**
```json
{
  "proposal_id": 1
}
```

### 2. Получить все контракты

**GET** `{{baseUrl}}/contracts?status=active&page=1&limit=10`

### 3. Получить мои контракты

**GET** `{{baseUrl}}/contracts/my`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

### 4. Завершить контракт

**POST** `{{baseUrl}}/contracts/1/complete`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

### 5. Отменить контракт

**POST** `{{baseUrl}}/contracts/1/cancel`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

---

## ⭐ Отзывы

### 1. Создать отзыв

**POST** `{{baseUrl}}/reviews`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body:**
```json
{
  "contract_id": 1,
  "rating": 5,
  "comment": "Ajoyib ish! Juda yaxshi natija."
}
```

### 2. Получить отзывы пользователя

**GET** `{{baseUrl}}/reviews/user/1`

**Ответ включает статистику:**
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

---

## 👤 Профили

### 1. Получить мой профиль

**GET** `{{baseUrl}}/profiles/me`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

### 2. Обновить профиль

**PUT** `{{baseUrl}}/profiles/me`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Body:**
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
  "availability": "available"
}
```

### 3. Получить профиль пользователя

**GET** `{{baseUrl}}/profiles/1`

---

## 📋 Чек-лист тестирования

### Базовое тестирование:
- [ ] Проверка сервера (GET /)
- [ ] Регистрация клиента
- [ ] Регистрация фрилансера
- [ ] Вход в систему
- [ ] Получение информации о себе

### Проекты:
- [ ] Создание проекта
- [ ] Получение списка проектов
- [ ] Получение проекта по ID
- [ ] Обновление проекта
- [ ] Удаление проекта

### Предложения:
- [ ] Создание предложения
- [ ] Получение предложений на проект
- [ ] Принятие предложения
- [ ] Отклонение предложения

### Контракты:
- [ ] Создание контракта
- [ ] Получение контрактов
- [ ] Завершение контракта

### Отзывы:
- [ ] Создание отзыва
- [ ] Получение отзывов пользователя

---

## ⚠️ Важные моменты

1. **Токены**: Сохраняйте `accessToken` после входа и используйте в заголовке `Authorization: Bearer {{accessToken}}`

2. **Роли**: 
   - Только `client` может создавать проекты
   - Только `freelancer` может создавать предложения

3. **Статусы**:
   - Проекты: `open`, `in_progress`, `completed`, `cancelled`, `closed`
   - Предложения: `pending`, `accepted`, `rejected`, `withdrawn`
   - Контракты: `active`, `completed`, `cancelled`, `disputed`

4. **Ошибки**: Все ошибки возвращаются в формате:
```json
{
  "success": false,
  "message": "Описание ошибки"
}
```

---

## 🔗 Импорт коллекции Postman

Создайте коллекцию в Postman и добавьте все эти запросы. Можно также экспортировать коллекцию для команды.


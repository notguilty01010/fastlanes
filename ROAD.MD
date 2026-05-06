# Roadmap MVP: FastLanes Logistics Tracker

## 1. Базовая идея

Веб-приложение для отслеживания грузов компании. Дипломный проект.

В системе должны быть:

* админка;
* пользователи с ролями;
* грузы;
* трекинг-ссылки;
* передача геолокации с телефона;
* карта с текущим положением грузов;
* история координат.

## 2. Стек

* Framework: **Next.js (App Router) + TypeScript** — фронт и API в одном проекте
* Database: PostgreSQL
* ORM / migrations: Prisma
* Auth: Auth.js (NextAuth)
* Map: Leaflet + OpenStreetMap
* Server: VPS + Nginx + Let's Encrypt (SSL обязателен — без него `navigator.geolocation` не работает на проде)
* Process manager: systemd (`next start`)
* Deploy: GitHub Actions → SSH на сервер
* Server provisioning: Ansible
* Domain: `fastlanes.pp.ua`

Docker не используем — для диплома избыточно.

## 3. Основные сущности

### User

Пользователь системы.

Поля:

```text
id
name
email
password_hash
role
is_active
created_at
```

Роли:

```text
admin
manager
```

### Shipment

Груз.

Поля:

```text
id
title
description
status
origin
destination
manager_id
created_at
updated_at
```

Статусы:

```text
created
waiting
in_transit
delivered
cancelled
```

### Tracker

Трекинг-ссылка для груза.

Поля:

```text
id
shipment_id
token
status
expires_at
created_at
updated_at
```

### LocationPoint

Координата, полученная с телефона.

Поля:

```text
id
tracker_id
latitude
longitude
accuracy
speed
created_at
```

## 4. Этапы разработки

## Этап 1. Подготовка проекта (Next.js skeleton)

Поднять базу проекта:

* `create-next-app` с TypeScript и App Router;
* настроить ESLint + Prettier;
* подключить Prisma + PostgreSQL локально;
* создать первую миграцию (пустую или с `User`);
* добавить `.env` / `.env.example`;
* health-check endpoint `GET /api/health` (возвращает статус БД);
* базовый `layout.tsx` с провайдерами (тема, сессия — заглушка).

Результат:

```text
Приложение запускается локально, подключается к базе, /api/health отвечает 200.
```

## Этап 2. Деплой инфраструктуры (Ansible + GitHub Actions)

Поднять прод **до** написания фич — каждая следующая фича сразу попадает на сервер.

### Ansible playbook

Должен:

* обновить систему, поставить базовые пакеты;
* установить Node.js (LTS) и npm;
* установить и настроить PostgreSQL, создать БД и пользователя;
* установить Nginx, настроить reverse proxy на `localhost:3000`;
* выпустить SSL через certbot для `fastlanes.pp.ua`;
* создать системного пользователя `deploy` с ssh-ключом;
* создать systemd unit для `next start`;
* подготовить директорию `/var/www/fastlanes` с правами на `deploy`.

### GitHub Actions

Workflow на push в `main`:

* ssh-подключение к серверу под `deploy`;
* `git pull`;
* `npm ci`;
* `npx prisma migrate deploy`;
* `npm run build`;
* `systemctl restart fastlanes`;
* проверка `/api/health` после рестарта.

Секреты в GitHub: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `DATABASE_URL`.

Результат:

```text
Push в main → через 1-2 минуты https://fastlanes.pp.ua обновлён и /api/health отвечает 200.
```

## Этап 3. Авторизация

Использовать Auth.js (NextAuth) с Credentials provider:

* login / logout;
* hash паролей через `bcrypt`;
* JWT-сессии;
* middleware для защиты `/admin/*`;
* проверка роли пользователя на сервере.

Результат:

```text
Пользователь может войти, /admin недоступен без авторизации.
```

## Этап 4. Пользователи и роли

Админский раздел `/admin/users`:

* список пользователей;
* создание пользователя;
* редактирование пользователя;
* деактивация пользователя;
* выбор роли: admin / manager.

Результат:

```text
Администратор может управлять аккаунтами.
```

## Этап 5. Грузы

Раздел `/admin/shipments`:

* список грузов;
* создание груза;
* редактирование груза;
* смена статуса;
* удаление или архивирование груза.

Результат:

```text
Менеджер может создавать и управлять грузами.
```

## Этап 6. Трекинг-ссылки

Для каждого груза:

* сгенерировать уникальный token (crypto.randomUUID или nanoid);
* создать ссылку вида `/track/{token}`;
* показать ссылку и QR-код в админке;
* отключить ссылку;
* проверить, что отключённая ссылка больше не принимает координаты.

Результат:

```text
Менеджер может создать ссылку и отправить её водителю.
```

## Этап 7. Страница водителя

Публичная страница `/track/{token}`.

UI:

* название груза и пункт назначения;
* кнопка "Начать передачу геолокации";
* кнопка "Остановить";
* индикатор статуса передачи (отправляется / ошибка / нет сети);
* обработка отказа в доступе к геолокации.

Логика:

* `navigator.geolocation.watchPosition` (а не `setInterval` — экономит батарею);
* Wake Lock API чтоб экран не тух;
* при потере сети — буфер координат в `localStorage`, досыл при восстановлении;
* отправка не чаще 1 раза в 10-30 сек.

Результат:

```text
Телефон передаёт координаты через браузер, переживает кратковременную потерю сети.
```

## Этап 8. API для координат

Endpoint:

```text
POST /api/track/{token}/location
```

Должен:

* проверить token и что трекер активен;
* провалидировать latitude / longitude / accuracy / speed (zod);
* применить rate limit (например, 1 запрос / 5 сек на токен) — токен в публичной ссылке, иначе DoS-вектор;
* сохранить координату в БД.

Результат:

```text
Координаты сохраняются в БД, токен защищён от флуда.
```

## Этап 9. Карта в админке

Страница `/admin/map`:

* все активные грузы как маркеры на Leaflet;
* при клике на маркер — popup с информацией о грузе и ссылкой на детали;
* обновление через **SSE** (`EventSource`) или polling каждые 10-30 сек (SSE проще, чем WebSocket, и для этой задачи хватает).

Endpoint:

```text
GET /api/shipments/active-locations
GET /api/shipments/active-locations/stream  (SSE, опционально)
```

Результат:

```text
Менеджер видит актуальное местоположение грузов на карте.
```

## Этап 10. История перемещений

На странице груза `/admin/shipments/{id}`:

* таблица координат с временем, точностью, скоростью;
* последнее известное местоположение;
* линия маршрута на мини-карте (polyline по точкам).

Результат:

```text
Можно посмотреть, где груз был раньше, и весь маршрут.
```

## 5. Сквозные требования

* **HTTPS обязателен** на проде — без него геолокация в браузере не работает.
* **Логирование**: хотя бы `console.error` + перехват в Next.js error boundary; опционально Sentry free tier.
* **Валидация всех входных данных** через zod (и в API, и в Server Actions).
* **Rate limiting** на публичные эндпоинты с токеном.
* **Миграции применяются автоматически** на деплое (`prisma migrate deploy`), вручную в прод не лазим.

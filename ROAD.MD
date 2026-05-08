# Roadmap MVP: FastLanes Logistics Tracker

## 1. Базовая идея

Веб-приложение для отслеживания грузов компании. Дипломный проект.

В системе должны быть:

- админка;
- пользователи с ролями;
- грузы;
- трекинг-ссылки;
- передача геолокации с телефона;
- карта с текущим положением грузов;
- история координат.

## 2. Стек

- Framework: **Next.js (App Router) + TypeScript** — фронт и API в одном проекте
- Database: SQLite (файл `fastlanes.db` в директории приложения)
- ORM / migrations: Prisma
- Auth: Auth.js (NextAuth)
- Map: Leaflet + OpenStreetMap
- Server: VPS + Nginx + Let's Encrypt (SSL обязателен — без него `navigator.geolocation` не работает на проде)
- Process manager: systemd (Next.js standalone, `node server.js`)
- Deploy: GitHub Actions → SSH на сервер
- Server provisioning: Ansible
- Domain: `fastlanes.pp.ua`

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

- `create-next-app` с TypeScript и App Router;
- настроить ESLint + Prettier;
- подключить Prisma + SQLite локально;
- создать первую миграцию (пустую или с `User`);
- добавить `.env` / `.env.example`;
- health-check endpoint `GET /api/health` (возвращает статус БД);
- базовый `layout.tsx` с провайдерами (тема, сессия — заглушка).

Результат:

```text
Приложение запускается локально, подключается к базе, /api/health отвечает 200.
```

## Этап 2. Деплой инфраструктуры (Ansible + GitHub Actions)

Поднять прод **до** написания фич — каждая следующая фича сразу попадает на сервер.

### Ansible playbooks

`provision.yml` (раз на свежем VPS, через `workflow_dispatch`):

- обновить систему, поставить базовые пакеты;
- установить Node.js (LTS) и npm;
- настроить firewall, Nginx + reverse proxy на `localhost:3000`, certbot/SSL;
- создать системного пользователя `deploy` с ssh-ключом;
- создать systemd unit (запускает `node server.js` из `current/`);
- подготовить структуру `/var/www/fastlanes/{releases/, fastlanes.db}`.

`deploy.yml` (на каждый push в `main`, артефакт-релизы):

- распаковать tar.gz из CI в `releases/<tag>/`;
- отрендерить `.env`;
- `npx prisma@<version> migrate deploy`;
- переключить симлинк `current → releases/<tag>`;
- `systemctl restart fastlanes`;
- проверить `/api/health`;
- удалить старые релизы, оставив 3.

`bootstrap-admin.yml` (одноразово через workflow_dispatch): запускает `node prisma/seed.mjs` из `current/`. Идемпотентен.

### GitHub Actions

Workflow на push в `main` (`.github/workflows/deploy.yml`):

**Job `build`** (на runner'е):
- `npm ci` (со всеми deps);
- `npm run build` (Next standalone);
- собирает бандл (`public/`, `.next/static/`, `prisma/{schema,migrations,seed.mjs}` подкладываются в `.next/standalone/`);
- упаковывает в `fastlanes-build.tar.gz` → upload-artifact.

**Job `deploy`**:
- скачивает артефакт;
- запускает `ansible-playbook deploy.yml` с `-e artifact_path=...`, `release_tag=...`, `prisma_version=...`.

На сервере **никогда** не запускаются `npm ci`, `next build`, не лежат devDependencies.

Секреты в GitHub: `SSH_HOST`, `SSH_PRIVATE_KEY`, `ANSIBLE_VAULT_PASSWORD`.

Результат:

```text
Push в main → через 1-2 минуты https://fastlanes.pp.ua обновлён и /api/health отвечает 200.
```

## Этап 3. Авторизация ✅

Auth.js (NextAuth v5) с Credentials provider:

- login / logout — `/login` (Server Action `signIn` + `useActionState`);
- hash паролей через `bcryptjs` (rounds = 12) — см. [src/lib/password.ts](src/lib/password.ts);
- JWT-сессии (без таблицы сессий в БД), `id` и `role` пробрасываются в `token`/`session`;
- middleware на `/admin/:path*` — [src/middleware.ts](src/middleware.ts) использует edge-safe конфиг
  [src/auth.config.ts](src/auth.config.ts), без Prisma;
- полный конфиг с Prisma `authorize` — в [src/auth.ts](src/auth.ts);
- проверка роли на сервере — `requireAdmin()` / `requireUser()` в [src/lib/auth-helpers.ts](src/lib/auth-helpers.ts);
- первый админ создаётся одноразовым плейбуком [ansible/bootstrap-admin.yml](ansible/bootstrap-admin.yml),
  который запускает [prisma/seed.mjs](prisma/seed.mjs); идемпотентно — если в БД уже есть admin, no-op.

Результат:

```text
Пользователь может войти, /admin недоступен без авторизации.
```

## Этап 4. Пользователи и роли ✅

Админский раздел [/admin/users](src/app/admin/users/page.tsx):

- список пользователей с ролями и статусом активности;
- создание пользователя (минимум 8 символов пароля, уникальный email);
- редактирование пользователя (пароль необязателен — пустой = не менять);
- деактивация / активация (toggle через Server Action);
- выбор роли: admin / manager.

Защита от выстрела в ногу: админ не может снять роль с себя или деактивировать
себя — поля для self-аккаунта блокируются в UI и проверяются повторно в
Server Action.

Все мутации — Server Actions с zod-валидацией. P2002 (unique violation) на email
обрабатывается отдельно и показывается на поле.

Результат:

```text
Администратор может управлять аккаунтами.
```

## Этап 5. Грузы ✅

Раздел [/admin/shipments](src/app/admin/shipments/page.tsx):

- список грузов с маршрутом, статусом и ответственным менеджером;
- создание ([new/page.tsx](src/app/admin/shipments/new/page.tsx)) и редактирование
  ([[id]/page.tsx](src/app/admin/shipments/[id]/page.tsx)) груза — Server Actions
  с zod-валидацией ([actions.ts](src/app/admin/shipments/actions.ts));
- быстрая смена статуса прямо со страницы груза (форма-кнопка на каждый статус);
- удаление груза каскадно убирает его трекеры и точки.

При создании, если менеджер не выбран явно, груз закрепляется за текущим админом.

Результат:

```text
Менеджер может создавать и управлять грузами.
```

## Этап 6. Трекинг-ссылки ✅

На странице груза [/admin/shipments/{id}](src/app/admin/shipments/[id]/page.tsx) —
блок «Трекинг-ссылки»:

- генерация токена через `nanoid(24)` ([trackers-actions.ts](src/app/admin/shipments/trackers-actions.ts));
- ссылка вида `/track/{token}` и QR-код к ней (`qrcode` рендерится как dataURL
  на сервере; базовый домен берётся из `AUTH_URL` или `Host`-заголовка через
  [src/lib/public-url.ts](src/lib/public-url.ts) — чтобы QR работал и в dev'е с другого устройства);
- статусы трекера `active` / `disabled` (toggle);
- отключённая ссылка отдаёт `410` на `POST /api/track/{token}/location`
  (см. этап 8).

Результат:

```text
Менеджер может создать ссылку и отправить её водителю.
```

## Этап 7. Страница водителя ✅

Публичная страница [/track/{token}](src/app/track/[token]/page.tsx) — без
авторизации, доступна по ссылке.

UI ([track-client.tsx](src/app/track/[token]/track-client.tsx)):

- название груза, маршрут, статус;
- кнопка «Начать передачу геолокации» / «Остановить»;
- индикатор статуса передачи (sending / ok / error / offline) — цветной dot;
- понятное сообщение при отказе доступа, недоступной геолокации, таймауте.

Логика:

- `navigator.geolocation.watchPosition` с `enableHighAccuracy: true`;
- троттлинг до 1 отправки / 10 секунд клиентским таймстемпом — даже если GPS
  выдаёт fix чаще;
- Wake Lock API (`navigator.wakeLock.request("screen")`) — экран не тухнет
  пока идёт передача;
- буфер координат в `localStorage` (ключ `fl_track_buffer_<token>`, ёмкость
  200 точек) — досылается при `online` событии или перед следующим успешным
  POST'ом;
- если ссылка отключена / истекла, сервер отдаёт `410` и страница показывает
  «Ссылка отключена» вместо UI.

Результат:

```text
Телефон передаёт координаты через браузер, переживает кратковременную потерю сети.
```

## Этап 8. API для координат ✅

Endpoint:

```text
POST /api/track/{token}/location
```

Реализация — [src/app/api/track/[token]/location/route.ts](src/app/api/track/[token]/location/route.ts):

- zod-валидация payload'а (`latitude` ∈ [-90,90], `longitude` ∈ [-180,180],
  опциональные `accuracy`, `speed`, `capturedAt`);
- rate limit ДО любого запроса в БД — иначе токен в публичной ссылке = DoS-вектор.
  In-memory LRU-лимитер ([src/lib/rate-limit.ts](src/lib/rate-limit.ts)),
  1 запрос / 5 сек на токен. На превышение — `429` + `Retry-After`;
- статусы: `404` (нет такого токена / токен мусорной длины), `410`
  (`status != active` или `expires_at` в прошлом), `400` (битый JSON / payload),
  `201` (создано).

Лимитер хранится на `globalThis` ради HMR в dev'е и переживает hot-reload.
Под кластер из нескольких инстансов потребуется Redis — для MVP с одним
Next.js standalone (`node server.js`) под systemd текущая реализация достаточна.

Результат:

```text
Координаты сохраняются в БД, токен защищён от флуда.
```

## Этап 9. Карта в админке ✅

Страница [/admin/map](src/app/admin/map/page.tsx):

- Leaflet + react-leaflet с тайлами OpenStreetMap;
- маркеры — кастомные `divIcon` (`🚚` в круге), без растровых ассетов
  (стандартные иконки Leaflet ссылаются на CDN-ассеты, которые ломаются при
  сборке Next);
- popup на клик: заголовок груза, маршрут, статус, координаты, время точки,
  менеджер, ссылка на `/admin/shipments/{id}`;
- авто-fit карты по всем маркерам при первом рендере;
- обновление через polling каждые 15 секунд — SSE не делаем, обоснование в
  CLAUDE.md этапа: «SSE опционально, для MVP polling проще». Nginx уже
  настроен на `proxy_buffering off`, так что апгрейд до SSE будет точечный.

Endpoint:

```text
GET /api/shipments/active-locations
```

[src/app/api/shipments/active-locations/route.ts](src/app/api/shipments/active-locations/route.ts) —
требует сессию (401 без авторизации), возвращает только грузы со статусами
`created` / `waiting` / `in_transit` и только последнюю точку среди всех их
активных трекеров. Если у груза нет ни одной точки — он не попадает в выдачу.

Сама `MapView` загружается через `next/dynamic` с `ssr: false` (Leaflet требует
`window`/`document`).

Результат:

```text
Менеджер видит актуальное местоположение грузов на карте.
```

## Этап 10. История перемещений

На странице груза `/admin/shipments/{id}`:

- таблица координат с временем, точностью, скоростью;
- последнее известное местоположение;
- линия маршрута на мини-карте (polyline по точкам).

Результат:

```text
Можно посмотреть, где груз был раньше, и весь маршрут.
```

## 5. Сквозные требования

- **HTTPS обязателен** на проде — без него геолокация в браузере не работает.
- **Логирование**: хотя бы `console.error` + перехват в Next.js error boundary; опционально Sentry free tier.
- **Валидация всех входных данных** через zod (и в API, и в Server Actions).
- **Rate limiting** на публичные эндпоинты с токеном.
- **Миграции применяются автоматически** на деплое (`prisma migrate deploy`), вручную в прод не лазим.

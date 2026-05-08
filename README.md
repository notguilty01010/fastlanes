# FastLanes

Web-приложение для отслеживания грузов. Дипломный проект.

Подробный план — в [ROAD.MD](./ROAD.MD).

## Стек

- Next.js 15 (App Router) + TypeScript
- SQLite + Prisma
- Auth.js (Credentials + JWT-сессии)
- Leaflet + OpenStreetMap (карта в админке)
- `qrcode` + `nanoid` (трекинг-ссылки)
- `navigator.geolocation` + Wake Lock + localStorage-буфер (страница водителя)
- Деплой: VPS + Nginx + Let's Encrypt + systemd, Ansible, GitHub Actions

## Локальный запуск

Требования: Node.js LTS (20+).

```bash
npm install
cp .env.example .env

# 1. сгенерировать секрет для Auth.js и положить в AUTH_SECRET в .env
openssl rand -base64 32

# 2. задать ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD в .env
#    (нужны только для первого запуска seed; потом можно очистить)

# 3. миграция БД
npx prisma migrate dev --name init

# 4. создать первого админа
npm run db:seed

# 5. запуск
npm run dev
```

Открыть http://localhost:3000, проверить http://localhost:3000/api/health,
залогиниться на http://localhost:3000/login.

Дальше:

- http://localhost:3000/admin/shipments — создать груз;
- открыть его → «+ Сгенерировать ссылку» → отсканировать QR с телефона
  (телефон должен быть в одной сети с компьютером, тогда `Host`-заголовок
  даст работающий URL даже без `AUTH_URL` на dev'е);
- на телефоне нажать «Начать передачу геолокации» → координаты пойдут в БД;
- http://localhost:3000/admin/map — карта обновится в течение 15 секунд.

Если запускаешь на телефоне в той же локалке через IP — обязательно поставь
`AUTH_URL="http://<ip>:3000"` в `.env`, иначе Auth.js может ругнуться на
несовпадение origin'а.

## Структура

```
prisma/                — схема, миграции, seed.ts (первый админ)
src/app/               — App Router (страницы и API routes)
src/app/api/health/    — health-check (SELECT 1 в БД)
src/app/api/auth/      — Auth.js (NextAuth v5) handlers
src/app/api/track/[token]/location/        — POST координат с rate limit (этап 8)
src/app/api/shipments/active-locations/    — JSON активных грузов для карты (этап 9)
src/app/login/         — страница входа + Server Actions
src/app/admin/         — приватная админка (защищена middleware + requireAdmin)
src/app/admin/users/         — CRUD пользователей (этап 4)
src/app/admin/shipments/     — CRUD грузов + трекинг-ссылки + QR (этапы 5-6)
src/app/admin/map/           — Leaflet-карта активных грузов (этап 9)
src/app/track/[token]/       — публичная страница водителя (этап 7)
src/auth.ts            — NextAuth + Credentials provider (Prisma + bcrypt)
src/auth.config.ts     — edge-safe конфиг для middleware
src/middleware.ts      — защита /admin/*
src/lib/prisma.ts      — singleton PrismaClient
src/lib/password.ts    — bcryptjs обёртки (hash / verify)
src/lib/auth-helpers.ts — requireAdmin / requireUser
src/lib/rate-limit.ts  — in-memory LRU rate limiter (для /api/track/.../location)
src/lib/public-url.ts  — абсолютный URL приложения (для QR-кодов)
ansible/               — provision + deploy плейбуки
ansible/group_vars/all/vault.yml  — секреты (зашифрованы ansible-vault)
.github/workflows/     — provision.yml (ручной), deploy.yml (на push в main)
```

## Деплой

Два workflow:

- **`Provision server`** (`workflow_dispatch`, запускается вручную из GitHub UI) —
  ставит Node.js, Nginx, certbot, systemd unit, deploy-юзера,
  выпускает SSL. Идемпотентен — можно перезапускать.
- **`Deploy`** (на каждый push в `main`) — `git pull`, `npm ci`,
  `prisma migrate deploy`, `npm run build`, рестарт сервиса, проверка
  `/api/health`.

### GitHub Secrets

В Settings → Secrets and variables → Actions добавить:

| Secret                   | Что это                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `SSH_HOST`               | IP или домен сервера (`fastlanes.pp.ua`).                    |
| `SSH_PRIVATE_KEY`        | Приватный SSH-ключ (ed25519). Парный публичный — на сервере. |
| `ANSIBLE_VAULT_PASSWORD` | Пароль для расшифровки `ansible/group_vars/all/vault.yml`.   |

`ANSIBLE_VAULT_PASSWORD` выдан отдельно — он один раз генерируется и
используется и для редактирования vault'а локально, и для запуска CI.

### Что лежит в vault.yml

```yaml
vault_auth_secret: "..." # openssl rand -base64 32
vault_admin_initial_email: "..." # опционально, для сидинга первого админа
vault_admin_initial_password: "..." # опционально
vault_admin_initial_name: "Admin" # опционально
```

После первого успешного деплоя `vault_admin_initial_*` можно удалить —
seed увидит существующего админа и сделает no-op.

### Единственное ручное действие на сервере

На свежем VPS (Ubuntu 22.04/24.04) положить публичную часть SSH-ключа в
`/root/.ssh/authorized_keys`. Дальше всё делает CI:

1. Запустить workflow `Provision server` — он настроит сервер и склонирует
   код из репозитория.
2. После этого любой push в `main` триггерит `Deploy`.

`provision.yml` копирует тот же ключ из `~root/.ssh/authorized_keys` в
`~deploy/.ssh/authorized_keys`, поэтому отдельно второй ключ генерировать
не нужно.

## Работа с vault'ом локально

```bash
# посмотреть
ansible-vault view ansible/group_vars/all/vault.yml

# отредактировать
ansible-vault edit ansible/group_vars/all/vault.yml

# поменять пароль
ansible-vault rekey ansible/group_vars/all/vault.yml
```

Нужен `ansible` (Ubuntu/WSL: `sudo apt install ansible`). Пароль ввести
интерактивно или через `--vault-password-file`.

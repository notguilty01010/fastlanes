# FastLanes

Web-приложение для отслеживания грузов. Дипломный проект.

Подробный план — в [ROAD.MD](./ROAD.MD).

## Стек

- Next.js 15 (App Router) + TypeScript
- SQLite + Prisma
- Auth.js (этап 3)
- Leaflet + OpenStreetMap (этап 9)
- Деплой: VPS + Nginx + Let's Encrypt + systemd, Ansible, GitHub Actions

## Локальный запуск

Требования: Node.js LTS (20+).

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Открыть http://localhost:3000, проверить http://localhost:3000/api/health.

## Структура

```
prisma/             — схема и миграции
src/app/            — App Router (страницы и API routes)
src/app/api/health/ — health-check (SELECT 1 в БД)
src/lib/prisma.ts   — singleton PrismaClient
ansible/            — provision + deploy плейбуки
ansible/group_vars/all/vault.yml  — секреты (зашифрованы ansible-vault)
.github/workflows/  — provision.yml (ручной), deploy.yml (на push в main)
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

| Secret                    | Что это                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `SSH_HOST`                | IP или домен сервера (`fastlanes.pp.ua`).                    |
| `SSH_PRIVATE_KEY`         | Приватный SSH-ключ (ed25519). Парный публичный — на сервере. |
| `ANSIBLE_VAULT_PASSWORD`  | Пароль для расшифровки `ansible/group_vars/all/vault.yml`.   |

`ANSIBLE_VAULT_PASSWORD` выдан отдельно — он один раз генерируется и
используется и для редактирования vault'а локально, и для запуска CI.

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

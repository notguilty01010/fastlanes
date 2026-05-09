# FastLanes

Веб-приложение для отслеживания грузов. Дипломный проект.

## Стек

Next.js 15 (App Router) · TypeScript · Prisma + SQLite · Auth.js (Credentials + JWT) ·
Leaflet + OpenStreetMap · `qrcode` + `nanoid` · `navigator.geolocation` + Wake Lock.
Деплой: VPS + Nginx + Let's Encrypt + systemd, Ansible, GitHub Actions.

## Локальный запуск

Требования: Node.js 20+.

```bash
npm install
cp .env.example .env

# AUTH_SECRET для Auth.js
openssl rand -base64 32

# ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD в .env (для seed первого админа)

npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

`http://localhost:3000` → `/login` → `/admin`.

## Деплой

Два workflow в `.github/workflows/`:

- **Provision server** (`workflow_dispatch`) - настраивает свежий VPS:
  Node, Nginx, certbot, systemd, deploy-юзер, SSL. Идемпотентный.
- **Deploy** (push в `main`) - собирает Next.js standalone в CI,
  Ansible распаковывает в `releases/<tag>/`, делает `prisma migrate deploy`,
  переключает симлинк `current`, рестартует systemd, дёргает `/api/health`.

### GitHub Secrets

| Secret                   | Что это                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `SSH_HOST`               | IP или домен сервера.                                      |
| `SSH_PRIVATE_KEY`        | Приватный SSH-ключ (ed25519).                              |
| `ANSIBLE_VAULT_PASSWORD` | Пароль для `ansible/group_vars/all/vault.yml`.             |

### vault.yml

```yaml
vault_auth_secret: "..."             # openssl rand -base64 32
vault_admin_initial_email: "..."     # опц., для bootstrap-admin
vault_admin_initial_password: "..."  # опц.
vault_admin_initial_name: "Admin"    # опц.
```

После первого деплоя `vault_admin_initial_*` можно удалить -
seed не перезапишет существующего админа.

### Первый запуск

На свежем Ubuntu 22.04/24.04 нужен публичный SSH-ключ в
`/root/.ssh/authorized_keys`, workflow `Provision server`.
Дальше push в `main` триггерит `Deploy`. Первого админа создаёт
отдельный workflow `bootstrap-admin` (`workflow_dispatch`).

### Vault локально

```bash
ansible-vault view  ansible/group_vars/all/vault.yml
ansible-vault edit  ansible/group_vars/all/vault.yml
ansible-vault rekey ansible/group_vars/all/vault.yml
```

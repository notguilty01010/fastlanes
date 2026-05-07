#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[dev]${NC} $*"; }
warn() { echo -e "${YELLOW}[dev]${NC} $*"; }
err()  { echo -e "${RED}[dev]${NC} $*"; exit 1; }

# 1. .env
if [ ! -f .env ]; then
  warn ".env не найден — копирую из .env.example"
  cp .env.example .env
  warn "Проверь .env (особенно AUTH_SECRET) и запусти скрипт снова."
  exit 0
fi
log ".env ✓"

# 2. node_modules
if [ ! -d node_modules ]; then
  log "node_modules не найден — запускаю npm install..."
  npm install
fi
log "node_modules ✓"

# 3. PostgreSQL
PG_BIN="/c/Program Files/PostgreSQL/17/bin"
export PATH="$PG_BIN:$PATH"

log "Проверяю PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
  warn "PostgreSQL не отвечает — пробую запустить сервис..."
  powershell.exe -Command "Start-Service 'postgresql-x64-17'" 2>/dev/null || true
  sleep 3
  if ! pg_isready -q 2>/dev/null; then
    err "PostgreSQL не запустился. Открой PowerShell от администратора и выполни:
  Start-Service postgresql-x64-17
  Set-Service postgresql-x64-17 -StartupType Automatic"
  fi
fi
log "PostgreSQL ✓"

# 4. Создать БД если не существует
DB_NAME=$(grep DATABASE_URL .env | grep -oP '(?<=/)[^/?]+(?=\?)' | head -1)
DB_NAME=${DB_NAME:-fastlanes}
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" \
  | grep -q 1 || psql -U postgres -c "CREATE DATABASE ${DB_NAME};" && log "БД '${DB_NAME}' ✓"

# 5. Prisma
log "Применяю схему Prisma..."
npx prisma db push --skip-generate
npx prisma generate
log "Prisma ✓"

# 6. Next.js dev
log "Запускаю Next.js dev сервер на http://localhost:3000"
npm run dev

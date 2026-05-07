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

# 3. Prisma
log "Применяю схему Prisma..."
npx prisma db push --skip-generate
npx prisma generate
log "Prisma ✓"

# 4. Next.js dev
log "Запускаю Next.js dev сервер на http://localhost:3000"
npm run dev

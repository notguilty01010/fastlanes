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
fi

# 1a. AUTH_SECRET — если пустой, сгенерировать и подставить
if grep -qE '^AUTH_SECRET=""' .env; then
  warn "AUTH_SECRET пуст — генерирую"
  SECRET=$(openssl rand -base64 32)
  # Делитерами для sed берём `|`, чтобы не конфликтовать со слешами и плюсами в base64.
  sed -i.bak "s|^AUTH_SECRET=\"\"|AUTH_SECRET=\"${SECRET}\"|" .env
  rm -f .env.bak
fi

# 1b. ADMIN_INITIAL_PASSWORD — если пустой, сгенерировать (для первого сида)
if grep -qE '^ADMIN_INITIAL_PASSWORD=""' .env; then
  warn "ADMIN_INITIAL_PASSWORD пуст — генерирую"
  PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 16)
  sed -i.bak "s|^ADMIN_INITIAL_PASSWORD=\"\"|ADMIN_INITIAL_PASSWORD=\"${PASS}\"|" .env
  rm -f .env.bak
  if grep -qE '^ADMIN_INITIAL_EMAIL=""' .env; then
    sed -i.bak "s|^ADMIN_INITIAL_EMAIL=\"\"|ADMIN_INITIAL_EMAIL=\"admin@fastlanes.local\"|" .env
    rm -f .env.bak
  fi
  warn "Логин для админки:"
  grep -E '^ADMIN_INITIAL_(EMAIL|PASSWORD)=' .env | sed 's/^/        /'
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
npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate
npx prisma generate
log "Prisma ✓"

# 4. Seed (идемпотентно — если admin уже есть, no-op)
log "Сид первого админа..."
npx prisma db seed || warn "Seed упал — проверь ADMIN_INITIAL_* в .env"

# 5. Next.js dev
log "Запускаю Next.js dev сервер на http://localhost:3000"
npm run dev

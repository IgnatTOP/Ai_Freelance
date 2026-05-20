#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_DIR="$REPO_DIR/frontend"
BACK_DIR="$REPO_DIR/freelance_AI_back-main"
NGINX_CONF="/etc/nginx/sites-available/ai_freelance"

echo "=== [1/6] git pull ==="
cd "$REPO_DIR"
git pull origin "$(git rev-parse --abbrev-ref HEAD)"

echo "=== [2/6] Backend: сборка ==="
cd "$BACK_DIR"
go build -o ./.air_tmp/server ./cmd/server

echo "=== [3/6] Frontend: установка зависимостей и сборка ==="
cd "$FRONT_DIR"
npm ci
npm run build

echo "=== [4/6] nginx: обновление конфига ==="
cp "$REPO_DIR/nginx.conf" "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/ai_freelance

# Отключить дефолтный сайт nginx если мешает
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
    echo "  Дефолтный сайт nginx отключён"
fi

nginx -t
systemctl reload nginx
echo "  nginx обновлён"

echo "=== [5/6] Перезапуск backend (systemd) ==="
if systemctl is-active --quiet ai-backend 2>/dev/null; then
    systemctl restart ai-backend
    echo "  ai-backend перезапущен"
else
    echo "  ВНИМАНИЕ: сервис ai-backend не найден в systemd."
    echo "  Запусти вручную: cd $BACK_DIR && ./run.sh once &"
fi

echo "=== [6/6] Перезапуск frontend (systemd) ==="
if systemctl is-active --quiet ai-frontend 2>/dev/null; then
    systemctl restart ai-frontend
    echo "  ai-frontend перезапущен"
else
    echo "  ВНИМАНИЕ: сервис ai-frontend не найден в systemd."
    echo "  Запусти вручную: cd $FRONT_DIR && npm run start -- -p 3000 &"
fi

echo ""
echo "=== Готово! Сайт доступен на http://147.45.215.146 ==="

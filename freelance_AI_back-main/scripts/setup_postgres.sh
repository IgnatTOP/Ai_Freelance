#!/usr/bin/env bash

# Скрипт для установки и настройки PostgreSQL на Arch Linux.
# Требует DB_PASSWORD в окружении.

set -euo pipefail

DB_NAME="${DB_NAME:-freelance_ai}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
PGDATA_DIR="${PGDATA_DIR:-/var/lib/postgres/data}"

if [[ -z "$DB_PASSWORD" ]]; then
  echo "Ошибка: задайте DB_PASSWORD перед запуском (пример: DB_PASSWORD='strong-secret' ./scripts/setup_postgres.sh)"
  exit 1
fi

if ! [[ "$DB_NAME" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Ошибка: DB_NAME содержит недопустимые символы"
  exit 1
fi

if ! [[ "$DB_USER" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Ошибка: DB_USER содержит недопустимые символы"
  exit 1
fi

echo "=== Настройка PostgreSQL ==="

if [[ ! -d "$PGDATA_DIR" || ! -f "$PGDATA_DIR/PG_VERSION" ]]; then
  echo "Инициализация базы данных PostgreSQL..."
  sudo mkdir -p "$PGDATA_DIR"
  sudo chown postgres:postgres "$PGDATA_DIR"
  sudo chmod 700 "$PGDATA_DIR"
  sudo -u postgres initdb --locale=C.UTF-8 --encoding=UTF8 -D "$PGDATA_DIR"
  echo "✓ База данных инициализирована"
else
  echo "✓ База данных уже инициализирована"
fi

echo "Запуск службы PostgreSQL..."
sudo systemctl enable postgresql.service
sudo systemctl start postgresql.service
sleep 2

if systemctl is-active --quiet postgresql; then
  echo "✓ PostgreSQL успешно запущен"
else
  echo "✗ Ошибка: PostgreSQL не запустился"
  exit 1
fi

escaped_password="${DB_PASSWORD//\'/\'\'}"

echo "Создание базы данных '$DB_NAME' и настройка пользователя '$DB_USER'..."

sudo -u postgres psql --dbname postgres -v ON_ERROR_STOP=1 <<SQL
DO
\$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    EXECUTE format('CREATE ROLE %I LOGIN', '${DB_USER}');
  END IF;
END
\$\$;
SQL

sudo -u postgres psql --dbname postgres -v ON_ERROR_STOP=1 <<SQL
ALTER ROLE "${DB_USER}" WITH PASSWORD '${escaped_password}';
SQL

sudo -u postgres psql --dbname postgres -v ON_ERROR_STOP=1 <<SQL
DO
\$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}') THEN
    EXECUTE format('CREATE DATABASE %I OWNER %I', '${DB_NAME}', '${DB_USER}');
  END IF;
END
\$\$;
SQL

echo "✓ База данных и пользователь настроены"
echo
echo "Параметры подключения:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: *** (из DB_PASSWORD)"
echo
echo "Для подключения используйте:"
echo "  psql -h localhost -U $DB_USER -d $DB_NAME"

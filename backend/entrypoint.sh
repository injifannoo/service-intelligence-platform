#!/usr/bin/env sh
# Entrypoint for the Django backend container.
#
# Waits for PostgreSQL, applies migrations, optionally seeds demo data, then
# hands control to the command passed by docker-compose (`runserver` in dev,
# `gunicorn` in prod). Kept POSIX-sh so it runs on the slim base image.
set -e

python - <<'PY'
import os
import sys
import time
from urllib.parse import urlparse

import psycopg2

url = os.environ.get("DATABASE_URL", "")
if not url:
    # No Postgres configured; nothing to wait for (e.g. SQLite).
    sys.exit(0)

parsed = urlparse(url)
host = parsed.hostname or "postgres"
port = parsed.port or 5432
user = parsed.username or ""
password = parsed.password or ""

deadline = time.time() + 60
while time.time() < deadline:
    try:
        psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port,
        ).close()
        print("Postgres is ready.", flush=True)
        sys.exit(0)
    except Exception as exc:  # noqa: BLE001 - retry until the deadline
        print(f"Waiting for Postgres at {host}:{port} ... ({exc})", flush=True)
        time.sleep(2)

print("Postgres did not become ready in time.", file=sys.stderr, flush=True)
sys.exit(1)
PY

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  python manage.py migrate --noinput

  if [ "${SEED_DEMO:-false}" = "true" ]; then
    python manage.py seed_demo
  fi
fi

exec "$@"

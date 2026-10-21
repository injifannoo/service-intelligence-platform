FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Build context is the repository root (see docker-compose.prod.yml).
COPY backend/requirements/ /app/requirements/
RUN pip install --no-cache-dir -r requirements/production.txt

COPY backend/ /app/

# Collect static assets into the image. Uses throwaway values because the real
# secrets are injected at runtime; nothing is persisted from this step.
RUN SECRET_KEY=build-only-not-used-at-runtime \
    DATABASE_URL=postgres://user:pass@localhost:5432/db \
    python manage.py collectstatic --noinput

RUN chmod +x /app/entrypoint.sh \
    && addgroup --system django \
    && adduser --system --ingroup django django \
    && chown -R django:django /app
USER django

EXPOSE 8000

ENTRYPOINT ["sh", "/app/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]

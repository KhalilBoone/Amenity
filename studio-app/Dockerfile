# Amenity API — Fly.io image.
# ----------------------------------------------------------------
# Single-stage build. Python 3.11-slim is small (~50MB) and has the
# wheels we need for psycopg / cryptography pre-built. We install
# build-essential only when a wheel isn't available, then strip it.

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

# System deps that pip might compile against. ca-certificates is required
# for outbound HTTPS (Supabase, Stripe, SAM.gov, Anthropic).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
 && rm -rf /var/lib/apt/lists/*

# Install Python deps first so they cache between code changes.
COPY requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt

# Strip build tooling once wheels are installed — keeps the image lean
# and reduces attack surface.
RUN apt-get purge -y --auto-remove build-essential \
 && rm -rf /var/lib/apt/lists/*

# Application code.
COPY agents /app/agents
COPY api    /app/api

# Drop privileges.
RUN useradd --create-home --uid 1000 amenity
USER amenity

EXPOSE 8000

# Health-check — Fly.io will hit /health every few seconds.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/health || exit 1

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]

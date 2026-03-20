# Garments POS Monorepo

This repository contains the mobile app and backend for Garments POS.

## Structure

- `backend/` - FastAPI + PostgreSQL backend
- `mobile/` - mobile app (to be added)

## Backend Quick Start

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

## Render Deploy

Use `backend/render.yaml` as the Render Blueprint file.

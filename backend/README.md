# Garments POS Backend (FastAPI)

Minimal production-ready backend MVP for a mobile-first POS system.

## Stack

- Python
- FastAPI
- PostgreSQL (Supabase compatible)
- SQLAlchemy (async ORM)
- Pydantic
- Clerk JWT auth

## Setup

1. Create and activate virtual env
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Copy env file:
   - `cp .env.example .env`
4. Update `.env` values
5. Run migrations:
   - `alembic upgrade head`
6. Run app:
   - `uvicorn app.main:app --reload`

## Migrations

- Create new migration: `alembic revision --autogenerate -m "message"`
- Apply migrations: `alembic upgrade head`
- Rollback one step: `alembic downgrade -1`

Set `AUTO_CREATE_TABLES=true` only for local quick experiments.

## Auth

Use Bearer token from Clerk in `Authorization` header.

The backend verifies JWT and exposes `clerk_user_id` from token `sub`.

For local development without a frontend, you can bypass auth:

- `AUTH_BYPASS=true`
- `AUTH_BYPASS_USER_ID=dev_user_001`

This bypass is only enabled when `APP_ENV` is `development` or `local`.

## Core APIs

- `POST /stores`
- `GET /stores`
- `POST /products`
- `GET /products`
- `GET /products/{id}`
- `PUT /products/{id}`
- `DELETE /products/{id}`
- `GET /inventory`
- `PUT /inventory/{variant_id}`
- `POST /orders`
- `GET /dashboard/summary`

## Notes

- Order creation is atomic and uses row-level locking.
- Duplicate order items for the same variant are merged before billing.
- Stock deduction is validated before commit.

## Seed Demo Data

- Run: `python -m scripts.seed`
- Creates one demo store with products and variants for quick API testing.

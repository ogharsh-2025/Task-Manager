# Containerized Task Manager

A production-oriented task management web application built with FastAPI, SQLAlchemy, Alembic, PostgreSQL, Docker Compose, and a responsive vanilla HTML/CSS/JavaScript frontend.

## Features

- Create, view, update, delete, and complete tasks
- Search, filter, and sort task records
- Dashboard stats for total, pending, completed, and high-priority tasks
- Clean backend architecture with API, service, repository, model, schema, and database layers
- PostgreSQL persistence with Alembic migrations
- CORS, health checks, structured request logging, and environment-based configuration
- Docker Compose setup with named volumes, service networking, restart policies, and health checks

## Architecture

```text
frontend/
  HTML, CSS, and JavaScript dashboard
backend/
  app/
    api/            FastAPI routers
    core/           configuration and middleware setup
    database/       SQLAlchemy engine/session/base
    models/         ORM models and enums
    repositories/   database access layer
    services/       business logic layer
    schemas/        Pydantic request/response models
    utils/          logging utilities
  alembic/          database migrations
```

The backend serves the frontend static files and exposes the API under `/api`.

## Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Run the full stack:

```bash
docker-compose up --build
```

Open the application:

- Web app: http://localhost:8000
- Dashboard: http://localhost:8000/dashboard
- Tasks: http://localhost:8000/tasks
- API docs: http://localhost:8000/api/docs
- Health check: http://localhost:8000/health

## Local Backend Development

From the `backend` directory:

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
set DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/taskdb
alembic upgrade head
uvicorn app.main:app --reload
```

Use PowerShell syntax for environment variables:

```powershell
$env:DATABASE_URL="postgresql+psycopg2://postgres:password@localhost:5432/taskdb"
```

## API Documentation

### Health

- `GET /health`

Response:

```json
{ "status": "healthy" }
```

### Tasks

- `POST /api/tasks`
- `GET /api/tasks`
- `GET /api/tasks/{id}`
- `PUT /api/tasks/{id}`
- `DELETE /api/tasks/{id}`
- `PATCH /api/tasks/{id}/complete`
- `GET /api/tasks/search?q=term`
- `GET /api/tasks/filter?status=pending&priority=high`
- `GET /api/dashboard/stats`

Task payload:

```json
{
  "title": "Prepare release checklist",
  "description": "Confirm deployment steps and owners",
  "priority": "high",
  "due_date": "2026-06-30"
}
```

Query parameters for `GET /api/tasks`:

- `search`: text search across title and description
- `status`: `pending` or `completed`
- `priority`: `low`, `medium`, or `high`
- `sort_by`: `id`, `title`, `priority`, `status`, `due_date`, `created_at`, or `updated_at`
- `sort_order`: `asc` or `desc`
- `limit`: 1 to 500
- `offset`: 0 or greater

## Environment Variables

| Variable            | Description                            | Default                                                        |
| ------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `ENVIRONMENT`       | Runtime environment name               | `development`                                                  |
| `LOG_LEVEL`         | Python logging level                   | `INFO`                                                         |
| `CORS_ORIGINS`      | Comma-separated allowed origins or `*` | `*`                                                            |
| `POSTGRES_USER`     | PostgreSQL user                        | `postgres`                                                     |
| `POSTGRES_PASSWORD` | PostgreSQL password                    | `password`                                                     |
| `POSTGRES_DB`       | PostgreSQL database                    | `taskdb`                                                       |
| `POSTGRES_PORT`     | Host port mapped to PostgreSQL         | `5432`                                                         |
| `DATABASE_URL`      | SQLAlchemy PostgreSQL connection URL   | `postgresql+psycopg2://postgres:password@postgres:5432/taskdb` |
| `BACKEND_PORT`      | Host port mapped to FastAPI            | `8000`                                                         |

## Deployment

For Render, Railway, AWS EC2, or a VPS:

1. Set production environment variables instead of using `.env.example` values.
2. Use a managed PostgreSQL connection string or the Compose `postgres` service.
3. Build with `backend/Dockerfile` using the repository root as the Docker context.
4. Run `alembic upgrade head` before starting the API. The provided Docker command already does this.
5. Restrict `CORS_ORIGINS` to trusted frontend origins in production.

## Docker Notes

The backend connects to PostgreSQL through the Compose service name:

```text
postgresql+psycopg2://postgres:password@postgres:5432/taskdb
```

This avoids `localhost` networking issues inside containers.

# Deployment

Deat runs as a single Docker Compose stack: one **app** container (serves the
React frontend and the FastAPI API on port 8000) plus **Postgres** and
**Redis**. The app is published on `127.0.0.1:8000` and exposed to the internet
through a Cloudflare Tunnel.

## Prerequisites

- A Linux server with Docker Engine and the Docker Compose plugin.
- A Cloudflare Tunnel (`cloudflared`) running on the server.
- A Spoonacular API key.
- The backend image published to Docker Hub (done automatically by CI, see
  [CI](#ci)).

## Setup

1. Copy the compose file and env template to the server, then create `.env`:

   ```bash
   cp .env.prod.example .env
   ```

   Fill in `.env`: set `IMAGE` to your Docker Hub image, `FRONTEND_HOST` to your
   public URL, `SPOONACULAR_API_KEYS`, and generate the secrets
   (`SECRET_KEY`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`,
   `FIRST_SUPERUSER_PASSWORD`):

   ```bash
   python3 -c 'import secrets; print(secrets.token_urlsafe(32))'
   ```

2. Pull the image, run migrations + seed data, and start the stack:

   ```bash
   docker compose pull app
   docker compose run --rm app bash scripts/prestart.sh
   docker compose up -d
   ```

3. In your Cloudflare Tunnel, add a public hostname pointing to
   `http://localhost:8000`.

The app is live at your public URL (frontend, API, and `/docs`).

## Updating

CI publishes a new image on every push to `main`:

```bash
docker compose pull app
docker compose run --rm app bash scripts/prestart.sh
docker compose -f compose.yml up -d
```

## Operations

| Task | Command |
| --- | --- |
| Logs | `docker compose logs -f app` |
| Restart | `docker compose restart app` |
| Stop | `docker compose down` |
| Stop + wipe data | `docker compose down -v` |
| Health check | `curl http://127.0.0.1:8000/api/v1/utils/health-check/` |

## CI

`.github/workflows/docker-publish.yml` builds and pushes the image to Docker Hub
on every push to `main`. Configure in the GitHub repo
(**Settings → Secrets and variables → Actions**):

- Variable `DOCKERHUB_IMAGE` — e.g. `yourdockerhubuser/deat`
- Secret `DOCKERHUB_USERNAME`
- Secret `DOCKERHUB_TOKEN` (Docker Hub access token)

## Notes

- Only `127.0.0.1:8000` is published; the Cloudflare Tunnel is the only public
  entry point. Change the host port in `compose.yml` if 8000 is taken.
- Postgres and Redis use named volumes that survive container recreation.
- A daily job harvests random recipes before the Spoonacular quota resets;
  multiple comma-separated keys in `SPOONACULAR_API_KEYS` are rotated when one
  hits its limit.

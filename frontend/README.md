# Deat — Frontend

The frontend is built with [Vite](https://vitejs.dev/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [TanStack Query](https://tanstack.com/query), [TanStack Router](https://tanstack.com/router), [Tailwind CSS](https://tailwindcss.com/), and [shadcn/ui](https://ui.shadcn.com/).

## Requirements

- [Node.js](https://nodejs.org/) (with `npm`)

## Quick Start

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open <http://localhost:5173/> in your browser.

The dev server proxies the API to the backend, so run the backend too: from the
`backend` directory run `uv run bash scripts/prestart.sh` then `uv run fastapi dev`,
with PostgreSQL available.

To serve the built frontend from the backend, run `npm run build` here and open
<http://localhost:8000> — FastAPI serves the compiled `dist/` as a single-page app.

Check `package.json` for the other available commands.

## Generate Client

The API client in `src/client` is generated from the backend's OpenAPI schema.

With the backend running:

```bash
npm run generate-client
```

Commit the regenerated client. Regenerate it whenever backend changes affect the
OpenAPI schema.

## Using a Remote API

By default the built frontend uses the same origin as the backend. To point the
Vite dev server at a remote API, set `VITE_API_URL` in `frontend/.env`:

```env
VITE_API_URL=https://my-domain.example.com
```

## Code Structure

- `src` — the main frontend code.
- `src/client` — the generated OpenAPI client.
- `src/components` — components, including the shadcn/ui components in `src/components/ui`.
- `src/hooks` — custom hooks.
- `src/lib` — shared utilities.
- `src/routes` — routes and pages.

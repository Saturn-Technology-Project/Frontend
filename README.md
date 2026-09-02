# Saturn Control Plane

Desktop-first frontend for the Saturn enterprise AI control plane.

The console talks to the backend in `../backend` through a Next.js rewrite: `/saturn-api/*` → `http://localhost:8000/*`.

## Run locally

Full stack with Docker (console + admin + API + Postgres + Redis). Same Compose file as `../Dashboard` and the repo root:

```bash
docker compose up --build
```

- Console: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3001](http://localhost:3001)
- API: [http://localhost:8000/docs](http://localhost:8000/docs)

Sign in with the bootstrap operator (empty catalog — create agents, tools, and policies yourself):

- email: `rick@saturn.ai`
- password: `saturn`

Or run only the frontend against a backend already up on port 8000:

```bash
npm install
npm run dev
```

Override the API origin with `API_URL` (see `.env.example`). Restart `next dev` after changing it. In Docker the rewrite target is `http://api:8000`.

## Path

1. Sign in
2. Overview
3. Create agents, MCP servers, tools, and policies
4. Connect an Agent runtime over WebSocket, then dispatch a run from the Panel
5. Human approval when policy requires it
6. Activity audit timeline

Wallets live at `/wallets`. Paid tools show an x402 price. Facilitator: `GET /x402/supported`.

Frontend is Next.js on Vercel. Backend stays on GCP.

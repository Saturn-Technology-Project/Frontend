# Saturn Control Plane

Desktop-first frontend for the Saturn enterprise AI control plane.

The console proxies API calls through a Next.js rewrite (`/saturn-api`) to the backend. Locally that is `API_URL` (default `http://localhost:8000`). Cloud Run sets `API_URL` to the public backend URL at build and deploy time.

## Run locally

Full stack with Docker (console + admin + API + Postgres + Redis). Same Compose file as `../Dashboard` and the repo root:

```bash
docker compose up --build
```

- Console: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3001](http://localhost:3001)
- API: [http://localhost:8000/docs](http://localhost:8000/docs)

Sign in with the organization admin account seeded by the backend (see backend env, for example `SEED_USER_EMAIL`). Do not commit or share bootstrap passwords in this repo.

Or run only the frontend against a backend already up on port 8000:

```bash
npm install
npm run dev
```

Override the API origin with `API_URL` (see `.env.example`). Restart `next dev` after changing it. In Docker the rewrite target is `http://api:8000`.

See [`DEPLOY.md`](DEPLOY.md) for Cloud Run.

## Path

1. Sign in
2. Overview
3. Connect Saturn Connector from Agents or MCP, then wait for it to register agents and tools
4. Dispatch a run to a specific agent over the Panel WebSocket
5. Human approval when policy requires it
6. Activity audit timeline

Wallets live at `/wallets`. Paid tools show an x402 price. Facilitator: `GET /x402/supported`.

Frontend is Next.js on Cloud Run. Backend is FastAPI on Cloud Run. See `DEPLOY.md`.

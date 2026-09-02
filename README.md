# Saturn Control Plane

Desktop-first frontend for the Saturn enterprise AI control plane.

The console talks to the backend in `../backend` through a Next.js rewrite: `/saturn-api/*` → `http://localhost:8000/*`.

## Run locally

```bash
# backend
cd ../backend
docker compose up --build

# frontend
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to Overview.

Override the API origin with `API_URL` (see `.env.example`). Restart `next dev` after changing it.

## Path

1. Overview
2. Agents → Customer Operations
3. Run a refund prompt (the seeded agent plans CRM + billing tools)
4. Human approval for `billing.refund` when amount is between $100 and $1000
5. Agent wallet pays the tool via x402 (0.05 USDC on Base Sepolia)
6. Activity audit timeline

Wallets live at `/wallets`. Paid tools show an x402 price. Facilitator: `GET /x402/supported`.

Frontend is Next.js on Vercel. Backend stays on GCP.

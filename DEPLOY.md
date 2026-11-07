# Deploy to Google Cloud

Push `main` on this repo. GitHub Actions builds a `linux/amd64` image and deploys that image digest. `API_URL` is fixed in the workflow as `https://api.saturn-core.com`.

GitHub authenticates with Workload Identity Federation. Set these repository values before the first run.

## Secrets

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`

## Variables

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_LOCATION`
- `GAR_REPOSITORY` (optional, default `saturn`)
- `FRONTEND_CLOUD_RUN_SERVICE` (optional, default `saturn-frontend`)
- `RUNTIME_SERVICE_ACCOUNT` (optional; unset keeps the service's current identity)
- `MAX_INSTANCES` (optional, default `10`)

A `BACKEND_PUBLIC_URL` variable is no longer read; delete it. To change the API origin, edit `API_URL` in `.github/workflows/deploy-cloud-run.yml`.

`API_URL` is compiled into the `/saturn-api` HTTP rewrite and into `NEXT_PUBLIC_WS_URL`. Connector and Panel WebSockets dial that backend origin directly (`wss://saturn-backend-…/ws/connectors`), not the console proxy. Deploy backend first, then this service.

The full GCP bootstrap lives in the backend repo at `infra/gcp/README.md`.

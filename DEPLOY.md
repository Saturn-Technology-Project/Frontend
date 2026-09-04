# Deploy to Google Cloud

Push `main` to build this app and deploy it to Cloud Run.

GitHub authenticates with Workload Identity Federation. Set these repository values before the first run.

## Secrets

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`

## Variables

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_LOCATION`
- `GAR_REPOSITORY`
- `FRONTEND_CLOUD_RUN_SERVICE` (`saturn-frontend`)
- `BACKEND_PUBLIC_URL` (Cloud Run URL of the backend, no trailing slash)

`BACKEND_PUBLIC_URL` is compiled into the `/saturn-api` HTTP rewrite and into `NEXT_PUBLIC_WS_URL`. Connector and Panel WebSockets dial that backend origin directly (`wss://saturn-backend-…/ws/connectors`), not the console proxy. Deploy backend first, then this service.

The full GCP bootstrap lives in the backend repo at `infra/gcp/README.md`.

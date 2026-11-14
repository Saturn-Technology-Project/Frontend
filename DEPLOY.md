# Deploy to Google Cloud

Push `main` on this repo. The [deploy workflow](.github/workflows/deploy-cloud-run.yml) runs the checks, builds a `linux/amd64` image, and deploys that image digest to Cloud Run through the `production` environment.

GitHub authenticates with Workload Identity Federation. Set these repository values before the first run.

## Secrets

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`

## Variables

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_LOCATION`
- `GAR_REPOSITORY` (`saturn`)
- `FRONTEND_CLOUD_RUN_SERVICE` (`saturn-frontend`)
- `MAX_INSTANCES` (`10`)
- `RUNTIME_SERVICE_ACCOUNT` (optional; unset keeps the service's current identity)
- `CLOUD_RUN_INGRESS` (optional; `all`, `internal` or `internal-and-cloud-load-balancing`; unset keeps the current ingress)
- `CONSOLE_PROXY_SECRET_NAME` (optional; the Secret Manager secret shared with the API, so the API sees each browser's address)

## Secret Manager

- `ORIGIN_AUTH_SECRET` is mounted into the service on every deploy. On Cloud Run the console refuses every request until it is set.

## The API address

The API address is the `API_URL` value at the top of the workflow (`https://api.saturn-core.com`). It is passed to the image build as `API_URL` and `NEXT_PUBLIC_WS_URL` and compiled in: the `/saturn-api` rewrite, the API origin the pages show, and the Content-Security-Policy all come from the build. Nothing reads it at run time, so pointing the console at another API means changing the workflow value and deploying again.

The console opens no WebSocket. The browser reaches the API only through the console's `/saturn-api` proxy; agents call the API's `/mcp` endpoint directly.

## Request timeout

The service is deployed with `--timeout 300`. `proxyTimeout` in [`next.config.ts`](next.config.ts) is set just under that, so a long policy-generation request ends with an answer from the console instead of a connection cut by Cloud Run. Change the two together.

Deploy the backend first, then this service. The full GCP bootstrap lives in the backend repo at `infra/gcp/README.md`.

# E2E Tests (WO-58)

Playwright end-to-end tests for admin workflow, agent integration, and approval flows.

## Prerequisites

- Control plane API running (e.g. `PORT=3001 npm run dev:api` → http://localhost:3001)
- Admin console running (e.g. `npm run dev:web` → http://localhost:3000)
- Optional: mock ticketing on port 3002 for full gateway→downstream flow

## Run

```bash
cd e2e
npm install
BASE_URL=http://localhost:3000 API_URL=http://localhost:3001 npm test
```

## Tests

- **admin-workflow.spec.ts**: Dashboard and list pages (agents, traces, policies) load.
- **agent-integration.spec.ts**: Health check; agent registration; submit action with Bearer token; 401 without auth.

Extended flows (approval, policy management, validation, evidence export) can be added with real login and test data reset as needed.

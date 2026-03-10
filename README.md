# AI Governance Control Plane

How to build and run the Control Plane (API, web console, worker), optional mock ticketing and demo agent, and tests.

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** (for API and worker)
- **Redis** (optional; used for cache and rate limiting; app degrades if unavailable)

## 1. Environment

From the repo root, copy env and set at least the database:

```bash
cp .env.example .env
# Edit .env: set DATABASE_URL or PG_HOST, PG_USER, PG_PASSWORD, PG_DATABASE
# Optional: AGENT_JWT_SECRET or JWT_SECRET for agent auth
# Optional: REDIS_URL or REDIS_HOST for cache/rate limiting
```

For the **web** app (admin console), point it at the API (use the port where your API runs):

```bash
# packages/web/.env.local
# API on 3001, admin on 3000:
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 2. Database

Create the DB and run migrations:

```bash
npm run migrate:up
```

## 3. Build

```bash
npm install
npm run build
```

## 4. Run services

### Option A: All together (API + Web + Worker)

```bash
npm run dev
```

- **API**: http://localhost:3001 (health: http://localhost:3001/health)
- **Web (admin console)**: http://localhost:3000 (Next.js dev)
- **Worker**: runs in same process via `concurrently`

### Option B: One at a time

```bash
# Terminal 1 – API (set PORT=3001 in .env to use 3001)
npm run dev:api
# → http://localhost:3001 (if PORT=3001)

# Terminal 2 – Web (Next.js default 3000)
npm run dev:web
# → http://localhost:3000

# Terminal 3 – Worker (after build)
npm run build:shared && npm run dev -w @ai-governance/worker
# → health (WORKER_HEALTH_PORT) if set
```

### Optional: Mock ticketing (for demo / gateway downstream)

```bash
npm run build -w @ai-governance/mock-ticketing
npm run start -w @ai-governance/mock-ticketing
# → http://localhost:3002 (GET /health, GET/PATCH /tickets/:id, POST /v1/action)
```

To use it as the gateway downstream, in `.env`:

```bash
GATEWAY_DOWNSTREAM_URL=http://localhost:3002/v1/action
```

### Optional: Demo agent (ticket-triage)

First run registers the agent and prints an API key; second run uses that key:

```bash
npm run build -w @ai-governance/demo-agent

# First run: register (no AGENT_API_KEY)
npm run start -w @ai-governance/demo-agent
# → Copy the printed api_key into AGENT_API_KEY

# Second run: use saved key
export AGENT_API_KEY=agk_...
export CONTROL_PLANE_URL=http://localhost:3001   # API port
npm run start -w @ai-governance/demo-agent
```

## 5. Tests

```bash
# Unit + integration (Jest)
npm run test

# E2E (Playwright) – needs API and web running
cd e2e && npm install && BASE_URL=http://localhost:3000 API_URL=http://localhost:3001 npm test
```

## 6. Production-style run

Build then start each service with Node (no watch):

```bash
npm run build
npm run start -w @ai-governance/api      # set PORT=3001 in .env for API
npm run start -w @ai-governance/web      # Next.js default 3000 (admin)
npm run start -w @ai-governance/worker
```

## Ports

| Service        | Typical port | Env / note              |
|----------------|-------------|--------------------------|
| Admin (Next.js)| 3000        | Next.js dev default     |
| API            | 3001        | `PORT` in .env          |
| Worker health  | 3001        | `WORKER_HEALTH_PORT`     |
| Mock ticketing | 3002        | `MOCK_TICKETING_PORT`   |

## More docs

- **SDK**: `packages/client/README.md`
- **Demo agent**: `packages/demo-agent/README.md`
- **E2E**: `e2e/README.md`
- **Observability**: `observability/README.md`

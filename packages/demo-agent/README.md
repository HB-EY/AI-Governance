# Ticket-Triage Demo Agent

Demo agent that registers with the control plane and performs governed ticket-read and ticket-update actions. Use it to see SDK usage and policy/approval flows.

## What It Demonstrates

- **Registration**: Registers as "Ticket-Triage-Agent" with capabilities `read`, `propose_change`, `commit_change`.
- **Governed actions**: Uses SDK helpers `read()` and `proposeChange()` for `ticket-read` and `ticket-update`.
- **Evidence**: Uses `EvidenceBuilder` for context and reasoning.
- **Error handling**: Catches `ActionDeniedError`, `ValidationFailedError`, `ApprovalTimeoutError`.

## Setup

1. Start the control plane API and (optionally) the mock ticketing service:

   ```bash
   # From repo root
   npm run dev          # API + web + worker
   npm run build -w @ai-governance/mock-ticketing && npm run start -w @ai-governance/mock-ticketing  # Port 3002
   ```

2. Set the gateway URL if not default:

   ```bash
   export CONTROL_PLANE_URL=http://localhost:3001
   export AGENT_OWNER_ID=demo-owner
   ```

3. First run (register and get API key):

   ```bash
   npm run start -w @ai-governance/demo-agent
   ```

   The process will register the agent and print the `api_key`. **Save it**; it is shown only once.

4. Second run (use saved API key):

   ```bash
   export AGENT_API_KEY=agk_...
   npm run start -w @ai-governance/demo-agent
   ```

   Optionally set `TICKET_ID` (default `TKT-001`).

## Scenarios

- **Scenario 1 – Simple read (allowed)**  
  Policy allows `ticket-read`. Agent gets `decision: allow` and optional outcome.

- **Scenario 2 – Update with PII (denied)**  
  If a validation check detects PII in parameters, the gateway returns validation_failed; the agent catches `ValidationFailedError` and does not retry.

- **Scenario 3 – High-priority update (approval required)**  
  If policy requires approval, the SDK returns `allow-with-approval` and can call `waitForApproval()`. Approve in the admin console; the agent then proceeds.

- **Scenario 4 – Normal update (success)**  
  Policy allows and no approval required; gateway proxies to downstream (e.g. mock ticketing); agent receives outcome.

## Architecture

```
Demo Agent (this package)
    → Control Plane Client SDK (@ai-governance/client)
        → Control Plane API (gateway, agents, policies)
    → Mock Ticketing API (optional, port 3002) via gateway downstream
```

## Adaptation for Your Agent

1. Depend on `@ai-governance/client`.
2. Create a `ControlPlaneClient` with `gatewayUrl` and `api_key`.
3. Register once (or use pre-issued credentials).
4. Use `read` / `proposeChange` / `commitChange` with your `action_type` and `target_resource`.
5. Use `EvidenceBuilder` for context and reasoning.
6. Handle `ActionDeniedError`, `ValidationFailedError`, `ApprovalTimeoutError` and log or retry as appropriate.

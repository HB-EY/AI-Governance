# Control Plane Client SDK

TypeScript/JavaScript client for the Agent Governance Control Plane. Use it to register agents, submit governed actions, and wait for approvals.

## Installation

```bash
npm install @ai-governance/client
```

## Quick Start

```ts
import { ControlPlaneClient, createEvidenceBuilder, proposeChange } from '@ai-governance/client';

const client = new ControlPlaneClient({
  gatewayUrl: 'https://control-plane.example.com',
  apiKey: process.env.AGENT_API_KEY!,
});

// Register (once); store returned api_key securely
const { agent_id, api_key } = await client.register({
  name: 'My-Agent',
  description: 'Does X',
  owner_id: 'team-1',
  capabilities: ['read', 'propose_change', 'commit_change'],
});

// Submit a governed action with evidence
const evidence = createEvidenceBuilder()
  .setContext({ source: 'my-agent' })
  .setReasoning('User requested priority change')
  .addParameter('priority', 'high')
  .build();

const result = await proposeChange(
  client,
  'ticket-update',
  'tickets/TKT-001',
  { priority: 'high' },
  evidence
);

if (result.decision === 'allow') console.log('Outcome:', result.outcome);
```

## API Reference

### ControlPlaneClient

- **constructor(config)**  
  `gatewayUrl`: Control plane base URL.  
  `apiKey`: Bearer token for gateway.  
  `agentId`: Optional; set after `register()`.  
  `retries`, `submitTimeoutMs`, `pollIntervalMs`: Optional tuning.

- **register(request)**  
  Registers the agent. Returns `{ agent_id, api_key }`. Call once; persist `api_key`.

- **submitAction(request)**  
  Submits an action. Request: `action_type`, `target_resource`, `parameters?`, `context?`, `reasoning?`, `output?`.  
  Returns `{ request_id, trace_id, decision, approval_id?, poll_url?, outcome? }`.  
  Throws `ActionDeniedError`, `ValidationFailedError`, `GatewayUnavailableError` on 4xx/5xx.

- **waitForApproval({ requestId, maxWaitMs? })**  
  Polls until approval is approved/denied/expired. Throws `ApprovalTimeoutError` on timeout.

### Helpers

- **read(client, actionType, targetResource, params?, evidence?)**  
  Submits a read-style action (e.g. `ticket-read`).

- **proposeChange(client, actionType, targetResource, params?, evidence?)**  
  Submits a change; if policy requires approval, polls until decided.

- **commitChange(client, actionType, targetResource, params?, evidence?)**  
  Same as proposeChange; use for commit/execute semantics.

### EvidenceBuilder

- **setContext(ctx)**, **setReasoning(text)**, **addParameter(key, value)**, **addParameters(obj)**, **build()**  
  Fluent API to build an evidence record for `context`, `reasoning`, and action parameters.

### Errors

- **ActionDeniedError** – Policy or approval denial (e.g. `policy_denied`, `validation_failed`).
- **ValidationFailedError** – Validation failed; `details.checks_run` for per-check results.
- **ApprovalTimeoutError** – Approval did not complete within `maxWaitMs`.
- **GatewayUnavailableError** – 5xx or network failure (retry with backoff).

## Integration Guide

1. **Register** the agent at startup (or use a pre-issued `api_key` and `agent_id`).
2. **Submit actions** via `submitAction` or the `read` / `proposeChange` / `commitChange` helpers.
3. **Handle decisions**: `allow` → use `outcome`; `allow-with-approval` → use `waitForApproval` or poll `poll_url`; deny/validation failure → handle typed errors and do not retry for permanent failures.
4. **Evidence**: Use `EvidenceBuilder` for `context`, `reasoning`, and parameters so approvers and auditors have full context.

## Troubleshooting

- **401 Unauthorized**: Invalid or missing `api_key`; ensure Bearer token is correct.
- **403 Forbidden**: Agent not registered, disabled, or policy denied; check `ActionDeniedError.details`.
- **429 / 5xx**: Transient; SDK retries with backoff. If persistent, check gateway and dependencies.

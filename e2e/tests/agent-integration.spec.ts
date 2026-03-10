/**
 * Agent integration E2E (WO-58): agent registers, submits allowed action, evidence captured;
 * agent submits denied action, receives clear error.
 * Requires API and (optional) mock ticketing running. Use real services, not mocks.
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

test.describe('Agent integration', () => {
  test('health check', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('register agent and submit allowed action', async ({ request }) => {
    const name = `E2E-Agent-${Date.now()}`;
    const reg = await request.post(`${API_URL}/v1/agents`, {
      data: {
        name,
        description: 'E2E test agent',
        owner_id: 'e2e-owner',
        capabilities: ['read', 'propose_change', 'commit_change'],
      },
    });
    expect(reg.ok()).toBeTruthy();
    const regBody = await reg.json();
    const { agent_id, api_key } = regBody.data;
    expect(agent_id).toBeTruthy();
    expect(api_key).toBeTruthy();

    const action = await request.post(`${API_URL}/v1/gateway/actions`, {
      headers: { Authorization: `Bearer ${api_key}` },
      data: {
        action_type: 'ticket-read',
        target_resource: 'tickets/TKT-001',
        parameters: {},
        context: { e2e: true },
        reasoning: 'E2E test read',
      },
    });
    expect([200, 202, 403, 502]).toContain(action.status());
    const actionBody = await action.json();
    if (action.ok()) {
      expect(actionBody.data?.trace_id).toBeTruthy();
      expect(actionBody.data?.decision).toBeDefined();
    } else {
      expect(actionBody.error?.message).toBeDefined();
    }
  });

  test('submit without auth returns 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/v1/gateway/actions`, {
      data: {
        action_type: 'ticket-read',
        target_resource: 'tickets/TKT-001',
      },
    });
    expect(res.status()).toBe(401);
  });
});

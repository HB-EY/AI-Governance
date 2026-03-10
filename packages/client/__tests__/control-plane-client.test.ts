/**
 * Unit tests for Control Plane Client SDK (WO-51): mocked HTTP.
 */

import { ControlPlaneClient } from '../src/control-plane-client.js';
import { EvidenceBuilder } from '../src/evidence-builder.js';
import { parseGatewayError, ActionDeniedError, GatewayUnavailableError } from '../src/errors.js';

describe('parseGatewayError', () => {
  it('returns GatewayUnavailableError for 5xx', () => {
    const err = parseGatewayError(503, { error: { message: 'Unavailable' } });
    expect(err).toBeInstanceOf(GatewayUnavailableError);
    expect((err as GatewayUnavailableError).statusCode).toBe(503);
  });

  it('returns ActionDeniedError for 403 policy_denied', () => {
    const err = parseGatewayError(403, { error: { code: 'policy_denied', message: 'Denied' } });
    expect(err).toBeInstanceOf(ActionDeniedError);
  });
});

describe('EvidenceBuilder', () => {
  it('builds evidence with context, reasoning, parameters', () => {
    const evidence = new EvidenceBuilder()
      .setContext({ ticket_id: 'TKT-001' })
      .setReasoning('User requested change')
      .addParameter('priority', 'high')
      .build();
    expect(evidence.context).toEqual({ ticket_id: 'TKT-001' });
    expect(evidence.reasoning).toBe('User requested change');
    expect(evidence.parameters).toEqual({ priority: 'high' });
  });

  it('returns empty optional fields when not set', () => {
    const evidence = new EvidenceBuilder().build();
    expect(evidence.context).toBeUndefined();
    expect(evidence.reasoning).toBeUndefined();
    expect(evidence.parameters).toBeUndefined();
  });
});

describe('ControlPlaneClient', () => {
  it('throws when submitAction without agentId', async () => {
    const client = new ControlPlaneClient({
      gatewayUrl: 'http://localhost:3000',
      apiKey: 'test-key',
    });
    await expect(
      client.submitAction({
        action_type: 'ticket-read',
        target_resource: 'tickets/1',
      })
    ).rejects.toThrow('Agent not registered');
  });
});

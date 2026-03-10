/**
 * Integration tests for Evidence & Trace and Approval Workflow (WO-50).
 * Requires DATABASE_URL. Skips when not set.
 */

const hasDb = !!process.env.DATABASE_URL;

async function createAgent(data: { name: string; description?: string; owner_id: string; capabilities?: string[] }) {
  const mod = await import('../../src/db/agents.js');
  const id = crypto.randomUUID();
  return mod.createAgent(
    {
      id,
      name: data.name,
      description: data.description ?? null,
      owner_id: data.owner_id,
      owner_email: null,
      api_key_hash: 'test-hash',
      created_by: null,
    },
    data.capabilities ?? ['read']
  );
}

async function createTrace(data: {
  id: string;
  agent_id: string;
  agent_version_id: string;
  action_type: string;
  target_resource: string;
}) {
  const mod = await import('../../src/db/traces.js');
  return mod.createTrace(data);
}

async function getTraceById(id: string) {
  const mod = await import('../../src/db/traces.js');
  return mod.getTraceById(id);
}

async function listTraces(opts: { pagination: { page: number; pageSize: number }; filters?: { agent_id?: string } }) {
  const mod = await import('../../src/db/traces.js');
  return mod.listTraces(opts);
}

async function updateTraceStatus(id: string, status: 'pending' | 'success' | 'denied' | 'failed') {
  const mod = await import('../../src/db/traces.js');
  return mod.updateTraceStatus(id, status);
}

describe('Evidence and Approval integration', () => {
  let traceId: string;
  let testAgentId: string;
  let testVersionId: string;

  beforeAll(async () => {
    if (!hasDb) return;
    const agent = await createAgent({
      name: `evidence-test-agent-${Date.now()}`,
      owner_id: 'test',
      capabilities: ['read'],
    });
    testAgentId = agent.id;
    testVersionId = agent.current_version_id!;
  });

  afterAll(async () => {
    const { closePool } = await import('../../src/db/pool.js');
    await closePool();
  });

  it('skips when DATABASE_URL not set', () => {
    if (!hasDb) expect(process.env.DATABASE_URL).toBeFalsy();
  });

  it('creates trace and retrieves by ID', async () => {
    if (!hasDb || !testAgentId || !testVersionId) return;
    traceId = crypto.randomUUID();
    const created = await createTrace({
      id: traceId,
      agent_id: testAgentId,
      agent_version_id: testVersionId,
      action_type: 'test_action',
      target_resource: '/test',
    });
    expect(created.id).toBe(traceId);
    expect(created.status).toBe('pending');

    const found = await getTraceById(traceId);
    expect(found).not.toBeNull();
    expect(found!.action_type).toBe('test_action');
  });

  it('lists traces with filters', async () => {
    if (!hasDb) return;
    const result = await listTraces({
      pagination: { page: 1, pageSize: 5 },
      filters: testAgentId ? { agent_id: testAgentId } : undefined,
    });
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('updates trace status', async () => {
    if (!hasDb || !traceId) return;
    const updated = await updateTraceStatus(traceId, 'success');
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('success');
  });
});

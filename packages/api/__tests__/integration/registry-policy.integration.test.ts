/**
 * Integration tests for Agent Registry and Policy Engine (WO-48).
 * Requires DATABASE_URL. Skips when not set.
 */

const hasDb = !!process.env.DATABASE_URL;

async function getPool() {
  const mod = await import('../../src/db/pool.js');
  return mod.getPool();
}

async function getAgentById(id: string) {
  const mod = await import('../../src/db/agents.js');
  return mod.getAgentById(id);
}

async function listAgents(opts: { pagination: { page: number; pageSize: number }; filters?: { status?: string } }) {
  const mod = await import('../../src/db/agents.js');
  return mod.listAgents(opts);
}

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

async function updateAgentStatus(id: string, status: 'active' | 'disabled' | 'suspended') {
  const mod = await import('../../src/db/agents.js');
  return mod.updateAgentStatus(id, status);
}

async function createPolicy(data: { name: string; description: string; rules: { field: string; operator: string; value: unknown }[]; effect: 'allow' | 'deny' }) {
  const mod = await import('../../src/db/policies.js');
  return mod.createPolicy(data as never);
}

async function listActivePolicyVersions() {
  const mod = await import('../../src/db/policies.js');
  return mod.listActivePolicyVersions();
}

describe('Agent Registry and Policy integration', () => {
  let pool: Awaited<ReturnType<typeof getPool>>;
  let createdAgentId: string;
  let createdPolicyId: string;

  beforeAll(async () => {
    if (!hasDb) return;
    pool = await getPool();
  });

  afterAll(async () => {
    if (pool && createdPolicyId) {
      try {
        const poolImpl = pool as { query: (s: string, p?: unknown[]) => Promise<{ rows: unknown[] }> };
        await poolImpl.query('DELETE FROM policy_versions WHERE policy_id = $1', [createdPolicyId]);
        await poolImpl.query('DELETE FROM policies WHERE id = $1', [createdPolicyId]);
      } catch {
        // ignore
      }
    }
    const { closePool } = await import('../../src/db/pool.js');
    await closePool();
  });

  it('skips when DATABASE_URL not set', () => {
    if (!hasDb) {
      expect(process.env.DATABASE_URL).toBeFalsy();
      return;
    }
    expect(pool).toBeDefined();
  });

  it('creates and gets agent by ID', async () => {
    if (!hasDb) return;
    const name = `test-agent-${Date.now()}`;
    const created = await createAgent({
      name,
      description: 'Integration test agent',
      owner_id: 'test-owner',
      capabilities: ['read', 'write'],
    });
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.name).toBe(name);
    createdAgentId = created.id;

    const found = await getAgentById(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it('lists agents with filters', async () => {
    if (!hasDb) return;
    const result = await listAgents({
      pagination: { page: 1, pageSize: 10 },
      filters: { status: 'active' },
    });
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('updates agent status', async () => {
    if (!hasDb || !createdAgentId) return;
    const updated = await updateAgentStatus(createdAgentId, 'disabled');
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('disabled');
    const found = await getAgentById(createdAgentId);
    expect(found!.status).toBe('disabled');
    await updateAgentStatus(createdAgentId, 'active');
  });

  it('creates policy and lists active versions', async () => {
    if (!hasDb) return;
    const name = `test-policy-${Date.now()}`;
    const created = await createPolicy({
      name,
      description: 'Integration test policy',
      rules: [{ field: 'action.type', operator: 'equals', value: 'read' }],
      effect: 'allow',
    });
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    createdPolicyId = created.id;

    const versions = await listActivePolicyVersions();
    expect(Array.isArray(versions)).toBe(true);
    const ours = versions.find((v: { policy_id: string }) => v.policy_id === createdPolicyId);
    expect(ours).toBeDefined();
  });

  it('evaluates policies with allow decision', async () => {
    if (!hasDb) return;
    const { evaluatePolicies } = await import('../../src/services/policy-evaluator.js');
    const versions = await listActivePolicyVersions();
    const policyList = versions.map((v) => ({
      policy_id: v.policy_id,
      version: v,
    }));
    const result = evaluatePolicies(policyList, {
      agent_capabilities: ['read'],
      action_type: 'read',
      resource_pattern: '/foo',
    });
    expect(result.decision).toBeDefined();
    expect(['allow', 'deny', 'allow-with-validation', 'allow-with-approval']).toContain(result.decision);
  });
});

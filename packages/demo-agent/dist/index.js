/**
 * Ticket-triage demo agent (WO-53). Registers with control plane, processes tickets via governed actions.
 */
import 'dotenv/config';
import { ControlPlaneClient, createEvidenceBuilder, proposeChange, read, ActionDeniedError, ValidationFailedError, ApprovalTimeoutError, } from '@ai-governance/client';
const GATEWAY_URL = process.env.CONTROL_PLANE_URL ?? process.env.GATEWAY_URL ?? 'http://localhost:3000';
const OWNER_ID = process.env.AGENT_OWNER_ID ?? 'demo-owner';
async function main() {
    const client = new ControlPlaneClient({
        gatewayUrl: GATEWAY_URL,
        apiKey: process.env.AGENT_API_KEY ?? '',
        retries: 3,
    });
    if (!process.env.AGENT_API_KEY) {
        const result = await client.register({
            name: 'Ticket-Triage-Agent',
            description: 'Analyzes support tickets and routes them to appropriate teams',
            owner_id: OWNER_ID,
            capabilities: ['read', 'propose_change', 'commit_change'],
        });
        console.info('[demo-agent] Registered:', result.agent_id);
        console.info('[demo-agent] Set AGENT_API_KEY and re-run to use existing agent, or use api_key from registration.');
        return;
    }
    const ticketId = process.env.TICKET_ID ?? 'TKT-001';
    const evidence = createEvidenceBuilder()
        .setContext({ ticket_id: ticketId, source: 'demo-agent' })
        .setReasoning('Demo: propose priority high and category auth for login-related ticket')
        .addParameter('priority', 'high')
        .addParameter('category', 'auth')
        .build();
    try {
        const readResult = await read(client, 'ticket-read', `tickets/${ticketId}`, {}, evidence);
        console.info('[demo-agent] ticket-read result:', readResult.decision, readResult.trace_id);
        const updateResult = await proposeChange(client, 'ticket-update', `tickets/${ticketId}`, { priority: 'high', category: 'auth' }, evidence);
        console.info('[demo-agent] ticket-update result:', updateResult.decision, updateResult.trace_id);
        if (updateResult.outcome)
            console.info('[demo-agent] outcome:', updateResult.outcome);
    }
    catch (err) {
        if (err instanceof ActionDeniedError) {
            console.error('[demo-agent] Action denied:', err.message, err.details);
        }
        else if (err instanceof ValidationFailedError) {
            console.error('[demo-agent] Validation failed:', err.message, err.details?.checks_run);
        }
        else if (err instanceof ApprovalTimeoutError) {
            console.error('[demo-agent] Approval timeout:', err.message);
        }
        else {
            console.error('[demo-agent] Error:', err);
        }
        process.exit(1);
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});

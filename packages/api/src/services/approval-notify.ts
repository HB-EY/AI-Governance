/**
 * Approval notifications (WO-34, 35, 37): stub that logs and optionally calls webhook.
 */

export async function notifyApprovalCreated(params: {
  approval_id: string;
  agent_id: string;
  agent_name?: string;
  action_type: string;
  action_summary: string;
  assigned_approvers: string[];
  expires_at: string;
  detail_url?: string;
}): Promise<void> {
  // eslint-disable-next-line no-console
  console.info('[approval] created', params.approval_id, params.action_type, params.assigned_approvers);
  const webhook = process.env.APPROVAL_NOTIFY_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'approval_created', ...params }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // ignore
    }
  }
}

export async function notifyApprovalDecided(params: {
  approval_id: string;
  decision: 'approved' | 'denied';
  approver_id?: string;
  reason?: string;
}): Promise<void> {
  // eslint-disable-next-line no-console
  console.info('[approval] decided', params.approval_id, params.decision);
  const webhook = process.env.APPROVAL_NOTIFY_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'approval_decided', ...params }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // ignore
    }
  }
}

export async function notifyApprovalExpired(params: { approval_id: string; agent_id: string }): Promise<void> {
  // eslint-disable-next-line no-console
  console.info('[approval] expired', params.approval_id);
  const webhook = process.env.APPROVAL_NOTIFY_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'approval_expired', ...params }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // ignore
    }
  }
}

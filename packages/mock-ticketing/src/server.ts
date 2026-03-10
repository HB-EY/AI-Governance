/**
 * Mock ticketing API (WO-54). Express server with in-memory tickets.
 * GET /tickets/:id, PATCH /tickets/:id, health check, seed data.
 */

import express from 'express';

const app = express();
app.use(express.json());

interface Ticket {
  id: string;
  subject: string;
  priority: string;
  category: string;
  assigned_to: string | null;
  status: string;
  created_at: string;
}

const tickets = new Map<string, Ticket>();

function seedTickets(): void {
  const now = new Date().toISOString();
  [
    { id: 'TKT-001', subject: 'Login failure', priority: 'high', category: 'auth', assigned_to: null, status: 'open' },
    { id: 'TKT-002', subject: 'Billing inquiry', priority: 'medium', category: 'billing', assigned_to: null, status: 'open' },
    { id: 'TKT-003', subject: 'Feature request', priority: 'low', category: 'product', assigned_to: null, status: 'open' },
  ].forEach((t) => {
    tickets.set(t.id, { ...t, created_at: now });
  });
}

seedTickets();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mock-ticketing' });
});

app.get('/tickets/:id', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found', id: req.params.id });
  }
  res.json(ticket);
});

app.patch('/tickets/:id', (req, res) => {
  const ticket = tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found', id: req.params.id });
  }
  const { priority, category, assigned_to } = req.body ?? {};
  const allowed = ['low', 'medium', 'high', 'critical'];
  if (priority != null) {
    if (typeof priority !== 'string' || !allowed.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority', allowed });
    }
    ticket.priority = priority;
  }
  if (category != null && typeof category === 'string') ticket.category = category;
  if (assigned_to !== undefined) ticket.assigned_to = assigned_to == null ? null : String(assigned_to);
  res.json(ticket);
});

/** Gateway downstream callback: POST with action_type, target_resource, parameters */
app.post('/v1/action', (req, res) => {
  const { action_type, target_resource, parameters = {} } = (req.body ?? {}) as {
    action_type?: string;
    target_resource?: string;
    parameters?: Record<string, unknown>;
  };
  const id = target_resource?.replace(/^\/?tickets\/?/, '') || target_resource;
  if (!id) {
    return res.status(400).json({ error: 'target_resource required (e.g. tickets/TKT-001)' });
  }
  if (action_type === 'ticket-read') {
    const ticket = tickets.get(id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found', id });
    return res.json(ticket);
  }
  if (action_type === 'ticket-update') {
    const ticket = tickets.get(id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found', id });
    const { priority, category, assigned_to } = parameters as { priority?: string; category?: string; assigned_to?: string };
    if (priority) ticket.priority = priority;
    if (category) ticket.category = category;
    if (assigned_to !== undefined) ticket.assigned_to = assigned_to;
    return res.json(ticket);
  }
  res.status(400).json({ error: 'Unsupported action_type', action_type });
});

const PORT = parseInt(process.env.MOCK_TICKETING_PORT ?? '3002', 10);
app.listen(PORT, () => {
  console.info(`[mock-ticketing] listening on port ${PORT}`);
});

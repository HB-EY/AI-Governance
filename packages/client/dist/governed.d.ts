/**
 * Governed decorator and action helpers (WO-52).
 * Wraps agent actions to route through the gateway and handle policy decisions.
 */
import type { ControlPlaneClient } from './control-plane-client.js';
import type { SubmitActionResult } from './control-plane-client.js';
import type { EvidenceRecord } from './evidence-builder.js';
export type GovernedActionHandler = (client: ControlPlaneClient, actionType: string, targetResource: string, params: Record<string, unknown>, evidence?: EvidenceRecord) => Promise<SubmitActionResult>;
/**
 * Submit a governed action (read-like: no side effects). Helper for read/propose patterns.
 */
export declare function read(client: ControlPlaneClient, actionType: string, targetResource: string, params?: Record<string, unknown>, evidence?: EvidenceRecord): Promise<SubmitActionResult>;
/**
 * Propose a change (allow-with-validation or allow-with-approval possible).
 */
export declare function proposeChange(client: ControlPlaneClient, actionType: string, targetResource: string, params?: Record<string, unknown>, evidence?: EvidenceRecord): Promise<SubmitActionResult>;
/**
 * Commit/execute change (same as submitAction with evidence).
 */
export declare function commitChange(client: ControlPlaneClient, actionType: string, targetResource: string, params?: Record<string, unknown>, evidence?: EvidenceRecord): Promise<SubmitActionResult>;
/**
 * Governed decorator factory: wraps an async method to route through the gateway.
 * Usage: @governed(client, 'ticket-update', (t) => t.id)
 * Decorator extracts action_type and target_resource from args; method params become action parameters.
 */
export declare function governed(client: ControlPlaneClient, actionType: string, getTargetResource: (...args: unknown[]) => string): (_target: unknown, _propertyKey: string) => void;

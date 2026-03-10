/**
 * @ai-governance/client — Typed API client and Control Plane SDK.
 * Generate with: npm run generate (from OpenAPI spec).
 */
export { createApiClient } from './create-client.js';
export { getHealth, getV1Me, client } from './generated/sdk.gen';
export { ControlPlaneClient } from './control-plane-client.js';
export { ActionDeniedError, ValidationFailedError, ApprovalTimeoutError, GatewayUnavailableError, parseGatewayError, } from './errors.js';
export { EvidenceBuilder, createEvidenceBuilder } from './evidence-builder.js';
export { read, proposeChange, commitChange, governed } from './governed.js';

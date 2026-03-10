/**
 * @ai-governance/client — Typed API client and Control Plane SDK.
 * Generate with: npm run generate (from OpenAPI spec).
 */
export { createApiClient } from './create-client.js';
export type { ApiClientConfig, ApiClient } from './create-client.js';
export { getHealth, getV1Me, client } from './generated/sdk.gen';
export type { GetHealthData, GetHealthResponse, GetV1MeData, GetV1MeResponse, } from './generated/types.gen';
export { ControlPlaneClient } from './control-plane-client.js';
export type { ControlPlaneClientConfig, SubmitActionRequest, SubmitActionResult, WaitForApprovalOptions, ApprovalStatusResult, } from './control-plane-client.js';
export { ActionDeniedError, ValidationFailedError, ApprovalTimeoutError, GatewayUnavailableError, parseGatewayError, } from './errors.js';
export type { ApiErrorBody } from './errors.js';
export { EvidenceBuilder, createEvidenceBuilder } from './evidence-builder.js';
export type { EvidenceRecord } from './evidence-builder.js';
export { read, proposeChange, commitChange, governed } from './governed.js';
export type { GovernedActionHandler } from './governed.js';

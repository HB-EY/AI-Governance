/**
 * EvidenceBuilder and structured evidence for action requests (WO-52).
 * Fluent API: setContext(), setReasoning(), addParameter(), build().
 */
export interface EvidenceRecord {
    context?: Record<string, unknown>;
    reasoning?: string;
    parameters?: Record<string, unknown>;
}
export declare class EvidenceBuilder {
    private context;
    private reasoning;
    private parameters;
    setContext(ctx: Record<string, unknown>): this;
    setReasoning(reasoning: string): this;
    addParameter(key: string, value: unknown): this;
    addParameters(params: Record<string, unknown>): this;
    build(): EvidenceRecord;
}
export declare function createEvidenceBuilder(): EvidenceBuilder;

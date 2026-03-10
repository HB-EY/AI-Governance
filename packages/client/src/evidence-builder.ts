/**
 * EvidenceBuilder and structured evidence for action requests (WO-52).
 * Fluent API: setContext(), setReasoning(), addParameter(), build().
 */

export interface EvidenceRecord {
  context?: Record<string, unknown>;
  reasoning?: string;
  parameters?: Record<string, unknown>;
}

export class EvidenceBuilder {
  private context: Record<string, unknown> = {};
  private reasoning: string = '';
  private parameters: Record<string, unknown> = {};

  setContext(ctx: Record<string, unknown>): this {
    this.context = { ...ctx };
    return this;
  }

  setReasoning(reasoning: string): this {
    this.reasoning = reasoning;
    return this;
  }

  addParameter(key: string, value: unknown): this {
    this.parameters[key] = value;
    return this;
  }

  addParameters(params: Record<string, unknown>): this {
    Object.assign(this.parameters, params);
    return this;
  }

  build(): EvidenceRecord {
    return {
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
      reasoning: this.reasoning || undefined,
      parameters: Object.keys(this.parameters).length > 0 ? this.parameters : undefined,
    };
  }
}

export function createEvidenceBuilder(): EvidenceBuilder {
  return new EvidenceBuilder();
}

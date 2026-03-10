/**
 * EvidenceBuilder and structured evidence for action requests (WO-52).
 * Fluent API: setContext(), setReasoning(), addParameter(), build().
 */
export class EvidenceBuilder {
    context = {};
    reasoning = '';
    parameters = {};
    setContext(ctx) {
        this.context = { ...ctx };
        return this;
    }
    setReasoning(reasoning) {
        this.reasoning = reasoning;
        return this;
    }
    addParameter(key, value) {
        this.parameters[key] = value;
        return this;
    }
    addParameters(params) {
        Object.assign(this.parameters, params);
        return this;
    }
    build() {
        return {
            context: Object.keys(this.context).length > 0 ? this.context : undefined,
            reasoning: this.reasoning || undefined,
            parameters: Object.keys(this.parameters).length > 0 ? this.parameters : undefined,
        };
    }
}
export function createEvidenceBuilder() {
    return new EvidenceBuilder();
}

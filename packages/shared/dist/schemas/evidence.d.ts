/**
 * JSON schemas for evidence creation (attachments, payloads linked to traces).
 */
export declare const createEvidenceSchema: {
    type: "object";
    required: string[];
    additionalProperties: boolean;
    properties: {
        trace_id: {
            type: "string";
            format: string;
        };
        content_type: {
            type: "string";
            minLength: number;
        };
        payload: {
            description: string;
        };
        metadata: {
            type: "object";
        };
    };
};
//# sourceMappingURL=evidence.d.ts.map
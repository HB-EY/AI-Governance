/**
 * JSON schemas for approval decision requests.
 */
export declare const approvalDecisionSchema: {
    type: "object";
    required: string[];
    additionalProperties: boolean;
    properties: {
        approval_request_id: {
            type: "string";
            format: string;
            pattern: string;
        };
        decision: {
            type: "string";
            enum: string[];
        };
        reason: {
            type: "string";
        };
    };
};
//# sourceMappingURL=approval.d.ts.map
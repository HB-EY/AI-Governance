/**
 * JSON schemas for policy create/update.
 */
export declare const createPolicySchema: {
    type: "object";
    required: string[];
    additionalProperties: boolean;
    properties: {
        name: {
            type: "string";
            minLength: number;
            maxLength: number;
        };
        description: {
            type: "string";
            minLength: number;
        };
    };
};
export declare const updatePolicySchema: {
    type: "object";
    additionalProperties: boolean;
    properties: {
        description: {
            type: "string";
            minLength: number;
        };
    };
    minProperties: number;
};
//# sourceMappingURL=policy.d.ts.map
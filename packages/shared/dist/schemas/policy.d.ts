/**
 * JSON schemas for policy create/update (WO-20).
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
        rules: {
            type: "array";
            items: {
                type: "object";
                required: string[];
                additionalProperties: boolean;
                properties: {
                    field: {
                        type: "string";
                    };
                    operator: {
                        type: "string";
                        enum: string[];
                    };
                    value: {};
                    negate: {
                        type: "boolean";
                    };
                };
            };
            minItems: number;
        };
        effect: {
            type: "string";
            enum: string[];
        };
        priority: {
            type: "number";
        };
        requires_validation: {
            type: "boolean";
        };
        validation_types: {
            type: "array";
            items: {
                type: "string";
            };
        };
        requires_approval: {
            type: "boolean";
        };
        approver_roles: {
            type: "array";
            items: {
                type: "string";
            };
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
        rules: {
            type: "array";
            items: {
                type: "object";
                required: string[];
                additionalProperties: boolean;
                properties: {
                    field: {
                        type: "string";
                    };
                    operator: {
                        type: "string";
                        enum: string[];
                    };
                    value: {};
                    negate: {
                        type: "boolean";
                    };
                };
            };
        };
        effect: {
            type: "string";
            enum: string[];
        };
        priority: {
            type: "number";
        };
        requires_validation: {
            type: "boolean";
        };
        validation_types: {
            type: "array";
            items: {
                type: "string";
            };
        };
        requires_approval: {
            type: "boolean";
        };
        approver_roles: {
            type: "array";
            items: {
                type: "string";
            };
        };
    };
    minProperties: number;
};
//# sourceMappingURL=policy.d.ts.map
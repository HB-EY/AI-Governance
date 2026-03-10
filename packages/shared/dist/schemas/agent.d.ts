/**
 * JSON schemas for agent registration (REQ-AREG-001).
 */
export declare const registerAgentSchema: {
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
        };
        owner_id: {
            type: "string";
            minLength: number;
        };
        owner_email: {
            type: "string";
        };
        capabilities: {
            type: "array";
            items: {
                type: "string";
                enum: string[];
            };
            minItems: number;
        };
    };
};
//# sourceMappingURL=agent.d.ts.map
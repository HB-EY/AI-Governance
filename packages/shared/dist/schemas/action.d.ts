/**
 * JSON schemas for gateway action submission (agent action request).
 */
export declare const actionTypeEnum: readonly ["read", "propose_change", "commit_change", "query", "execute_tool", "call_model"];
export declare const submitActionSchema: {
    type: "object";
    required: string[];
    additionalProperties: boolean;
    properties: {
        action_type: {
            type: "string";
            enum: readonly ["read", "propose_change", "commit_change", "query", "execute_tool", "call_model"];
        };
        target_resource: {
            type: "string";
            minLength: number;
        };
        context: {
            type: "object";
            description: string;
        };
        reasoning: {
            type: "string";
        };
        request_payload: {
            type: "object";
            description: string;
        };
    };
};
//# sourceMappingURL=action.d.ts.map
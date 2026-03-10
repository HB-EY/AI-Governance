/**
 * JSON schemas for validation check create/update.
 */
export declare const validationCheckTypeEnum: readonly ["schema", "pii", "sentiment", "business-rule", "format"];
export declare const createValidationCheckSchema: {
    type: "object";
    required: string[];
    additionalProperties: boolean;
    properties: {
        name: {
            type: "string";
            minLength: number;
            maxLength: number;
        };
        check_type: {
            type: "string";
            enum: readonly ["schema", "pii", "sentiment", "business-rule", "format"];
        };
        description: {
            type: "string";
            minLength: number;
        };
        configuration: {
            type: "object";
        };
        timeout_seconds: {
            type: "integer";
            minimum: number;
            maximum: number;
        };
    };
};
export declare const updateValidationCheckSchema: {
    type: "object";
    additionalProperties: boolean;
    properties: {
        description: {
            type: "string";
            minLength: number;
        };
        configuration: {
            type: "object";
        };
        status: {
            type: "string";
            enum: string[];
        };
        timeout_seconds: {
            type: "integer";
            minimum: number;
            maximum: number;
        };
    };
    minProperties: number;
};
//# sourceMappingURL=validation-check.d.ts.map
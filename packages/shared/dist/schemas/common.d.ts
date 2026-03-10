/**
 * Common JSON Schema fragments (definitions, formats).
 */
export declare const uuidSchema: {
    type: "string";
    format: string;
    pattern: string;
};
export declare const capabilityTypeSchema: {
    type: "array";
    items: {
        type: "string";
        enum: string[];
    };
    minItems: number;
};
export declare const nonEmptyString: {
    type: "string";
    minLength: number;
};
//# sourceMappingURL=common.d.ts.map
/**
 * Schema validation check (WO-30): validate payload against JSON schema.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Ajv = require('ajv').default;
let ajv = null;
function getAjv() {
    if (!ajv)
        ajv = new Ajv({ allErrors: true });
    return ajv;
}
export function validateAgainstSchema(schema, payload) {
    try {
        const validator = getAjv().compile(schema);
        const valid = validator(payload);
        if (valid)
            return { pass: true };
        const errList = validator.errors ?? [];
        const errors = errList.map((e) => ({
            path: e.instancePath || (e.params && 'missingProperty' in e.params ? e.params.missingProperty : '') || '',
            message: e.message ?? 'validation error',
        }));
        return { pass: false, errors };
    }
    catch (err) {
        return {
            pass: false,
            errors: [{ path: '', message: err instanceof Error ? err.message : 'Invalid schema' }],
        };
    }
}

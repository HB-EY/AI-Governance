/**
 * Schema validation check (WO-30): validate payload against JSON schema.
 * Use createRequire so ajv works when the package is ESM or CJS.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Ajv = require('ajv').default ?? require('ajv');
let ajvInstance = null;
function getAjv() {
    if (!ajvInstance)
        ajvInstance = new Ajv({ allErrors: true });
    return ajvInstance;
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

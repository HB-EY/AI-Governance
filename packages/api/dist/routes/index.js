/**
 * Route registration: health and versioned /v1 API.
 */
import { healthRoutes } from './health.js';
import { v1Routes } from './v1/index.js';
export async function registerRoutes(app) {
    await app.register(healthRoutes, { prefix: '/' });
    await app.register(v1Routes, { prefix: '/v1' });
}

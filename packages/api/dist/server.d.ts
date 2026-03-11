/**
 * Fastify API service entry point.
 * Configures server, plugins, routes, and graceful shutdown.
 * Loads .env from repo root when run from packages/api (so DATABASE_URL etc. are found).
 */
import './telemetry.js';

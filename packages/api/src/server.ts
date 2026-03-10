/**
 * Fastify API service entry point.
 * Configures server, plugins, routes, and graceful shutdown.
 */

import 'dotenv/config';
import './telemetry.js';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import compress from '@fastify/compress';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { requestIdPlugin } from './plugins/request-id.js';
import { telemetryPlugin } from './plugins/telemetry.js';
import { errorHandler } from './plugins/error-handler.js';
import { authPlugin } from './plugins/auth.js';
import { registerRoutes } from './routes/index.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

async function build() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { translateTime: 'SYS:standard' } }
          : undefined,
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          requestId: req.id,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: (req) => {
      const id = (req.headers['x-request-id'] as string) ?? crypto.randomUUID();
      return id;
    },
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID', 'Idempotency-Key'],
    credentials: true,
    maxAge: 86400,
  });
  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '1000', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? '1 hour',
  });
  await app.register(compress, { encodings: ['gzip', 'deflate'] });

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Agent Governance Control Plane API',
        description: 'REST API for agent registry, policy, validation, approval, and evidence.',
        version: '1.0.0',
      },
      servers: [{ url: '/', description: 'API server' }],
      components: {
        securitySchemes: {
          bearerAgent: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Agent API key: Bearer agk_<jwt> (issued at registration)',
          },
          bearerUser: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Admin/user session: Bearer <jwt> (from OAuth2/OIDC or BFF)',
          },
        },
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  await app.register(requestIdPlugin);
  await app.register(telemetryPlugin);
  await app.register(authPlugin, {
    agentJwtSecret: process.env.AGENT_JWT_SECRET ?? process.env.JWT_SECRET ?? '',
  });
  app.setErrorHandler(errorHandler);
  await registerRoutes(app);

  return app;
}

async function main() {
  const app = await build();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info({ port: PORT, host: HOST }, 'API server listening');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down gracefully');
    try {
      await app.close();
      app.log.info('Server closed');
      process.exit(0);
    } catch (e) {
      app.log.error(e);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();

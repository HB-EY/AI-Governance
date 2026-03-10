/**
 * Request ID propagation: ensure X-Request-ID is set on response (API Contracts).
 */

import type { FastifyPluginAsync } from 'fastify';

export const requestIdPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onSend', async (_request, reply, payload) => {
    const id = reply.request.id;
    if (id && !reply.getHeader('x-request-id')) {
      reply.header('x-request-id', id);
    }
    return payload;
  });
};

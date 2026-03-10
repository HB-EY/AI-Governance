/**
 * Current identity: agent or user (for testing auth middleware).
 */
export async function meRoutes(app) {
    app.get('/me', {
        preHandler: [app.requireAgentAuth()],
        schema: {
            description: 'Returns the authenticated agent identity. Requires Bearer agk_<jwt>.',
            tags: ['Identity'],
            security: [{ bearerAgent: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        request_id: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                agent_id: { type: 'string', format: 'uuid' },
                                auth_type: { type: 'string', enum: ['agent'] },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        return reply.send({
            request_id: request.id,
            timestamp: new Date().toISOString(),
            version: 'v1',
            data: {
                agent_id: request.agentId,
                auth_type: 'agent',
            },
        });
    });
}

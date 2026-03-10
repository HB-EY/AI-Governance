/**
 * Health check endpoint (unversioned).
 */
export async function healthRoutes(app) {
    app.get('/health', {
        schema: {
            description: 'Health check for load balancers and orchestration',
            tags: ['Health'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['ok'] },
                        timestamp: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    }, async (_request, reply) => {
        return reply.send({
            status: 'ok',
            timestamp: new Date().toISOString(),
        });
    });
}

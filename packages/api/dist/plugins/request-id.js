/**
 * Request ID propagation: ensure X-Request-ID is set on response (API Contracts).
 */
export const requestIdPlugin = async (app) => {
    app.addHook('onSend', async (_request, reply, payload) => {
        const id = reply.request.id;
        if (id && !reply.getHeader('x-request-id')) {
            reply.header('x-request-id', id);
        }
        return payload;
    });
};

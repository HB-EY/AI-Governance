/**
 * Health check HTTP server for worker monitoring.
 */
import { createServer } from 'http';
let server = null;
export function startHealthServer(port) {
    if (server)
        return;
    server = createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'worker' }));
    });
    server.listen(port, '0.0.0.0', () => {
        console.info(`[worker] health server listening on :${port}`);
    });
}
export function stopHealthServer() {
    return new Promise((resolve) => {
        if (!server) {
            resolve();
            return;
        }
        server.close(() => {
            server = null;
            resolve();
        });
    });
}

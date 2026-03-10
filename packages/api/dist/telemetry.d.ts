/**
 * OpenTelemetry SDK setup: traces, metrics, auto-instrumentation.
 * Import at the very top of server.ts so it runs before other modules.
 */
export declare const tracer: import("@opentelemetry/api").Tracer;
export declare const meter: import("@opentelemetry/api").Meter;

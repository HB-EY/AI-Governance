/**
 * OpenTelemetry SDK setup: traces, metrics, auto-instrumentation.
 * Import at the very top of server.ts so it runs before other modules.
 */

import { trace, metrics } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const otelDisabled = process.env.OTEL_SDK_DISABLED === 'true' || process.env.OTEL_SDK_DISABLED === '1';

if (!otelDisabled) {
  const serviceName = process.env.OTEL_SERVICE_NAME ?? 'ai-governance-api';
  const traceEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const metricsEndpoint = process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  const traceExporter = traceEndpoint
    ? new OTLPTraceExporter({ url: traceEndpoint })
    : undefined;

  const metricReader = metricsEndpoint
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: metricsEndpoint }),
        exportIntervalMillis: 60_000,
      })
    : undefined;

  const sdk = new NodeSDK({
    serviceName,
    traceExporter,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sdk-node and sdk-metrics MetricReader types differ
    metricReader: metricReader as any,
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
}

export const tracer = trace.getTracer('ai-governance-api', '0.1.0');
export const meter = metrics.getMeter('ai-governance-api', '0.1.0');

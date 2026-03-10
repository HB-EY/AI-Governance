# Observability (WO-57)

Prometheus metrics, Grafana dashboards, and alert rules for the AI Governance Control Plane.

## Contents

- **prometheus.yml** – Scrape config for API (and optional worker). Point `targets` at your API `/metrics` endpoint.
- **alert-rules.yml** – Alerts: high error rate (> 5%), high P95 latency (> 1s), low cache hit rate (< 90%), approval queue backlog (> 50), service down.
- **grafana/dashboards/control-plane.json** – Dashboard panels: request rate, error rate, latency percentiles (P50/P95/P99), agents by status, policy evaluation time, validation check duration, approval queue size, cache hit rate.

## Usage

1. **Prometheus**: Run Prometheus with this config; ensure the API exposes a `/metrics` endpoint in Prometheus format (implement if not present).
2. **Grafana**: Add Prometheus as a data source; import the dashboard JSON or provision under `grafana/dashboards`.
3. **Alerts**: Configure Alertmanager in `prometheus.yml` and set notification channels (email, Slack) in Alertmanager.
4. **Jaeger**: Use OpenTelemetry tracing in the API and point Jaeger at the same collector to view distributed traces; correlate with `request_id` in logs.

## Correlation

Use `request_id` (or trace ID) to correlate logs, metrics, and traces for a given request.

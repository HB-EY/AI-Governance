CREATE TABLE trace_spans (
  id                UUID PRIMARY KEY,
  trace_id          UUID NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
  span_type         TEXT NOT NULL CHECK (span_type IN ('policy_evaluation', 'validation', 'approval', 'downstream_call')),
  span_data         JSONB NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trace_spans_trace ON trace_spans(trace_id, started_at);
CREATE INDEX idx_trace_spans_type ON trace_spans(span_type);

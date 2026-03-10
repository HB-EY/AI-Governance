-- Job queue for background worker (approval timeouts, evidence aggregation, etc.)
CREATE TABLE jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue             VARCHAR(64) NOT NULL DEFAULT 'default',
  name              VARCHAR(128) NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}',
  attempts          INT NOT NULL DEFAULT 0,
  max_attempts       INT NOT NULL DEFAULT 3,
  status            VARCHAR(32) NOT NULL DEFAULT 'pending',
  scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  locked_at         TIMESTAMPTZ,
  locked_by         VARCHAR(255),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_queue_status_scheduled ON jobs (queue, status, scheduled_at)
  WHERE status IN ('pending', 'scheduled');
CREATE INDEX idx_jobs_locked ON jobs (locked_at) WHERE locked_at IS NOT NULL;

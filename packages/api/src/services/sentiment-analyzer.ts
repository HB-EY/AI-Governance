/**
 * Sentiment analysis check (WO-32): call LLM provider API, parse score (-1 to 1), compare to threshold.
 */

export interface SentimentConfig {
  threshold?: number; // fail if score < threshold (default -0.5)
  api_url?: string;
  api_key?: string;
}

export interface SentimentCheckResult {
  pass: boolean;
  score?: number;
  message?: string;
}

const DEFAULT_THRESHOLD = -0.5;

export async function analyzeSentiment(
  text: string,
  config: SentimentConfig = {}
): Promise<SentimentCheckResult> {
  const threshold = config.threshold ?? DEFAULT_THRESHOLD;
  const apiUrl = config.api_url ?? process.env.SENTIMENT_API_URL;
  if (!apiUrl) {
    return { pass: false, message: 'Sentiment API not configured. Set api_url in the check configuration or SENTIMENT_API_URL in the environment.' };
  }
  const apiKey = config.api_key ?? process.env.SENTIMENT_API_KEY;
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { pass: false, message: `Sentiment API error: ${res.status}` };
    }
    const data = (await res.json()) as { sentiment_score?: number; score?: number };
    const score = data.sentiment_score ?? data.score;
    if (typeof score !== 'number') {
      return { pass: false, message: 'Invalid sentiment response' };
    }
    const normalized = Math.max(-1, Math.min(1, score));
    const pass = normalized >= threshold;
    return {
      pass,
      score: normalized,
      message: pass ? undefined : `Sentiment score ${normalized.toFixed(2)} below threshold ${threshold}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sentiment check failed';
    return { pass: false, message };
  }
}

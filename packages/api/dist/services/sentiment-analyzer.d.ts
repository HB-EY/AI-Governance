/**
 * Sentiment analysis check (WO-32): call LLM provider API, parse score (-1 to 1), compare to threshold.
 */
export interface SentimentConfig {
    threshold?: number;
    api_url?: string;
    api_key?: string;
}
export interface SentimentCheckResult {
    pass: boolean;
    score?: number;
    message?: string;
}
export declare function analyzeSentiment(text: string, config?: SentimentConfig): Promise<SentimentCheckResult>;

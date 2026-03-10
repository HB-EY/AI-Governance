/**
 * Object key pattern: evidence/{year}/{month}/{day}/{trace_id}.json
 */

export function evidenceKey(traceId: string, date?: Date): string {
  const d = date ?? new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `evidence/${year}/${month}/${day}/${traceId}.json`;
}

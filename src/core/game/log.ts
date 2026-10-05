import type { LogEntry } from "./types";

const sameEntry = (a: LogEntry, b: LogEntry) => a.at === b.at && a.key === b.key && JSON.stringify(a.params) === JSON.stringify(b.params);

/**
 * Entries appended to a game log since `previous`. The log is capped, so the last known entry
 * is looked up in `next` rather than relying on lengths. Sounds and board animations are
 * derived from these entries instead of being triggered by the engine.
 */
export function newLogEntries(previous: readonly LogEntry[], next: readonly LogEntry[]): LogEntry[] {
  if (!previous.length) return [...next];
  const last = previous[previous.length - 1];
  for (let i = next.length - 1; i >= 0; i--) if (sameEntry(next[i], last)) return next.slice(i + 1);
  return [];
}

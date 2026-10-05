import { useEffect, useRef } from "react";
import { newLogEntries, type LogEntry } from "@/core/game";

/**
 * Calls `onEntries` with the log entries added since the previous render. The log present
 * when the component mounts is never replayed (joining or reloading a game stays quiet).
 */
export function useLogStream(log: LogEntry[], onEntries: (entries: LogEntry[]) => void) {
  const previous = useRef<LogEntry[] | null>(null);
  const callback = useRef(onEntries);
  callback.current = onEntries;
  useEffect(() => {
    const before = previous.current;
    previous.current = log;
    if (!before) return;
    const fresh = newLogEntries(before, log);
    if (fresh.length) callback.current(fresh);
  }, [log]);
}

/** Stable id of a log entry, for React keys. */
export const entryId = (entry: LogEntry, index = 0) => `${entry.at}:${entry.key}:${index}:${JSON.stringify(entry.params ?? {})}`;

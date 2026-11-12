import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs` while `active`. Use it only in the small
 * component that shows a live value (a running clock, "time logged"), so the tick re-renders that
 * text and not the whole list.
 */
export function useNow(intervalMs = 1000, active = true): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, active]);

  return active ? now : new Date();
}

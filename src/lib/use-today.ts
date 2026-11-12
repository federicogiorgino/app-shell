import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { type LocalDate, msUntilNextDay, today } from "./dates";

/**
 * Today's local date, updated at midnight and whenever the app returns to the foreground,
 * so a screen left open overnight moves to the new day.
 */
export function useToday(): LocalDate {
  const [date, setDate] = useState(today);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (): void => {
      // A second past midnight, so the new day has certainly started.
      timer = setTimeout(() => {
        setDate(today());
        schedule();
      }, msUntilNextDay() + 1000);
    };
    schedule();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setDate(today());
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return date;
}

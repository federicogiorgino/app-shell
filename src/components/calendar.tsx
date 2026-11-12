import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import {
  addMonths,
  type LocalDate,
  monthGrid,
  parseLocalDate,
  today as todayDate,
  type Weekday,
} from "@/lib/dates";

/** 38 pt day buttons. */
const DAY_SIZE = 38;

/**
 * An inline month calendar: month and year with previous and next
 * buttons, weekday initials, and a grid of days. The selected day is filled with the accent,
 * today is accent text. The first column is `weekStart`. Names follow the app language (`Intl`).
 */
export function Calendar({
  value,
  onChange,
  weekStart,
}: {
  value: LocalDate;
  onChange: (date: LocalDate) => void;
  weekStart: Weekday;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const [foreground, muted] = useThemeColor(["foreground", "muted"]);
  // The month on screen, as the first day of that month.
  const [month, setMonth] = useState(() => `${value.slice(0, 7)}-01`);
  const shown = parseLocalDate(month);
  const { leadingBlanks, days } = monthGrid(shown.getFullYear(), shown.getMonth() + 1, weekStart);
  const today = todayDate();

  const monthTitle = new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    year: "numeric",
  }).format(shown);
  const dayLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  // 2026-11-01 is a Sunday; walk a week from there in the chosen order.
  const weekdayInitials = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" }).format(
      new Date(2026, 10, 1 + ((weekStart + i) % 7))
    )
  );

  const cells: (LocalDate | null)[] = [...Array<null>(leadingBlanks).fill(null), ...days];
  const weeks: (LocalDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const lastWeek = weeks.at(-1);
  while (lastWeek && lastWeek.length < 7) lastWeek.push(null);

  return (
    <View className="px-3 pt-1.5 pb-3">
      <View className="flex-row items-center justify-between px-1 pt-1 pb-1.5">
        <Text className="text-body font-semibold text-foreground" accessibilityRole="header">
          {monthTitle}
        </Text>
        <View className="flex-row">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("calendar.previousMonth")}
            onPress={() => setMonth(addMonths(month, -1))}
            className="size-11 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color={foreground} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("calendar.nextMonth")}
            onPress={() => setMonth(addMonths(month, 1))}
            className="size-11 items-center justify-center"
          >
            <Ionicons name="chevron-forward" size={20} color={foreground} />
          </Pressable>
        </View>
      </View>
      <View className="flex-row">
        {weekdayInitials.map((initial, index) => (
          <Text
            key={index}
            accessibilityElementsHidden
            importantForAccessibility="no"
            className="flex-1 py-1.5 text-center text-caption font-semibold"
            style={{ color: muted }}
          >
            {initial}
          </Text>
        ))}
      </View>
      {weeks.map((week, row) => (
        <View key={row} className="flex-row" style={{ marginTop: row > 0 ? 2 : 0 }}>
          {week.map((day, column) => {
            if (!day) return <View key={`blank-${column}`} className="flex-1" />;
            const selected = day === value;
            const isToday = day === today;
            return (
              <View key={day} className="flex-1 items-center">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={dayLabel.format(parseLocalDate(day))}
                  accessibilityState={{ selected }}
                  onPress={() => onChange(day)}
                  className={`items-center justify-center rounded-full ${selected ? "bg-accent" : ""}`}
                  style={{ width: DAY_SIZE, height: DAY_SIZE }}
                >
                  <Text
                    className={`text-secondary ${
                      selected
                        ? "font-bold text-accent-foreground"
                        : isToday
                          ? "font-bold text-accent"
                          : "font-medium text-foreground"
                    }`}
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {Number(day.slice(8))}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

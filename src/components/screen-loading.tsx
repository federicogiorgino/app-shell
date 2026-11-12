import { Spinner } from "heroui-native";
import { useEffect, useState } from "react";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

/** A local read usually finishes well before this, so nothing flashes on screen. */
const SHOW_AFTER_MS = 300;

/**
 * The one loading state for screens that read the local store. It does not imitate the
 * content: nothing for a short moment, then a centred spinner. The screen keeps its header and
 * subtitle in place, so nothing shifts when the data arrives.
 */
export function ScreenLoading(): JSX.Element {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      className="items-center pt-16 pb-12"
      accessible={visible}
      accessibilityRole="progressbar"
      accessibilityLabel={t("common.loading")}
      accessibilityState={{ busy: true }}
    >
      {visible ? <Spinner /> : null}
    </View>
  );
}

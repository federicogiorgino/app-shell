import type { JSX } from "react";
import { useTranslation } from "react-i18next";

import { ErrorScreen } from "./error-screen";

interface DataErrorProps {
  /** Reads the local store again. */
  onRetry: () => void;
  /** `inline` (default) sits below a screen's header; `screen` fills the screen. */
  layout?: "screen" | "inline";
}

/**
 * The data-read error: "Can't read your data" with Try Again.
 * Every screen that reads the local store shows this one, and so does the root when the
 * database cannot be opened.
 */
export function DataError({ onRetry, layout = "inline" }: DataErrorProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <ErrorScreen
      icon="alert-circle-outline"
      title={t("dataError.title")}
      message={t("dataError.message")}
      actionLabel={t("common.tryAgain")}
      busyLabel={t("dataError.trying")}
      onAction={onRetry}
      layout={layout}
    />
  );
}

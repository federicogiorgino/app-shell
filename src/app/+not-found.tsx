import { ErrorScreen } from "@/components/error-screen";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";

export default function NotFoundScreen(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ErrorScreen
      title={t("errors.pageNotFoundTitle")}
      message={t("errors.pageNotFoundMessage")}
      actionLabel={t("errors.goHome")}
      onAction={() => router.replace("/")}
    />
  );
}

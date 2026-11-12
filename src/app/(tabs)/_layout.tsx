// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { useRouter } from "expo-router";
import { TabList, TabSlot, TabTrigger, Tabs } from "expo-router/ui";
import { useThemeColor } from "heroui-native";
import { useRef, type ComponentProps, type ComponentRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import {
  GlassTabBar,
  GlassTabButton,
  TabBarMinimizeProvider,
  renderFadingTabScreen,
  type GlassTabItem,
} from "@/components/glass-tabs";
import { ContextMenuProvider } from "@/components/context-menu";
import { SheetProvider } from "@/components/sheet-host";
import { ItemSheetProvider, useItemSheet } from "@/features/demo/components/item-sheet";
import { useGlassPalette } from "@/lib/glass";
import { GlassToastProvider } from "@/lib/glass-toast";
import type { Translation } from "@/lib/i18n/en";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * The tabs, in order. Add a tab: a route file in `src/app/(tabs)`, an entry here and its label
 * in the language files. The icon is any Ionicons glyph, tinted by the bar.
 */
const ITEMS: (Pick<GlassTabItem, "name"> & {
  href: string;
  /** A key of the `tabs` group in the language files (adding the string is enough). */
  label: `tabs.${Exclude<keyof Translation["tabs"], "quickAdd">}`;
  icon: IconName;
})[] = [
  { name: "index", href: "/", label: "tabs.home", icon: "home" },
  { name: "components", href: "/components", label: "tabs.components", icon: "grid" },
];

/** The glass tab bar with its action button (quick add). Pushed screens cover it. */
function AppTabBar({ blurTarget }: { blurTarget: RefObject<ComponentRef<typeof View> | null> }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { openAdd } = useItemSheet();
  const [muted, accent, accentForeground] = useThemeColor(["muted", "accent", "accent-foreground"]);
  const glass = useGlassPalette();

  return (
    <TabList asChild>
      <GlassTabBar
        onIndexSelected={(i) => router.navigate(ITEMS[i].href as never)}
        blurTarget={blurTarget}
        action={{
          label: t("tabs.quickAdd"),
          renderIcon: ({ size, tint }) => <Ionicons name="add" size={size} color={tint} />,
          fill: accent,
          tint: accentForeground,
          onPress: openAdd,
        }}
        theme={{ activeTint: accent, inactiveTint: muted, highlight: glass.highlight }}
        haptics
      >
        {ITEMS.map(({ href, ...item }, index) => (
          <TabTrigger key={item.name} name={item.name} href={href as never} asChild>
            <GlassTabButton
              item={{
                name: item.name,
                label: t(item.label),
                renderIcon: ({ tint, size }) => (
                  <Ionicons name={item.icon} size={size} color={tint} />
                ),
              }}
              index={index}
            />
          </TabTrigger>
        ))}
      </GlassTabBar>
    </TabList>
  );
}

export default function AppTabs() {
  const background = useThemeColor("background");
  // Android blurs a snapshot of this target behind the tab bar.
  const blurTarget = useRef<ComponentRef<typeof View>>(null);

  return (
    <TabBarMinimizeProvider>
      {/* The toast, the sheet and the context menu render in place, after the tabs, so their
          glass sees the screen exactly like the tab bar does. */}
      <GlassToastProvider blurTarget={blurTarget}>
        <ItemSheetProvider blurTarget={blurTarget}>
          <ContextMenuProvider blurTarget={blurTarget}>
            <SheetProvider blurTarget={blurTarget}>
              {/* Android back from another tab returns to the first tab before leaving the app. */}
              <Tabs options={{ backBehavior: "firstRoute" }}>
                <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
                  <TabSlot
                    style={{ flex: 1, backgroundColor: background }}
                    renderFn={renderFadingTabScreen}
                  />
                </BlurTargetView>
                <AppTabBar blurTarget={blurTarget} />
              </Tabs>
            </SheetProvider>
          </ContextMenuProvider>
        </ItemSheetProvider>
      </GlassToastProvider>
    </TabBarMinimizeProvider>
  );
}

import { useUniwind } from "uniwind";

/**
 * The glass material values. Glass uses the same blur as
 * the compact header in `LargeTitleScreen`: an expo-blur material at
 * `GLASS_BLUR_INTENSITY`, light or dark with the app theme, under a 10% wash of the background
 * token. The values below have no semantic token, so they live here, once.
 */
export const GLASS_BLUR_INTENSITY = 60;

export interface GlassPalette {
  /** Blur material: light or dark, following the app theme. */
  colorScheme: "light" | "dark";
  /** Opaque tint without blur: Reduce Transparency on, or no blur available. */
  fallback: string;
  /** 0.5 px inner rim that catches the light. */
  rim: string;
  /** 0.5 px outer hairline that keeps light glass visible on light backgrounds. */
  hairline: string;
  /** The tab bar's sliding selection pill; also the pressed state of glass menu items. */
  highlight: string;
  /** Tint over the blurred screen behind the row menu. */
  scrim: string;
}

const LIGHT: GlassPalette = {
  colorScheme: "light",
  fallback: "rgba(250,250,253,0.97)",
  rim: "rgba(255,255,255,0.9)",
  hairline: "rgba(60,60,67,0.14)",
  highlight: "rgba(0,0,0,0.07)",
  scrim: "rgba(10,10,30,0.26)",
};

const DARK: GlassPalette = {
  colorScheme: "dark",
  fallback: "rgba(38,38,43,0.98)",
  rim: "rgba(255,255,255,0.17)",
  hairline: "rgba(255,255,255,0.1)",
  highlight: "rgba(255,255,255,0.14)",
  scrim: "rgba(0,0,0,0.52)",
};

export function glassPalette(theme: string): GlassPalette {
  return theme === "dark" ? DARK : LIGHT;
}

/** The glass values for the current app theme. */
export function useGlassPalette(): GlassPalette {
  return glassPalette(useUniwind().theme);
}

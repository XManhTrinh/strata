/**
 * Strata uses Windmorph's baseline theme only. The server (`getThemeFromCookies`) and the
 * client (`ThemeProvider`) read the same list, so a theme saved in a cookie earlier falls
 * back to baseline, and the display settings hide the theme picker.
 */
export const STRATA_THEMES = ["baseline"] as const;
export const STRATA_DEFAULT_THEME = "baseline";

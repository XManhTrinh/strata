/**
 * Strata uses Windmorph's baseline theme only. The server (`getThemeFromCookies`) and the
 * client (`ThemeProvider`) read the same list, so both render the same theme.
 */
export const STRATA_THEMES = ["baseline"] as const;
export const STRATA_DEFAULT_THEME = "baseline";

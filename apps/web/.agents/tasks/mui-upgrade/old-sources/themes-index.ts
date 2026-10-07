export const themePresets = [
  { name: "Purple", value: "purple", source: "#6750A4", file: null },
  { name: "Blue", value: "blue", source: "#0B57D0", file: "theme-blue.css" },
  { name: "Teal", value: "teal", source: "#006A6A", file: "theme-teal.css" },
  { name: "Green", value: "green", source: "#006C4C", file: "theme-green.css" },
  { name: "Red", value: "red", source: "#B8232A", file: "theme-red.css" },
  { name: "Amber", value: "amber", source: "#795900", file: "theme-amber.css" },
  { name: "Facebook", value: "facebook", source: "#1877F2", file: "theme-facebook.css" },
  { name: "WhatsApp", value: "whatsapp", source: "#25D366", file: "theme-whatsapp.css" },
] as const;

export type ThemePreset = (typeof themePresets)[number]["value"];

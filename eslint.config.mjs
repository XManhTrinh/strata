import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "src/lib/supabase/database.types.ts",
      "supabase/functions/**",
      "supabase/.temp/**",
      "supabase/.branches/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // eslint-config-next already registers the jsx-a11y plugin; turn on its full recommended set.
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    // Email templates are full HTML documents rendered for mail clients, not Next.js pages.
    files: ["src/emails/**/*.tsx"],
    rules: { "@next/next/no-head-element": "off" },
  },
  {
    // All UI text comes from src/messages through next-intl.
    files: ["src/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: false, ignoreProps: true }],
    },
  },
];

export default eslintConfig;

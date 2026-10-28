import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { cookies } from "next/headers";
import { NextRouterProvider, getThemeFromCookies, themeAttributes } from "@windmorph/react/next";
import { STRATA_DEFAULT_THEME, STRATA_THEMES } from "@/lib/theme-config";
import { Providers } from "./providers";
import "material-symbols/rounded.css";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  display: "swap",
  weight: ["100", "300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Strata - Workforce Management Platform",
  description:
    "Enterprise workforce management platform for organizational hierarchies, capacity planning, and team operations.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = getThemeFromCookies(await cookies(), {
    themes: STRATA_THEMES,
    defaults: { theme: STRATA_DEFAULT_THEME, mode: "system" },
  });

  return (
    <html lang="en" suppressHydrationWarning {...themeAttributes(theme)}>
      <body className={roboto.className}>
        <NextRouterProvider>
          <Providers>{children}</Providers>
        </NextRouterProvider>
      </body>
    </html>
  );
}

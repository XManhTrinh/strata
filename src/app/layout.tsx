import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Roboto_Flex } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { NextRouterProvider, getThemeFromCookies, themeAttributes } from "@windmorph/react/next";
import { STRATA_DEFAULT_THEME, STRATA_THEMES } from "@/lib/theme-config";
import { Providers } from "./providers";
import "material-symbols/rounded.css";
import "./globals.css";

const robotoFlex = Roboto_Flex({ subsets: ["latin"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const theme = getThemeFromCookies(await cookies(), {
    themes: STRATA_THEMES,
    defaults: { theme: STRATA_DEFAULT_THEME, mode: "system" },
  });

  return (
    <html lang={locale} suppressHydrationWarning {...themeAttributes(theme)}>
      <body className={`${robotoFlex.className} bg-surface text-on-surface antialiased`}>
        <NextIntlClientProvider>
          <NextRouterProvider>
            <Providers>{children}</Providers>
          </NextRouterProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

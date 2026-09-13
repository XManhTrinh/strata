import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={roboto.className}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}

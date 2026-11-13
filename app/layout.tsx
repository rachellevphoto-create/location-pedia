import "./globals.css";
import { Barlow_Condensed, Karantina } from "next/font/google";
import { getLocale } from "next-intl/server";

// Display font for headings and the logo: tall and narrow, like the
// AQUARELLE wordmark. Barlow Condensed has no Hebrew, so Hebrew letters fall
// through to Karantina (see `font-display` in tailwind.config.ts).
const displayLatin = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display-latin",
  display: "swap",
  // No Arial-based fallback face here: Arial has Hebrew letters, so it
  // would catch Hebrew text before it reaches Karantina.
  adjustFontFallback: false,
});
const displayHebrew = Karantina({
  subsets: ["hebrew"],
  weight: ["700"],
  variable: "--font-display-he",
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir: "rtl" | "ltr" = locale === "he" ? "rtl" : "ltr";
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${displayLatin.variable} ${displayHebrew.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

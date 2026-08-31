import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { OfflineProvider } from "@/components/providers/OfflineProvider";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ServiceWorkerRegistrar } from "@/components/providers/ServiceWorkerRegistrar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Finance — Plan, Spend, Grow",
  description:
    "Your personal financial decision assistant. Plan your money, track reality, and grow with confidence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground transition-colors duration-150">
        <ThemeProvider>
          <OfflineProvider>
            <ServiceWorkerRegistrar />
            <OfflineBanner />
            {children}
          </OfflineProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

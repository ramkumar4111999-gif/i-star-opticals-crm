import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "i Star Opticals — CRM | Sankarankovil",
  description: "Complete Optical Shop CRM for i Star Opticals, Sankarankovil. Manage customers, sales, inventory, prescriptions, lab orders, accounting and more.",
  keywords: ["optical CRM", "eyewear", "i Star Opticals", "Sankarankovil", "optical shop management", "customer management"],
  authors: [{ name: "i Star Opticals" }],
  openGraph: {
    title: "i Star Opticals — CRM",
    description: "Complete Optical Shop CRM for i Star Opticals, Sankarankovil",
    type: "website",
    locale: "en_IN",
    siteName: "i Star Opticals",
  },
  twitter: {
    card: "summary_large_image",
    title: "i Star Opticals — CRM",
    description: "Complete Optical Shop CRM for i Star Opticals, Sankarankovil",
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  scripts: [
    { src: "/i-star-opticals-crm/github-config.js", strategy: "beforeInteractive" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
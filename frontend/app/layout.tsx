import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShortLinks - Professional URL Shortener with Analytics",
  description: "Create short links with advanced analytics. Track clicks, understand your audience, and grow your business. Free plan available with 50 links. Custom domains, QR codes, and powerful insights.",
  keywords: ["url shortener", "link shortener", "short links", "analytics", "qr code", "custom domain", "link tracking", "marketing tools"],
  authors: [{ name: "ShortLinks" }],
  creator: "ShortLinks",
  publisher: "ShortLinks",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "ShortLinks - Professional URL Shortener with Analytics",
    description: "Create short links with advanced analytics. Track clicks, understand your audience, and grow your business.",
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: "ShortLinks",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ShortLinks - URL Shortener",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShortLinks - Professional URL Shortener with Analytics",
    description: "Create short links with advanced analytics. Track clicks, understand your audience, and grow your business.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    // Add other verification codes as needed
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('ui-storage');
                if (savedTheme) {
                  const { state } = JSON.parse(savedTheme);
                  const theme = state.theme || 'system';
                  const root = document.documentElement;
                  root.classList.remove('light', 'dark');

                  if (theme === 'system') {
                    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    root.classList.add(systemTheme);
                  } else {
                    root.classList.add(theme);
                  }
                } else {
                  // Default to system theme if no saved preference
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  root.classList.add(systemTheme);
                }
              } catch (e) {
                // Fallback to light theme on error
                document.documentElement.classList.add('light');
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

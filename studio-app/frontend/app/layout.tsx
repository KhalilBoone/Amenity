import type { Metadata, Viewport } from "next";
import "./globals.css";

/* ── SEO metadata ──────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: {
    default: "Amenity — Meet Liai, your sourcing agent",
    template: "%s | Amenity",
  },
  description:
    "Liai — an AI sourcing agent for fashion and CPG brands. Plus a curated wholesale blanks catalog.",
  keywords: [
    "ai sourcing agent",
    "fabric sourcing",
    "manufacturer matching",
    "wholesale blanks",
    "heavyweight tees",
    "fashion sourcing",
  ],
  metadataBase: new URL("https://amenitystudio.com"),
  openGraph: {
    type: "website",
    siteName: "Amenity",
    title: "Amenity — Meet Liai, your sourcing agent",
    description:
      "Liai — an AI sourcing agent for fashion and CPG brands. Plus a curated wholesale blanks catalog.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Amenity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amenity — Meet Liai, your sourcing agent",
    description:
      "Liai — an AI sourcing agent for fashion and CPG brands. Plus a curated wholesale blanks catalog.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

/* ── Root layout — HTML shell only ─────────────────────────────────────────── */
// SiteHeader + footer live in (marketing)/layout.tsx
// Dashboard sidebar lives in (dashboard)/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

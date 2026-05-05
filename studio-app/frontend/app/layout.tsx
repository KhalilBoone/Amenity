import type { Metadata, Viewport } from "next";
import { Handbag, Scissors, UserCircle } from "@phosphor-icons/react/ssr";
import { SiteHeader } from "@/components/SiteHeader";
import NewsletterSignup from "@/components/NewsletterSignup";
import "./globals.css";

/* ── SEO metadata ──────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: {
    default: "Amenity — Premium Blanks & Custom Production",
    template: "%s | Amenity",
  },
  description:
    "Premium heavyweight blanks and full-package apparel manufacturing for modern brands. No middlemen, no surprises — domestic lead times and transparent pricing.",
  keywords: [
    "wholesale blanks",
    "apparel manufacturing",
    "custom cut and sew",
    "private label clothing",
    "heavyweight tees",
    "full package production",
  ],
  metadataBase: new URL("https://amenitystudio.com"),
  openGraph: {
    type: "website",
    siteName: "Amenity",
    title: "Amenity — Premium Blanks & Custom Production",
    description:
      "Premium heavyweight blanks and full-package apparel manufacturing for modern brands.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Amenity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amenity — Premium Blanks & Custom Production",
    description:
      "Premium heavyweight blanks and full-package apparel manufacturing for modern brands.",
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
  themeColor: "#fafaf9",
};

/* ── Root layout ────────────────────────────────────────────────────────────── */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        {/* ── Analytics placeholder ─────────────────────────────────────────
            Replace the script src with your GA4 / Segment / Plausible snippet.
            Example for GA4:
              <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" />
              <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-XXXXXXXXXX')` }} />
        ─────────────────────────────────────────────────────────────────── */}

        <SiteHeader />
        <div className="min-h-[calc(100vh-72px)]">{children}</div>

        {/* ── Newsletter ─────────────────────────────────────────────────── */}
        <NewsletterSignup />

        <footer className="border-t border-neutral-200 px-6 py-10 text-sm text-neutral-500">
          <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-4 px-4 sm:px-0 md:flex-row md:items-center">
            <p className="font-display text-base text-ink">Amenity</p>
            <div className="flex flex-wrap gap-6 text-xs">
              <a href="/blanks" className="inline-flex items-center gap-1 transition-colors hover:text-ink hover:[text-shadow:0_0_0.6px_currentColor,0_0_0.6px_currentColor]">
                <Handbag size={13} aria-hidden /> Wholesale
              </a>
              <a href="/studio" className="inline-flex items-center gap-1 transition-colors hover:text-ink hover:[text-shadow:0_0_0.6px_currentColor,0_0_0.6px_currentColor]">
                <Scissors size={13} aria-hidden /> Production
              </a>
              <a href="/sign-in" className="inline-flex items-center gap-1 transition-colors hover:text-ink hover:[text-shadow:0_0_0.6px_currentColor,0_0_0.6px_currentColor]">
                <UserCircle size={13} aria-hidden /> Sign in
              </a>
            </div>
            <p className="text-xs">© {new Date().getFullYear()} Amenity. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

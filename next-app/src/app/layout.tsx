import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Amenity Studio — American-Made Garment Production",
  description: "Premium domestic cut & sew, screen printing, embroidery, and full-package production. Built to your exact spec. 100% domestic. 4–6 week lead times.",
  keywords: ["garment production", "cut and sew", "domestic manufacturing", "screen printing", "embroidery", "private label", "USA made apparel", "full package production"],
  openGraph: {
    title: "Amenity Studio — American-Made Garment Production",
    description: "Premium domestic garment production built to your spec. 100% domestic. No middlemen.",
    siteName: "Amenity Studio",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Amenity Studio — American-Made Garment Production",
    description: "Premium domestic garment production built to your spec. 100% domestic.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Performance: preconnect to Firebase */}
        <link rel="preconnect" href="https://firebaseapp.com" />
        <link rel="dns-prefetch" href="https://firebaseapp.com" />
        {/* Analytics placeholder — replace with your GA4 measurement ID */}
        {/* <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" /> */}
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

import { Handbag, UserCircle } from "@phosphor-icons/react/ssr";
import { SiteHeader } from "@/components/SiteHeader";
import NewsletterSignup from "@/components/NewsletterSignup";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <div className="min-h-[calc(100vh-72px)]">{children}</div>

      <NewsletterSignup />

      <footer className="border-t border-neutral-200 px-6 py-10 text-sm text-neutral-500">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-4 px-4 sm:px-0 md:flex-row md:items-center">
          <p className="font-display text-base text-ink">Amenity</p>
          <div className="flex flex-wrap gap-6 text-xs">
            <a
              href="/shop"
              className="inline-flex items-center gap-1 transition-colors hover:text-ink hover:[text-shadow:0_0_0.6px_currentColor,0_0_0.6px_currentColor]"
            >
              <Handbag size={13} aria-hidden /> Shop
            </a>
            <a
              href="/sign-in"
              className="inline-flex items-center gap-1 transition-colors hover:text-ink hover:[text-shadow:0_0_0.6px_currentColor,0_0_0.6px_currentColor]"
            >
              <UserCircle size={13} aria-hidden /> Sign in
            </a>
          </div>
          <p className="text-xs">
            © {new Date().getFullYear()} Amenity. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

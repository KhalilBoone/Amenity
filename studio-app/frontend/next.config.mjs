/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Allow Supabase Storage public URLs.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },

  // Permanent redirects for the routes we moved under /shop. Keeps any
  // bookmarks, external links, prior emails, and Stripe `cancel_url` callbacks
  // pointing at the old paths working.
  async redirects() {
    return [
      // /blanks → /shop/blanks (storefront, PLP, PDP, customize)
      { source: "/blanks", destination: "/shop/blanks", permanent: true },
      { source: "/blanks/:path*", destination: "/shop/blanks/:path*", permanent: true },

      // /cart → /shop/cart
      { source: "/cart", destination: "/shop/cart", permanent: true },

      // /account/orders → /shop/orders
      { source: "/account/orders", destination: "/shop/orders", permanent: true },
      // Future-proof anything else under /account that ends up moving.
      { source: "/account", destination: "/shop", permanent: true },

      // /sourcing is now a full page — old deep-link subpaths fall back to root.
      { source: "/sourcing/:path*", destination: "/sourcing", permanent: false },
    ];
  },
};

export default nextConfig;

# Amenity frontend

Next.js 16 + Tailwind 3 + Supabase JS. Deployed to Vercel.

## Local dev

```bash
npm install
cp ../.env.example .env.local         # then fill in the NEXT_PUBLIC_* vars
npm run dev                           # http://localhost:3000
```

The app talks to the FastAPI backend over `NEXT_PUBLIC_API_URL`.
Default for local dev is `http://localhost:8000`. Run the API with:

```bash
cd ..
uvicorn api.main:app --reload --port 8000
```

## Type-check

```bash
npm run typecheck
```

Strict mode is on; no `any` allowed.

## Deploy → Vercel

Vercel auto-detects Next.js from `package.json`. The included
`vercel.json` pins the framework, region (`iad1` = Washington DC), and
build commands so the deploy is reproducible.

### Required environment variables

Set these in Vercel → Project → Settings → Environment Variables for
all three environments (Production, Preview, Development) unless your
Supabase project differs across them:

| Variable                          | Source                           |
|-----------------------------------|----------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase → Settings → API        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase → Settings → API        |
| `NEXT_PUBLIC_API_URL`             | your Fly.io URL (no trailing /) |

The API URL must NOT have a trailing slash; `lib/api.ts` builds paths
by concatenation.

### After first deploy

1. Add the Vercel production URL to `API_CORS_ORIGINS` on Fly.io.
2. Wire your custom domain (Settings → Domains). Add the apex domain
   to `API_CORS_ORIGINS` too if you use it.
3. In Supabase Auth → URL Configuration, set Site URL to your
   production frontend URL so OAuth redirects work.

## Routes

```
/                                    home — hero + Blanks/Studio + services
/blanks                              storefront landing
/blanks/category/[name]              PLP — tees / hoodies / sweats
/blanks/[slug]                       PDP — variant picker + stacked CTAs
/blanks/[slug]/customize             customize — upload, placement, technique
/cart                                cart + address picker → checkout
/orders/[id]/success                 Stripe redirect target
/studio                              Studio landing
/studio/quote                        RFQ form
/studio/quote/[id]/submitted         RFQ confirmation
/sign-in                             Google OAuth
/account/orders                      combined order list
```

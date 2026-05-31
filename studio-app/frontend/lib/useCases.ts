/**
 * Static use-case data — consumed by:
 *   - SiteHeader Use Cases megamenu
 *   - /use-cases/[slug] dynamic landing pages
 */

export interface UseCase {
  slug:     string;
  label:    string;         // short nav label
  headline: string;        // hero h1
  sub:      string;        // hero subtitle
  hero:     string;        // hero description paragraph
  /** Which Amenity products this use case leans on */
  products: ("liai" | "blanks")[];
  pain:     string[];      // 3 pain-point bullets
  outcomes: { title: string; body: string }[];  // 3–4 feature cards
  cta:      { label: string; href: string };
}

export interface UseCaseCategory {
  label:     string;
  useCases:  UseCase[];
}

export const USE_CASE_CATEGORIES: UseCaseCategory[] = [
  // ─── Fashion & Apparel ──────────────────────────────────────────────────────
  {
    label: "Fashion & Apparel",
    useCases: [
      {
        slug:     "dtc-apparel-brands",
        label:    "DTC Apparel Brands",
        headline: "Launch faster. Source smarter.",
        sub:      "For direct-to-consumer apparel brands",
        hero:     "Building a DTC apparel brand means juggling sourcing, product development, and a growing catalog — all at once. Amenity gives you an AI sourcing agent to find manufacturers in minutes and a wholesale channel to move inventory.",
        products: ["liai", "blanks"],
        pain:     [
          "Sourcing takes weeks of cold outreach with no guarantee of fit",
          "Minimum order quantities lock you out of the factories you actually want",
          "No structured system for tracking samples, revisions, or launch stages",
        ],
        outcomes: [
          { title: "Find manufacturers instantly", body: "Describe your product to Liai and get a ranked shortlist of vetted manufacturers matched on capability, MOQ, and lead time." },
          { title: "Small-batch to full production", body: "Filter Liai results by MOQ so you only see factories that work with your run size — from initial drops to scaled production." },
          { title: "Capability-precise matching", body: "Cut & sew, knitwear, wovens, activewear — Liai extracts your technical requirements and matches them to the right manufacturing specialty." },
          { title: "Blanks while you sample", body: "Order from Amenity Blanks to get product in customers' hands while your custom manufacturing is in the sampling phase." },
        ],
        cta: { label: "Start a sourcing brief", href: "/sourcing" },
      },
      {
        slug:     "streetwear-labels",
        label:    "Streetwear & Lifestyle",
        headline: "Build your label without the agency markup.",
        sub:      "For streetwear and lifestyle labels",
        hero:     "Streetwear moves fast. Drops need to be sourced, sampled, and launched on tight timelines. Liai finds the cut-and-sew shops that can move at your speed — no middleman, no agency fee.",
        products: ["liai", "blanks"],
        pain:     [
          "Limited production runs require manufacturers who work at small MOQs",
          "Drop cycles are short — you can't spend weeks finding a factory",
          "Colorways, sizes, and graphics across drops get disorganized fast",
        ],
        outcomes: [
          { title: "Small-batch manufacturing", body: "Filter Liai results by MOQ so you only see factories that will work with your drop quantities — no wasted conversations." },
          { title: "Speed from brief to shortlist", body: "Go from product idea to a ranked list of matched manufacturers in minutes, not weeks of cold email." },
          { title: "Drop-ready blanks", body: "Browse Amenity Blanks for heavyweight tees, fleece, and headwear to customize with your graphics while sourcing custom styles." },
          { title: "Decorator matching", body: "Tell Liai your decoration method — screen print, embroidery, DTG — and it surfaces studios with the right equipment and minimums." },
        ],
        cta: { label: "Try Liai free", href: "/sourcing" },
      },
      {
        slug:     "athleisure-activewear",
        label:    "Athleisure & Activewear",
        headline: "Performance product needs performance sourcing.",
        sub:      "For athleisure and activewear brands",
        hero:     "Activewear demands specific technical fabrics, certifications, and suppliers who understand performance construction. Liai knows the difference between a moisture-wicking jersey and a 4-way stretch bonded shell — and can find who makes them.",
        products: ["liai", "blanks"],
        pain:     [
          "Technical fabric suppliers are hard to find through generic directories",
          "Certification requirements (OEKO-TEX, bluesign) narrow the field significantly",
          "Fit and construction specs need to be precisely communicated to manufacturers",
        ],
        outcomes: [
          { title: "Technical capability matching", body: "Tell Liai the fabric construction, stretch specs, and certifications you need. It surfaces manufacturers with those exact capabilities." },
          { title: "Certification-aware sourcing", body: "Filter by sustainability certifications, fabric standards, and compliance requirements — built into every search." },
          { title: "Performance blanks", body: "Browse Amenity Blanks for performance base layers to test fits and trims while your custom production is in sampling." },
          { title: "Geographic flexibility", body: "Liai filters by country and region — find domestic performance manufacturers or source from Portugal, South Korea, and Taiwan for specialist fabrics." },
        ],
        cta: { label: "Find technical manufacturers", href: "/sourcing" },
      },
      {
        slug:     "luxury-premium-goods",
        label:    "Luxury & Premium Goods",
        headline: "Tier-one sourcing for tier-one product.",
        sub:      "For luxury and premium product brands",
        hero:     "Luxury is uncompromising. Every material, every maker, every detail has to meet the bar. Liai sources from a vetted network of premium manufacturers — Italy, Portugal, Japan — so you're only spending time with the right factories.",
        products: ["liai"],
        pain:     [
          "Premium manufacturers don't surface in standard directories",
          "Cold outreach to unvetted factories wastes months of development time",
          "Geographic and material requirements narrow the pool — generic searches don't help",
        ],
        outcomes: [
          { title: "Vetted premium network", body: "Every manufacturer in Liai's network has been reviewed for capability and reliability. No cold outreach to unvetted factories." },
          { title: "Country and region filtering", body: "Specify Made in Italy, Made in Portugal, or any designated country of origin — Liai narrows the shortlist accordingly." },
          { title: "Material capability matching", body: "Describe your leather grade, fabric weight, construction method, or hardware spec — Liai surfaces manufacturers with those exact capabilities." },
          { title: "Certification and provenance", body: "Filter for manufacturers carrying specific certifications or with verifiable provenance documentation for premium retail." },
        ],
        cta: { label: "Start sourcing", href: "/sourcing" },
      },
    ],
  },

  // ─── Consumer Goods ─────────────────────────────────────────────────────────
  {
    label: "Consumer Goods",
    useCases: [
      {
        slug:     "cpg-brands",
        label:    "CPG Brands",
        headline: "From brief to shelf-ready product.",
        sub:      "For consumer packaged goods brands",
        hero:     "CPG brands face a sourcing problem at scale. Manufacturers, co-packers, contract producers — finding the right partner with the right certifications is half the battle. Liai searches the verified network so you spend time evaluating partners, not finding them.",
        products: ["liai"],
        pain:     [
          "Finding co-packers and contract manufacturers with the right certifications is time-consuming",
          "Regulatory requirements (certifications, standards) vary by product category",
          "Managing manufacturer searches across multiple SKUs and categories is hard to keep consistent",
        ],
        outcomes: [
          { title: "Co-packer & manufacturer matching", body: "Liai searches the network for manufacturers and co-packers with the specific certifications and capabilities your product requires." },
          { title: "Certification-first filtering", body: "Specify regulatory certifications upfront — WRAP, SA8000, OEKO-TEX — and Liai only surfaces compliant manufacturers." },
          { title: "Consistent brief format", body: "Every sourcing request runs through the same Liai interface — consistent results regardless of which team member writes the brief." },
          { title: "Geographic sourcing flexibility", body: "Source domestically for compliance, or identify international partners for cost efficiency — Liai handles both in the same search." },
        ],
        cta: { label: "Find manufacturing partners", href: "/sourcing" },
      },
      {
        slug:     "accessories-jewelry",
        label:    "Accessories & Jewelry",
        headline: "Find the makers behind the materials.",
        sub:      "For accessories and jewelry brands",
        hero:     "Accessories and jewelry depend on specialized craftspeople — metalworkers, leather goods artisans, gem setters. Liai finds niche manufacturers in these categories that don't show up in generic sourcing databases.",
        products: ["liai", "blanks"],
        pain:     [
          "Specialty makers are hard to find — they rarely have strong web presences",
          "Material and hardware sourcing is separate from finished goods manufacturing",
          "Niche manufacturing requirements (metalwork, leather craft) require specialist matching",
        ],
        outcomes: [
          { title: "Specialty maker matching", body: "Liai finds artisan manufacturers, metalworkers, and leather goods makers who match your exact production requirements and aesthetics." },
          { title: "Material-level search", body: "Describe metal type, stone grade, leather origin, or hardware finish — Liai uses it to find the right specialist." },
          { title: "MOQ-aware results", body: "Accessories often run small. Filter Liai results by minimum order to surface makers who work at your production scale." },
          { title: "Blanks for accessories", body: "Explore Amenity Blanks for bags, hats, and accessories to customize — ideal for testing market response before custom production." },
        ],
        cta: { label: "Find specialty makers", href: "/sourcing" },
      },
    ],
  },

  // ─── Business Types ──────────────────────────────────────────────────────────
  {
    label: "Business Types",
    useCases: [
      {
        slug:     "bootstrapped-founders",
        label:    "Bootstrapped Founders",
        headline: "Move like a big brand. Without the headcount.",
        sub:      "For solo founders and early-stage product brands",
        hero:     "When it's just you, every hour matters. Liai replaces weeks of sourcing research with a single brief. And Blanks gives you inventory to test with while custom manufacturing catches up.",
        products: ["liai", "blanks"],
        pain:     [
          "Sourcing research eats weeks you don't have at the early stage",
          "Minimum order quantities lock you out of the factories you actually want",
          "No time to vet manufacturers individually — you need reliable results fast",
        ],
        outcomes: [
          { title: "From idea to manufacturer in minutes", body: "Type your product brief into Liai. Get a ranked shortlist of manufacturers who match your specs, MOQ, and timeline — no cold calls." },
          { title: "Low-MOQ sourcing", body: "Filter Liai results for manufacturers who work with small-batch orders — so you can validate demand before committing to large runs." },
          { title: "Vetted network", body: "Every manufacturer in Liai's network has been reviewed before appearing in results. No time wasted on factories that can't deliver." },
          { title: "Blanks to move fast", body: "Order from Amenity Blanks to get product in customers' hands while your custom manufacturing is in sampling." },
        ],
        cta: { label: "Start for free", href: "/sourcing" },
      },
      {
        slug:     "design-studios",
        label:    "Design Studios & Agencies",
        headline: "Source and deliver for every client.",
        sub:      "For design studios and product agencies",
        hero:     "Agencies and studios produce across categories — apparel, accessories, home goods, lifestyle. Liai gives you a sourcing agent you can run for every client brief, with consistent results across every engagement.",
        products: ["liai"],
        pain:     [
          "Each client brief requires fresh sourcing research from scratch",
          "Sourcing quality varies by team member — no consistent methodology",
          "Managing manufacturer searches across multiple client accounts is time-intensive",
        ],
        outcomes: [
          { title: "Per-client sourcing briefs", body: "Run a Liai brief for each client engagement. Get consistent, ranked manufacturer shortlists regardless of category or geography." },
          { title: "Multi-category capability", body: "Liai covers apparel, footwear, accessories, and more — one tool across every client vertical your studio works in." },
          { title: "Certification awareness", body: "For clients with compliance requirements, Liai filters by certification automatically — no manual vetting needed." },
          { title: "Faster turnaround", body: "Replace days of research with a brief that takes minutes. Deliver manufacturer shortlists to clients as part of your process." },
        ],
        cta: { label: "Run a brief", href: "/sourcing" },
      },
      {
        slug:     "wholesale-private-label",
        label:    "Wholesale & Private Label",
        headline: "Your brand on the right blank.",
        sub:      "For wholesale and private label businesses",
        hero:     "Private label starts with finding the right base product and the right manufacturer to customize it. Liai finds decoration and private label partners. Blanks gives you premium bases to work from.",
        products: ["liai", "blanks"],
        pain:     [
          "Finding decoration partners (embroidery, screen print, DTG) with the right capabilities takes time",
          "Private label MOQs vary wildly — you need to know before you reach out",
          "Sourcing the right blank and the right decorator separately doubles the research work",
        ],
        outcomes: [
          { title: "Decoration partner matching", body: "Tell Liai your decoration method — screen print, embroidery, DTG, heat transfer — and it surfaces studios with the right equipment and minimums." },
          { title: "Blanks to start from", body: "Browse Amenity Blanks for the base garments your private label clients want to brand. Order wholesale direct." },
          { title: "MOQ-filtered results", body: "Liai shows you manufacturers and decorators who can work within your order quantities — no surprises when you reach out." },
          { title: "Full-package sourcing", body: "Find manufacturers who handle both the blank and the decoration, reducing your vendor count and production complexity." },
        ],
        cta: { label: "Browse wholesale blanks", href: "/shop" },
      },
      {
        slug:     "government-agencies",
        label:    "Government Agencies",
        headline: "Federal procurement without the sourcing bottleneck.",
        sub:      "For federal, state, and local government agencies",
        hero:     "Government agencies procuring apparel and footwear face strict compliance requirements — Berry Amendment, TAA, Buy American — on top of standard sourcing challenges. Liai filters by certification automatically, so your shortlist only includes compliant suppliers.",
        products: ["liai"],
        pain:     [
          "Berry and TAA compliance requirements must be verified for every supplier",
          "Domestic manufacturer networks are hard to navigate without a specialist",
          "Procurement timelines are tight — manual sourcing research is a bottleneck",
        ],
        outcomes: [
          { title: "Compliance filtering built in", body: "Specify Berry Amendment, TAA, or Buy American requirements in your brief. Liai automatically excludes non-compliant manufacturers from your shortlist." },
          { title: "Domestic-first results", body: "Filter the manufacturer network to domestic suppliers only — Liai returns only US-based partners capable of meeting federal procurement requirements." },
          { title: "NAICS and PSC coverage", body: "The Amenity network covers NAICS 315 (apparel), 316 (footwear), 314 (textile mills), and the full range of 84xx PSC codes for clothing and individual equipment." },
          { title: "Brief in plain language", body: "Describe your solicitation requirements in plain English — category, quantity, certifications, delivery window. Liai extracts the structure and returns qualified suppliers." },
        ],
        cta: { label: "Start a compliant brief", href: "/sourcing" },
      },
      {
        slug:     "uniform-workwear-suppliers",
        label:    "Uniform & Workwear Suppliers",
        headline: "Scale uniform programs with reliable manufacturing.",
        sub:      "For uniform suppliers, workwear brands, and fleet buyers",
        hero:     "Uniform programs demand consistency, durability, and compliance — at volume. Liai finds manufacturers who specialize in uniform-grade production, workwear construction, and the certifications required by institutional buyers.",
        products: ["liai", "blanks"],
        pain:     [
          "Uniform-grade manufacturing requires different suppliers than fashion apparel",
          "Institutional buyers demand specific certifications and domestic production",
          "High-volume programs need manufacturers with proven capacity and reliability",
        ],
        outcomes: [
          { title: "Uniform-specialist matching", body: "Liai filters the network for manufacturers with uniform, workwear, and institutional apparel experience — not fashion-focused factories." },
          { title: "High-volume capacity", body: "Specify your program volume in the brief. Liai surfaces only manufacturers with the capacity and lead times to fulfill at scale." },
          { title: "Compliance and certification", body: "Federal and institutional buyers often require Berry, TAA, or OEKO-TEX compliance. Liai filters by these certifications automatically." },
          { title: "Blanks for program stocking", body: "Order from Amenity Blanks for in-stock program basics — polos, tees, workwear bottoms — while custom styles are in production." },
        ],
        cta: { label: "Find uniform manufacturers", href: "/sourcing" },
      },
    ],
  },

  // ─── Teams & Roles ───────────────────────────────────────────────────────────
  {
    label: "Teams & Roles",
    useCases: [
      {
        slug:     "sourcing-teams",
        label:    "Sourcing Teams",
        headline: "Cut sourcing cycles in half.",
        sub:      "For sourcing and procurement teams",
        hero:     "Sourcing teams spend too much time building manufacturer lists from scratch. Liai turns a product brief into a ranked, vetted shortlist in minutes — so your team can spend time evaluating partners, not finding them.",
        products: ["liai"],
        pain:     [
          "Building a qualified manufacturer list takes days of research per category",
          "Vetting manufacturers for certifications and capabilities is manual and inconsistent",
          "Brief quality varies by team member, leading to inconsistent sourcing results",
        ],
        outcomes: [
          { title: "Instant ranked shortlists", body: "Write a brief in plain English. Liai searches the verified manufacturer network and returns a ranked shortlist in under a minute." },
          { title: "Capability and certification filtering", body: "Liai automatically surfaces manufacturers that match your technical requirements, certifications, and geographic preferences." },
          { title: "Consistent brief format", body: "Every team member submits briefs through the same interface — Liai standardizes how your sourcing requests are interpreted and matched." },
          { title: "Lead time and MOQ awareness", body: "Tell Liai your timeline and minimum order quantity. It filters the shortlist to only show manufacturers who can meet your constraints." },
        ],
        cta: { label: "Run a sourcing brief", href: "/sourcing" },
      },
      {
        slug:     "product-development",
        label:    "Product Development Teams",
        headline: "Find the right factory for every brief.",
        sub:      "For product development and design teams",
        hero:     "Product development teams work across categories and specs. Liai gives your team a sourcing tool precise enough to match a technical brief — so you spend time building relationships with the right manufacturers, not researching them.",
        products: ["liai", "blanks"],
        pain:     [
          "Each new product category requires sourcing from scratch",
          "Technical specs need to reach the right manufacturing specialist — generic searches miss the mark",
          "Sampling timelines are tight — finding a new factory mid-development derails the schedule",
        ],
        outcomes: [
          { title: "Brief-level precision", body: "Describe your technical requirements — construction method, fabric type, trims, certifications. Liai matches at the spec level, not just the category level." },
          { title: "Fast pivots", body: "When a spec change requires a new supplier, run a new brief in minutes. No wasted cycles researching from scratch." },
          { title: "Geographic flexibility", body: "Specify the region that fits your development calendar — domestic for speed, international for specialty. Liai handles both in the same interface." },
          { title: "Blanks for fast sampling", body: "Use Amenity Blanks to test fits and trims while your custom manufacturing partner is being confirmed." },
        ],
        cta: { label: "Start a brief", href: "/sourcing" },
      },
    ],
  },
];

/** Flat list of all use cases for lookup by slug */
export const ALL_USE_CASES: UseCase[] = USE_CASE_CATEGORIES.flatMap(
  (cat) => cat.useCases
);

export function getUseCase(slug: string): UseCase | undefined {
  return ALL_USE_CASES.find((uc) => uc.slug === slug);
}

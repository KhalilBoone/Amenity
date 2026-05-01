// Shared types — mirror supabase/schema.sql.
// Update both files together when columns change.

// ----------------------------------------------------------------
// Enums
// ----------------------------------------------------------------
export type OrderStatus =
  | "intake"
  | "compliance"
  | "routing"
  | "fulfillment"
  | "qa"
  | "shipped"
  | "invoiced"
  | "closed"
  | "cancelled";

export type BidStatus =
  | "discovered"
  | "scored"
  | "drafted"
  | "submitted"
  | "won"
  | "lost"
  | "skipped";

export type OrderType = "studio" | "blanks";

export type SourcingType = "dropship" | "private_label";

export type ProductStatus = "draft" | "active" | "archived";

export type FulfillmentStatus =
  | "pending"
  | "forwarded"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled";

export type CartStatus = "open" | "checked_out" | "abandoned";

export type DecorationTechnique = "screen_print" | "embroidery" | "dtg";

export type ArtworkPlacement =
  | "front_chest"
  | "front_full"
  | "back_full"
  | "back_yoke"
  | "left_sleeve"
  | "right_sleeve"
  | "neck_label"
  | "hood";

export type ArtworkStatus = "pending" | "uploaded" | "flagged" | "archived";

// ----------------------------------------------------------------
// Partners + brands
// ----------------------------------------------------------------
export interface Manufacturer {
  id: string;
  name: string;
  role: "manufacturer" | "supplier" | "printer" | "agent" | "broker";
  category: string | null;
  specialty: string | null;
  capabilities: string[];
  brands: string[];
  certifications: string[];
  moq: number | null;
  lead_time_weeks: number | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location: string | null;
  domestic: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  owner_uid: string | null;
  name: string;
  contact_email: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

// ----------------------------------------------------------------
// Orders (Studio + Blanks share this table; columns differ per type)
// ----------------------------------------------------------------
export interface Order {
  id: string;
  brand_id: string | null;
  user_id: string | null;
  order_type: OrderType;
  status: OrderStatus;
  // Studio-specific
  product_type: string | null;
  quantity: number | null;
  target_price: number | null;
  due_date: string | null;
  spec: Record<string, unknown>;
  compliance: Record<string, unknown>;
  manufacturer_id: string | null;
  routing_score: number | null;
  routing_reasons: unknown;
  po_number: string | null;
  qa_results: Record<string, unknown> | null;
  qa_passed: boolean | null;
  // Blanks-specific
  shipping_address_id: string | null;
  subtotal: number | null;
  shipping_cost: number | null;
  tax: number | null;
  total: number | null;
  currency: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  // Audit
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------
// Blanks e-commerce
// ----------------------------------------------------------------
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brand: string;
  sourcing: SourcingType;
  supplier_id: string | null;
  category: string | null;
  hero_image_url: string | null;
  images: string[];
  base_price: number;
  wholesale_cost: number | null;
  attributes: Record<string, unknown>;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  wholesale_cost: number | null;
  inventory_count: number | null;
  tracks_inventory: boolean;
  hero_image_url: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  id: string;
  user_id: string | null;
  full_name: string | null;
  company: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  status: CartStatus;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  customization: Customization | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  customization: Customization | null;
  printer_id: string | null;
  fulfillment_status: FulfillmentStatus;
  tracking_number: string | null;
  carrier: string | null;
  forwarded_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
}

// ----------------------------------------------------------------
// Supply Co. side
// ----------------------------------------------------------------
export interface Bid {
  id: string;
  solicitation: string;
  title: string | null;
  agency: string | null;
  naics: string | null;
  psc: string | null;
  posted_at: string | null;
  response_due: string | null;
  url: string | null;
  status: BidStatus;
  score: number | null;
  score_reasons: unknown;
  draft_text: string | null;
  submitted_at: string | null;
  outcome: string | null;
  raw: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CommsLog {
  id: string;
  order_id: string | null;
  bid_id: string | null;
  channel: "email" | "sms" | "in_app";
  direction: "outbound" | "inbound";
  to_addr: string | null;
  from_addr: string | null;
  subject: string | null;
  body: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  stripe_id: string | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

// ----------------------------------------------------------------
// Convenience: API request/response shapes
// ----------------------------------------------------------------
export interface ChatRequest {
  message: string;
  brand_id?: string | null;
}

export interface CapabilityCard {
  manufacturer_id: string;
  name: string;
  score: number;
  reasons: string[];
}

// Hydrated cart shape returned by /cart endpoints (cart + items + product info).
export interface CartLine extends CartItem {
  variant: ProductVariant;
  product: Pick<Product, "id" | "slug" | "name" | "hero_image_url" | "brand">;
}

export interface HydratedCart extends Cart {
  items: CartLine[];
  subtotal: number;
}

// ----------------------------------------------------------------
// Customization
// ----------------------------------------------------------------
export interface ArtworkUpload {
  id: string;
  user_id: string;
  file_path: string;
  original_filename: string | null;
  mime: string | null;
  size_bytes: number | null;
  width_px: number | null;
  height_px: number | null;
  status: ArtworkStatus;
  notes: string | null;
  created_at: string;
}

export interface CustomizationPricing {
  id: string;
  technique: DecorationTechnique;
  min_quantity: number;
  max_quantity: number | null;
  setup_fee: number;     // per color (screen) / per design (embroidery, dtg)
  unit_cost: number;     // per piece
  notes: string | null;
  active: boolean;
  created_at: string;
}

/** Customization payload stored on cart_items.customization / order_items.customization. */
export interface Customization {
  artwork_id: string;
  placement: ArtworkPlacement;
  technique: DecorationTechnique;
  colors?: number;             // ink colors (screen print)
  ink_colors?: string[];       // visual swatches
  size_in?: { w: number; h: number };
  setup_fee: number;           // snapshot at add-time
  unit_cost: number;           // snapshot at add-time
}

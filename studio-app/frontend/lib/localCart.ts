/**
 * localStorage-based cart.
 * Used as fallback when the API is unavailable or the user is not signed in.
 * The cart page reads this when the API cart cannot be loaded.
 */

export interface LocalCartItem {
  id: string;
  slug: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  name: string;
  brand: string;
  size?: string | null;
  color?: string | null;
  hero_image_url?: string | null;
  customization?: {
    placement: string;
    technique: string;
    colors?: number;
    setup_fee: number;
    unit_cost: number;
  } | null;
  added_at: string;
}

const KEY = "amenity_cart";

function read(): LocalCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as LocalCartItem[];
  } catch {
    return [];
  }
}

function write(items: LocalCartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  // Notify the header (and any other listener) so the bag badge updates instantly
  window.dispatchEvent(new CustomEvent("localcart:updated"));
}

export function getLocalCart(): LocalCartItem[] {
  return read();
}

export function addToLocalCart(item: Omit<LocalCartItem, "id" | "added_at">) {
  const items = read();
  // Merge if same variant + same customisation key
  const key = item.variant_id + (item.customization?.placement ?? "");
  const existing = items.findIndex(
    (i) => i.variant_id === item.variant_id &&
           (i.customization?.placement ?? "") === (item.customization?.placement ?? "")
  );
  if (existing >= 0) {
    items[existing].quantity += item.quantity;
  } else {
    items.push({ ...item, id: crypto.randomUUID(), added_at: new Date().toISOString() });
  }
  write(items);
}

export function removeFromLocalCart(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function updateLocalCartQty(id: string, quantity: number) {
  write(read().map((i) => i.id === id ? { ...i, quantity } : i));
}

export function clearLocalCart() {
  write([]);
}

export function localCartSubtotal(): number {
  return read().reduce((s, i) => s + i.unit_price * i.quantity, 0);
}

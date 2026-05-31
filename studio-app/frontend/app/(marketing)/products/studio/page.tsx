import { redirect } from "next/navigation";

/**
 * /products/studio is no longer a public marketing page.
 * The PIM is the internal backend for the shop — redirect to the shop.
 */
export default function StudioPage() {
  redirect("/shop");
}

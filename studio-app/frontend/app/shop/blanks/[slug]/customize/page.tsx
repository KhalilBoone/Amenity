"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  MagnifyingGlassPlus, MagnifyingGlassMinus, Trash, FloppyDisk,
  FolderOpen, DownloadSimple, Eye, ArrowLeft, TextT, UploadSimple,
  Image, SquaresFour, ArrowCounterClockwise, X, Check,
} from "@phosphor-icons/react";
import { apiGet, apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { computeCustomPrice } from "@/lib/pricing";
import { addToLocalCart } from "@/lib/localCart";
import type {
  ArtworkPlacement, ArtworkUpload, CustomizationPricing,
  DecorationTechnique, Product, ProductVariant,
} from "@/types";

type ProductDetail = Product & { product_variants: ProductVariant[] };

/* ── Design element ── */
type EKind = "image" | "text" | "shape";
interface DesignEl {
  id: string; kind: EKind;
  // image
  src?: string;
  // text
  text?: string; fontSize?: number; fontColor?: string; fontWeight?: string;
  // shape
  shape?: "circle" | "star" | "square";
  shapeColor?: string;
  // position + size as % of the print-zone div
  x: number; y: number; w: number; h: number;
}

/*
 * Print-zone positions as % of the 520×580 mockup container.
 * Calibrated to sit over the GarmentOutline SVG body below.
 * Body runs ~x:105–415 (58% wide centred) / ~y:200–545 (body starts at ~34%)
 * Chest centre is approx y:210–340, x:155–365
 */
const ZONES: Record<ArtworkPlacement, { top:number; left:number; width:number; height:number }> = {
  front_chest: { top:37, left:30, width:40, height:24 },
  front_full:  { top:35, left:22, width:56, height:52 },
  back_full:   { top:35, left:22, width:56, height:52 },
  back_yoke:   { top:35, left:30, width:40, height:16 },
  left_sleeve: { top:26, left:8,  width:18, height:22 },
  right_sleeve:{ top:26, left:74, width:18, height:22 },
  neck_label:  { top:22, left:38, width:24, height:10 },
  hood:        { top:8,  left:30, width:40, height:18 },
};

/* ── Clipart library ── */
const CLIPART = [
  { id:"star",    label:"Star",    shape:"star"   as const },
  { id:"circle",  label:"Circle",  shape:"circle" as const },
  { id:"square",  label:"Square",  shape:"square" as const },
];

/* ── Colour name → hex for variant swatches ── */
const COLOR_HEX: Record<string,string> = {
  black:"#1a1a1a", white:"#f5f5f5", stone:"#d4cec5", slate:"#64748b",
  olive:"#4a6741", navy:"#1e3a5f", brown:"#8b7355", grey:"#9ca3af",
  gray:"#9ca3af", cream:"#f5f0e8", tan:"#c9b99a", charcoal:"#374151",
};
const colorHex = (n:string) => COLOR_HEX[n.toLowerCase()] ?? "#d4d4d4";

/* ── Right-panel tabs ── */
type Panel = "variants" | "upload" | "clipart" | "text" | "preview";

const PANEL_TABS: { id: Panel; icon: React.ReactNode; label: string }[] = [
  { id:"variants", icon:<SquaresFour size={18}/>,    label:"Variants"         },
  { id:"upload",   icon:<UploadSimple size={18}/>,  label:"Upload"           },
  { id:"clipart",  icon:<Image size={18}/>,          label:"Clipart & Images" },
  { id:"text",     icon:<TextT size={18}/>,          label:"Add text"         },
  { id:"preview",  icon:<Eye size={18}/>,            label:"Preview"          },
];

/* ── Shape SVG ── */
function ShapeSVG({ shape, color="#1a1a1a", size=40 }: { shape:string; color?:string; size?:number }) {
  if (shape === "circle") return (
    <svg width={size} height={size} viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill={color}/></svg>
  );
  if (shape === "star") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <polygon points="20,2 25,14 38,14 28,22 32,35 20,27 8,35 12,22 2,14 15,14" fill={color}/>
    </svg>
  );
  return <svg width={size} height={size} viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" fill={color}/></svg>;
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function CustomizePage() {
  const { slug } = useParams<{ slug:string }>();
  const params   = useSearchParams();
  const router   = useRouter();

  const initialVariantId = params.get("variant");
  const initialQty  = parseInt(params.get("qty") ?? "12", 10);
  // Product info passed from PDP so canvas loads the real blank immediately
  const paramImg    = params.get("img")   ?? "";
  const paramColor  = params.get("color") ?? "";
  const paramName   = params.get("name")  ?? "";
  const paramPrice  = parseFloat(params.get("price") ?? "0");

  /* ── Product + pricing ── */
  const [product,      setProduct]      = useState<ProductDetail | null>(null);
  const [pricingRules, setPricingRules] = useState<CustomizationPricing[]>([]);

  /* ── Selections ── */
  const [variantId,  setVariantId]  = useState<string | null>(initialVariantId);
  const [quantity,   setQuantity]   = useState(Number.isFinite(initialQty) && initialQty > 0 ? initialQty : 12);
  const [technique,  setTechnique]  = useState<DecorationTechnique>("screen_print");
  const [inkColors,  setInkColors]  = useState(1);
  const [placement,  setPlacement]  = useState<ArtworkPlacement>("front_chest");

  /* ── Canvas state ── */
  const [elements,   setElements]   = useState<DesignEl[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom,       setZoom]       = useState(1);
  const [preview,    setPreview]    = useState(false);

  /* ── Right panel ── */
  const [panel, setPanel] = useState<Panel>("variants");

  /* ── Text form ── */
  const [textInput,    setTextInput]    = useState("Your text here");
  const [textSize,     setTextSize]     = useState(24);
  const [textColor,    setTextColor]    = useState("#1a1a1a");
  const [textBold,     setTextBold]     = useState(false);

  /* ── Upload ── */
  const [artwork,      setArtwork]      = useState<ArtworkUpload | null>(null);
  const [uploadError,  setUploadError]  = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  /* ── Drag state ── */
  const dragging = useRef<{ id:string; ox:number; oy:number; startX:number; startY:number } | null>(null);
  const zoneRef  = useRef<HTMLDivElement>(null);

  /* ── Placeholder product used when API is unavailable ── */
  const PLACEHOLDER_PRODUCT: ProductDetail = useMemo(() => ({
    id:"placeholder", slug,
    name: paramName || slug.replace(/-/g," ").replace(/\b\w/g,(c)=>c.toUpperCase()),
    description:"Premium heavyweight blank ready for customization.",
    brand:"Amenity Blanks", sourcing:"dropship", supplier_id:null,
    category:"Tees & Tops", hero_image_url: paramImg || null, images:[], base_price: paramPrice || 22,
    wholesale_cost:null, attributes:{ weight:"400gsm", fit:"Relaxed" },
    status:"active", created_at:"", updated_at:"",
    product_variants:[
      { id:"v-s-blk",  product_id:"p", sku:"S-BLK",  size:"S",  color:"Black", price:22, wholesale_cost:null, inventory_count:50, tracks_inventory:false, hero_image_url:null, position:1, created_at:"", updated_at:"" },
      { id:"v-m-blk",  product_id:"p", sku:"M-BLK",  size:"M",  color:"Black", price:22, wholesale_cost:null, inventory_count:80, tracks_inventory:false, hero_image_url:null, position:2, created_at:"", updated_at:"" },
      { id:"v-l-blk",  product_id:"p", sku:"L-BLK",  size:"L",  color:"Black", price:22, wholesale_cost:null, inventory_count:60, tracks_inventory:false, hero_image_url:null, position:3, created_at:"", updated_at:"" },
      { id:"v-xl-blk", product_id:"p", sku:"XL-BLK", size:"XL", color:"Black", price:22, wholesale_cost:null, inventory_count:40, tracks_inventory:false, hero_image_url:null, position:4, created_at:"", updated_at:"" },
      { id:"v-s-sto",  product_id:"p", sku:"S-STO",  size:"S",  color:"Stone", price:22, wholesale_cost:null, inventory_count:45, tracks_inventory:false, hero_image_url:null, position:5, created_at:"", updated_at:"" },
      { id:"v-m-sto",  product_id:"p", sku:"M-STO",  size:"M",  color:"Stone", price:22, wholesale_cost:null, inventory_count:70, tracks_inventory:false, hero_image_url:null, position:6, created_at:"", updated_at:"" },
      { id:"v-l-sto",  product_id:"p", sku:"L-STO",  size:"L",  color:"Stone", price:22, wholesale_cost:null, inventory_count:55, tracks_inventory:false, hero_image_url:null, position:7, created_at:"", updated_at:"" },
      { id:"v-s-olv",  product_id:"p", sku:"S-OLV",  size:"S",  color:"Olive", price:22, wholesale_cost:null, inventory_count:35, tracks_inventory:false, hero_image_url:null, position:8, created_at:"", updated_at:"" },
      { id:"v-m-olv",  product_id:"p", sku:"M-OLV",  size:"M",  color:"Olive", price:22, wholesale_cost:null, inventory_count:65, tracks_inventory:false, hero_image_url:null, position:9, created_at:"", updated_at:"" },
    ],
  }), [slug]);

  /* ── Fetch ── */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<ProductDetail>(`/products/${slug}`).catch(() => null),
      apiGet<{ pricing:CustomizationPricing[] }>("/customization/pricing").catch(() => null),
    ]).then(([p, pr]) => {
      if (cancelled) return;
      const prod = p && p.product_variants?.length ? p : PLACEHOLDER_PRODUCT;
      setProduct(prod);
      setPricingRules(pr?.pricing ?? []);
      if (!variantId) {
        // Try to match the color that was selected on the PDP
        const match = paramColor
          ? prod.product_variants.find((v) => v.color?.toLowerCase() === paramColor.toLowerCase())
          : null;
        setVariantId((match ?? prod.product_variants[0])?.id ?? null);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const variant = useMemo<ProductVariant | null>(
    () => product?.product_variants.find((v) => v.id === variantId) ?? null,
    [product, variantId]
  );

  const price = useMemo(() => computeCustomPrice({
    blankUnitPrice: variant?.price ?? paramPrice ?? 22,
    technique, colors: inkColors, quantity, rules: pricingRules,
  }), [variant, paramPrice, technique, inkColors, quantity, pricingRules]);

  // Human-readable unit price — at minimum show the blank cost
  const unitDisplay = price.unitAllIn > 0
    ? `$${price.unitAllIn.toFixed(2)}/unit`
    : variant?.price
      ? `$${variant.price.toFixed(2)}/unit`
      : paramPrice ? `$${paramPrice.toFixed(2)}/unit` : "";

  const zone = ZONES[placement];

  /* ── Helpers ── */
  const uid = () => Math.random().toString(36).slice(2, 8);

  const addElement = (el: Omit<DesignEl,"id">) =>
    setElements((prev) => [...prev, { ...el, id: uid() }]);

  const updateEl = (id:string, patch: Partial<DesignEl>) =>
    setElements((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e));

  const deleteSelected = () => {
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  };

  /* ── Drag handlers ── */
  const onElPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedId(id);
    const el = elements.find((x) => x.id === id);
    if (!el || !zoneRef.current) return;
    const rect = zoneRef.current.getBoundingClientRect();
    dragging.current = {
      id,
      ox: el.x, oy: el.y,
      startX: (e.clientX - rect.left) / rect.width * 100,
      startY: (e.clientY - rect.top)  / rect.height * 100,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [elements]);

  const onZonePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !zoneRef.current) return;
    const rect = zoneRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width * 100;
    const cy = (e.clientY - rect.top)  / rect.height * 100;
    const dx = cx - dragging.current.startX;
    const dy = cy - dragging.current.startY;
    updateEl(dragging.current.id, {
      x: Math.min(90, Math.max(0, dragging.current.ox + dx)),
      y: Math.min(90, Math.max(0, dragging.current.oy + dy)),
    });
  }, []);

  const onZonePointerUp = useCallback(() => { dragging.current = null; }, []);

  /* ── File upload ── */
  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setUploadError("File is over 25 MB."); return; }
    setUploadError(null); setUploading(true);

    // Always show the image on canvas immediately via object URL
    const localUrl = URL.createObjectURL(file);
    addElement({ kind:"image", src:localUrl, x:10, y:10, w:60, h:60 });
    setPanel("variants");

    // Best-effort server registration — silently skip if API is down
    try {
      const intent = await apiPost<{ artwork_id:string; bucket:string; file_path:string }>(
        "/uploads/artwork/intent", { filename:file.name, mime:file.type }
      );
      const { error: upErr } = await supabase.storage
        .from(intent.bucket).upload(intent.file_path, file, { contentType: file.type, upsert:false });
      if (upErr) throw upErr;
      const row = await apiPost<ArtworkUpload>("/uploads/artwork", {
        file_path: intent.file_path, original_filename: file.name,
        mime: file.type, size_bytes: file.size,
      });
      setArtwork(row);
    } catch {
      // API unavailable — canvas still works, cart submission will lack artwork_id
    } finally { setUploading(false); }
  };

  /* ── Save / Load ── */
  const saveDesign = () => {
    localStorage.setItem(`design-${slug}`, JSON.stringify({ elements, placement, technique, quantity, inkColors }));
    alert("Design saved locally.");
  };
  const loadDesign = () => {
    const raw = localStorage.getItem(`design-${slug}`);
    if (!raw) { alert("No saved design found."); return; }
    const d = JSON.parse(raw);
    setElements(d.elements ?? []); setPlacement(d.placement ?? "front_chest");
    setTechnique(d.technique ?? "screen_print"); setQuantity(d.quantity ?? 12);
    setInkColors(d.inkColors ?? 1);
  };

  /* ── Add to cart ── */
  const addToCart = async () => {
    if (!variant || !product) return;
    setSubmitting(true);
    const customization = {
      artwork_id: artwork?.id ?? null,
      placement, technique,
      colors: technique === "screen_print" ? inkColors : undefined,
      setup_fee: price.band?.setup_fee ?? 0,
      unit_cost: price.band?.unit_cost ?? 0,
    };
    try {
      // Try API first
      try {
        await apiPost("/cart/items", { variant_id: variant.id, quantity, customization });
      } catch {
        // API unavailable — write to localStorage cart instead
        addToLocalCart({
          slug: product.slug,
          variant_id: variant.id,
          quantity,
          unit_price: price.unitAllIn || variant.price,
          name: product.name,
          brand: product.brand,
          size: variant.size,
          color: variant.color,
          hero_image_url: variant.hero_image_url ?? product.hero_image_url,
          customization: {
            placement, technique,
            colors: technique === "screen_print" ? inkColors : undefined,
            setup_fee: price.band?.setup_fee ?? 0,
            unit_cost: price.band?.unit_cost ?? 0,
          },
        });
      }
      router.push("/shop/cart");
    } catch (e) { setUploadError(String(e)); }
    finally { setSubmitting(false); }
  };

  /* ── Variant helpers ── */
  const sizes = useMemo(() =>
    Array.from(new Set((product?.product_variants ?? []).map((v) => v.size).filter(Boolean) as string[])),
    [product]);
  const colorNames = useMemo(() =>
    Array.from(new Set((product?.product_variants ?? []).map((v) => v.color).filter(Boolean) as string[])),
    [product]);
  const selectedColor = variant?.color ?? null;
  const selectedSize  = variant?.size  ?? null;

  /* ── Placeholder product name ── */
  const productName = product?.name ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const variantLabel = variant ? `${variant.size ?? ""} / ${variant.color ?? ""}`.replace(/^\s*\/\s*/, "") : "";

  /* ══════════════════════════════════ UI ══════════════════════════════════ */
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ fontFamily:"inherit" }}>

      {/* ── Top bar ── */}
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-ink transition-colors"
        >
          <ArrowLeft size={15}/> Back
        </button>
        <div className="text-center">
          <p className="text-sm font-medium leading-none">{productName}</p>
          {variantLabel && <p className="mt-0.5 text-xs text-neutral-400">{variantLabel}</p>}
        </div>
        <div className="flex items-center gap-2">
          {unitDisplay && <span className="text-sm text-neutral-500">{unitDisplay}</span>}
          <button
            type="button"
            onClick={addToCart}
            disabled={!variant || submitting}
            className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-paper transition hover:bg-neutral-800 disabled:opacity-40"
          >
            {submitting ? "Adding…" : "Add to cart"}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ══ Left toolbar ══ */}
        <aside className="flex w-[72px] flex-shrink-0 flex-col items-center gap-1 border-r border-neutral-200 bg-white py-4">
          {[
            { icon:<MagnifyingGlassPlus size={20}/>,  label:"Zoom in",   action:() => setZoom((z) => Math.min(2, z + 0.1)) },
            { icon:<MagnifyingGlassMinus size={20}/>, label:"Zoom out",  action:() => setZoom((z) => Math.max(0.4, z - 0.1)) },
          ].map(({ icon, label, action }) => (
            <ToolBtn key={label} icon={icon} label={label} onClick={action}/>
          ))}

          <div className="my-1 w-8 border-t border-neutral-200"/>

          {[
            { icon:<ArrowCounterClockwise size={20}/>, label:"Reset",    action:() => { setElements([]); setSelectedId(null); setZoom(1); } },
            { icon:<FloppyDisk size={20}/>,            label:"Save",     action:saveDesign },
            { icon:<FolderOpen size={20}/>,            label:"Load",     action:loadDesign },
          ].map(({ icon, label, action }) => (
            <ToolBtn key={label} icon={icon} label={label} onClick={action}/>
          ))}

          <div className="my-1 w-8 border-t border-neutral-200"/>

          <ToolBtn
            icon={<DownloadSimple size={20}/>}
            label="Download"
            onClick={() => alert("Download coming soon — connect html2canvas or a backend rasteriser.")}
          />

          {/* Selected element controls */}
          {selectedId && (
            <>
              <div className="my-1 w-8 border-t border-neutral-200"/>
              <ToolBtn icon={<Trash size={20}/>} label="Delete" onClick={deleteSelected} danger/>
            </>
          )}
        </aside>

        {/* ══ Canvas area ══ */}
        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden"
          style={{ background:"#f4f4f4" }}
          onClick={() => setSelectedId(null)}
        >
          {/* Zoom container */}
          <div
            className="relative select-none transition-transform duration-150"
            style={{ transform:`scale(${zoom})`, transformOrigin:"center center" }}
          >
            {/* Product mockup */}
            <div
              className="relative overflow-hidden rounded-lg bg-white shadow-xl"
              style={{ width:520, height:580 }}
            >
              {/* Use the image from URL params immediately, then swap to API image if available */}
              {(paramImg || product?.hero_image_url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product?.hero_image_url || paramImg}
                  alt={productName}
                  className="h-full w-full object-contain"
                  style={{ backgroundColor:"#f0ede8" }}
                />
              ) : (
                /* Flat garment illustration — shown when no product photo exists */
                <div className="relative h-full w-full" style={{ backgroundColor:"#eceae6" }}>
                  <GarmentOutline color={
                    paramColor.toLowerCase() === "black"    ? "#5a5a5a" :
                    paramColor.toLowerCase() === "navy"     ? "#7a8fa6" :
                    paramColor.toLowerCase() === "olive"    ? "#8a9a78" :
                    paramColor.toLowerCase() === "charcoal" ? "#7a7a7a" :
                    "#c8c4be"
                  }/>
                  {paramColor && (
                    <span className="absolute bottom-6 left-0 right-0 text-center text-xs uppercase tracking-[0.25em] text-neutral-400">
                      {paramColor}
                    </span>
                  )}
                </div>
              )}

              {/* Print zone overlay */}
              {!preview && (
                <div
                  ref={zoneRef}
                  className="absolute"
                  style={{
                    top:    `${zone.top}%`,
                    left:   `${zone.left}%`,
                    width:  `${zone.width}%`,
                    height: `${zone.height}%`,
                    border: "1.5px dashed #ef4444",
                    cursor: "default",
                    boxSizing:"border-box",
                  }}
                  onPointerMove={onZonePointerMove}
                  onPointerUp={onZonePointerUp}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Design elements */}
                  {elements.map((el) => (
                    <DesignElView
                      key={el.id}
                      el={el}
                      selected={el.id === selectedId}
                      onPointerDown={(e) => onElPointerDown(e, el.id)}
                    />
                  ))}
                </div>
              )}

              {/* Preview mode: clean mockup */}
              {preview && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="absolute"
                    style={{
                      top:   `${zone.top}%`,
                      left:  `${zone.left}%`,
                      width: `${zone.width}%`,
                      height:`${zone.height}%`,
                    }}
                  >
                    {elements.map((el) => (
                      <DesignElView key={el.id} el={el} selected={false} onPointerDown={() => {}}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Placement picker strip at bottom */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
            {(["front_chest","front_full","back_full","left_sleeve","right_sleeve"] as ArtworkPlacement[]).map((p) => (
              <button key={p} type="button" onClick={(e) => { e.stopPropagation(); setPlacement(p); }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  placement === p ? "bg-ink text-paper" : "bg-white border border-neutral-300 hover:border-neutral-500"
                }`}>
                {p.replace(/_/g," ")}
              </button>
            ))}
          </div>

          {/* Preview toggle */}
          <button type="button" onClick={(e) => { e.stopPropagation(); setPreview((v) => !v); }}
            className={`absolute right-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm transition ${
              preview ? "bg-ink text-paper" : "bg-white border border-neutral-300 hover:border-neutral-500"
            }`}>
            <Eye size={13}/> {preview ? "Exit preview" : "Preview"}
          </button>
        </div>

        {/* ══ Right panel ══ */}
        <aside className="flex w-72 flex-shrink-0 flex-col border-l border-neutral-200 bg-white">

          {/* Tab buttons */}
          <div className="flex flex-col gap-1 border-b border-neutral-200 p-2">
            {PANEL_TABS.map(({ id, icon, label }) => (
              <button key={id} type="button" onClick={() => setPanel(id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  panel === id ? "bg-neutral-100 text-ink" : "text-neutral-500 hover:bg-neutral-50 hover:text-ink"
                }`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">

            {/* ── Variants panel ── */}
            {panel === "variants" && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-neutral-500">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {colorNames.length > 0 ? colorNames.map((c) => (
                      <button key={c} type="button" title={c}
                        onClick={() => {
                          const v = product?.product_variants.find((pv) => pv.color === c && pv.size === selectedSize)
                            ?? product?.product_variants.find((pv) => pv.color === c);
                          if (v) setVariantId(v.id);
                        }}
                        className={`h-7 w-7 rounded-full border-2 transition-all ${
                          selectedColor === c ? "border-ink ring-2 ring-ink ring-offset-1" : "border-white ring-1 ring-neutral-200"
                        }`}
                        style={{ backgroundColor: colorHex(c) }}/>
                    )) : (
                      ["Black","Stone","Olive","Navy","Slate"].map((c) => (
                        <button key={c} type="button" title={c}
                          className={`h-7 w-7 rounded-full border-2 transition-all ${
                            selectedColor === c ? "border-ink ring-2 ring-ink ring-offset-1" : "border-white ring-1 ring-neutral-200"
                          }`}
                          style={{ backgroundColor: colorHex(c) }}/>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-neutral-500">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {(sizes.length > 0 ? sizes : ["S","M","L","XL","2XL"]).map((s) => (
                      <button key={s} type="button"
                        onClick={() => {
                          const v = product?.product_variants.find((pv) => pv.size === s && pv.color === selectedColor)
                            ?? product?.product_variants.find((pv) => pv.size === s);
                          if (v) setVariantId(v.id);
                        }}
                        className={`rounded-md border px-3 py-1.5 text-sm transition ${
                          selectedSize === s ? "border-ink bg-ink text-paper" : "border-neutral-300 hover:border-neutral-500"
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-neutral-500">Technique</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      { id:"screen_print", label:"Screen print", sub:"24+ units, flat colors" },
                      { id:"embroidery",   label:"Embroidery",   sub:"Premium logos" },
                      { id:"dtg",          label:"DTG",          sub:"Photo-quality, qty 1+" },
                    ] as { id:DecorationTechnique; label:string; sub:string }[]).map((t) => (
                      <button key={t.id} type="button" onClick={() => setTechnique(t.id)}
                        className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition ${
                          technique === t.id ? "border-ink bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"
                        }`}>
                        <span>
                          <span className="font-medium">{t.label}</span>
                          <span className="ml-2 text-xs text-neutral-400">{t.sub}</span>
                        </span>
                        {technique === t.id && <Check size={14} className="text-ink flex-shrink-0"/>}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-neutral-500">Quantity</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQuantity((q) => Math.max(12, q-12))}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-lg hover:border-neutral-500">−</button>
                    <span className="w-10 text-center font-medium">{quantity}</span>
                    <button type="button" onClick={() => setQuantity((q) => q+12)}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-lg hover:border-neutral-500">+</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Upload panel ── */}
            {panel === "upload" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-neutral-600">Upload a PNG, SVG, PDF, or AI file. It will appear on the canvas and can be repositioned.</p>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,application/pdf"
                  className="hidden" onChange={onFileChosen} disabled={uploading}/>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-neutral-300 p-8 text-sm text-neutral-500 transition hover:border-neutral-500 disabled:opacity-50">
                  <UploadSimple size={28} className="text-neutral-400"/>
                  {uploading ? "Uploading…" : "Click to upload"}
                  <span className="text-xs">Max 25 MB · Vector preferred</span>
                </button>
                {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}
                {artwork && (
                  <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3 text-sm">
                    <span className="truncate text-neutral-700">{artwork.original_filename}</span>
                    <Check size={14} className="flex-shrink-0 text-emerald-600"/>
                  </div>
                )}
              </div>
            )}

            {/* ── Clipart panel ── */}
            {panel === "clipart" && (
              <div className="flex flex-col gap-4">
                <p className="text-xs uppercase tracking-widest text-neutral-500">Basic shapes</p>
                <div className="grid grid-cols-3 gap-3">
                  {CLIPART.map((c) => (
                    <button key={c.id} type="button"
                      onClick={() => addElement({ kind:"shape", shape:c.shape, shapeColor:"#1a1a1a", x:20, y:20, w:40, h:40 })}
                      className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 p-4 text-xs text-neutral-600 hover:border-neutral-400 transition">
                      <ShapeSVG shape={c.shape} size={32}/>
                      {c.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-400">More clipart coming soon.</p>
              </div>
            )}

            {/* ── Text panel ── */}
            {panel === "text" && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-neutral-500">Text</label>
                  <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-neutral-500">Size</label>
                    <input type="number" min={10} max={120} value={textSize}
                      onChange={(e) => setTextSize(Number(e.target.value))}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-ink focus:outline-none"/>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-neutral-500">Color</label>
                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                      className="h-10 w-full cursor-pointer rounded-md border border-neutral-300 p-1"/>
                  </div>
                </div>
                <button type="button" onClick={() => setTextBold((b) => !b)}
                  className={`rounded-md border px-4 py-2 text-sm font-bold transition ${
                    textBold ? "border-ink bg-ink text-paper" : "border-neutral-300 hover:border-neutral-500"
                  }`}>
                  Bold
                </button>
                <button type="button"
                  onClick={() => {
                    addElement({ kind:"text", text:textInput, fontSize:textSize, fontColor:textColor,
                      fontWeight: textBold ? "700" : "400", x:10, y:10, w:80, h:20 });
                    setPanel("variants");
                  }}
                  className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:bg-neutral-800 transition">
                  Add to design
                </button>
              </div>
            )}

            {/* ── Preview panel ── */}
            {panel === "preview" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-neutral-600">Toggle preview mode to see a clean mockup without the print-zone guide.</p>
                <button type="button" onClick={() => setPreview((v) => !v)}
                  className={`flex w-full items-center justify-center gap-2 rounded-md border py-3 text-sm font-medium transition ${
                    preview ? "border-ink bg-ink text-paper" : "border-neutral-300 hover:border-neutral-500"
                  }`}>
                  <Eye size={16}/> {preview ? "Exit preview" : "Enter preview"}
                </button>
                <p className="text-xs text-neutral-400">Download feature coming soon — will export a print-ready PNG.</p>
              </div>
            )}
          </div>

          {/* Price summary (always visible) */}
          <div className="border-t border-neutral-200 p-4">
            <div className="mb-3 flex flex-col gap-1.5 text-sm">
              {/* Blank cost — always shown */}
              <PriceRow
                label={`Blank × ${quantity}`}
                value={`$${price.blankSubtotal > 0 ? price.blankSubtotal.toFixed(2) : ((variant?.price ?? paramPrice ?? 22) * quantity).toFixed(2)}`}
              />
              {/* Only show decoration rows when pricing rules are loaded */}
              {price.band ? (
                <>
                  <PriceRow label="Setup"      value={`$${price.setupTotal.toFixed(2)}`}/>
                  <PriceRow label="Decoration" value={`$${price.decorationTotal.toFixed(2)}`}/>
                  <div className="my-1 border-t border-neutral-100"/>
                  <PriceRow label="Total" value={`$${price.total.toFixed(2)}`} bold/>
                  <p className="text-xs text-neutral-400">
                    ${price.unitAllIn.toFixed(2)} all-in per unit
                  </p>
                </>
              ) : (
                <>
                  <div className="my-1 border-t border-neutral-100"/>
                  <PriceRow
                    label="Subtotal"
                    value={`$${((variant?.price ?? paramPrice ?? 22) * quantity).toFixed(2)}`}
                    bold
                  />
                  <p className="text-xs text-neutral-400">
                    Decoration pricing added at checkout
                  </p>
                </>
              )}
            </div>
            <button type="button" onClick={addToCart} disabled={!variant || submitting}
              className="w-full rounded-md bg-ink py-3 text-sm font-medium text-paper transition hover:bg-neutral-800 disabled:opacity-40">
              {submitting ? "Adding…" : "Add to cart →"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Design element renderer ── */
function DesignElView({
  el, selected, onPointerDown,
}: { el:DesignEl; selected:boolean; onPointerDown:(e:React.PointerEvent)=>void }) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position:"absolute",
        left:  `${el.x}%`, top:   `${el.y}%`,
        width: `${el.w}%`, height:`${el.h}%`,
        cursor:"move",
        outline: selected ? "2px solid #1a1a1a" : "none",
        outlineOffset:2,
        userSelect:"none",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}
    >
      {el.kind === "image" && el.src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={el.src} alt="design" style={{ width:"100%", height:"100%", objectFit:"contain", pointerEvents:"none" }}/>
      )}
      {el.kind === "text" && (
        <span style={{
          fontSize:`${el.fontSize ?? 24}px`, color:el.fontColor ?? "#1a1a1a",
          fontWeight:el.fontWeight ?? "400", whiteSpace:"nowrap", pointerEvents:"none",
          lineHeight:1.1,
        }}>
          {el.text}
        </span>
      )}
      {el.kind === "shape" && (
        <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
          <ShapeSVG shape={el.shape ?? "circle"} color={el.shapeColor ?? "#1a1a1a"} size={40}/>
        </div>
      )}
      {/* Resize handle (bottom-right) */}
      {selected && (
        <div style={{
          position:"absolute", bottom:-5, right:-5,
          width:10, height:10,
          background:"#1a1a1a", borderRadius:2, cursor:"se-resize",
        }}/>
      )}
    </div>
  );
}

/* ── Realistic flat-lay garment SVG (520×580 viewBox, fills the mockup container) ── */
function GarmentOutline({ color = "#c8c4be" }: { color?: string }) {
  /*
   * Coordinate reference (520×580):
   *   Collar left  : 192,72   Collar right  : 328,72
   *   Shoulder L   : 118,98   Shoulder R    : 402,98
   *   Sleeve tip L : 42,208   Sleeve tip R  : 478,208
   *   Underarm L   : 108,232  Underarm R    : 412,232
   *   Hem L        : 108,548  Hem R         : 412,548
   */
  const stroke = color;
  const sw = 2.5;

  return (
    <svg
      viewBox="0 0 520 580"
      width="520" height="580"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position:"absolute", inset:0 }}
    >
      {/* ── Garment fill so it reads as a solid object ── */}
      <path
        d="
          M 192,72
          C 175,68 118,85 100,100
          L 42,210
          C 55,220 85,232 108,232
          L 108,548
          L 412,548
          L 412,232
          C 435,232 465,220 478,210
          L 420,100
          C 402,85 345,68 328,72
          C 318,118 202,118 192,72
          Z
        "
        fill="#f0ede8"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* ── Neckline inner arc (collar rib) ── */}
      <path
        d="M 192,72 C 202,120 318,120 328,72"
        fill="none"
        stroke={stroke}
        strokeWidth={sw - 0.5}
      />

      {/* ── Left sleeve seam (where sleeve meets body) ── */}
      <line x1="108" y1="100" x2="108" y2="232"
        stroke={stroke} strokeWidth={sw - 1} strokeDasharray="4 3" opacity={0.5}/>

      {/* ── Right sleeve seam ── */}
      <line x1="412" y1="100" x2="412" y2="232"
        stroke={stroke} strokeWidth={sw - 1} strokeDasharray="4 3" opacity={0.5}/>

      {/* ── Hem stitch line ── */}
      <line x1="118" y1="542" x2="402" y2="542"
        stroke={stroke} strokeWidth={sw - 1} strokeDasharray="4 3" opacity={0.4}/>

      {/* ── Cuff stitch lines ── */}
      <path d="M 46,210 C 60,222 84,232 108,232"
        stroke={stroke} strokeWidth={sw - 1} strokeDasharray="4 3" opacity={0.4}/>
      <path d="M 474,210 C 460,222 436,232 412,232"
        stroke={stroke} strokeWidth={sw - 1} strokeDasharray="4 3" opacity={0.4}/>
    </svg>
  );
}

/* ── Sub-components ── */
function ToolBtn({ icon, label, onClick, danger=false }: {
  icon:React.ReactNode; label:string; onClick:()=>void; danger?:boolean;
}) {
  return (
    <button type="button" onClick={onClick} title={label}
      className={`flex flex-col items-center gap-0.5 rounded-lg p-2 text-center transition hover:bg-neutral-100 ${
        danger ? "text-red-500" : "text-neutral-500 hover:text-ink"
      }`}
      style={{ width:56 }}>
      {icon}
      <span style={{ fontSize:9 }} className="leading-none tracking-wide uppercase">{label}</span>
    </button>
  );
}

function PriceRow({ label, value, bold=false }: { label:string; value:string; bold?:boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-medium" : "text-neutral-500"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

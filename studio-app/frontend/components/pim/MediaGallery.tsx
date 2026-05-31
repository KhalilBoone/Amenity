"use client";

/**
 * MediaGallery — drag-and-drop product image upload for the PIM.
 *
 * Uploads to Supabase Storage bucket `pim-media` under the path:
 *   {org_id}/{product_id}/{filename}
 *
 * After upload it writes a row to `pim_media` via the service role
 * (through the API POST /pim/orgs/{org}/products/{pid}/media endpoint).
 *
 * For now we call the Supabase JS client directly from the browser
 * (anon/auth key) using the storage uploadToSignedUrl pattern, then
 * register the public URL via the API.
 */

import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ImageSquare,
  Trash,
  ArrowUp,
  ArrowDown,
  UploadSimple,
} from "@phosphor-icons/react";

const BUCKET = "pim-media";

export interface PimMedia {
  id: string;
  url: string;
  alt: string | null;
  position: number;
}

interface Props {
  orgId: string;
  productId: string;
  initial: PimMedia[];
}

export function MediaGallery({ orgId, productId, initial }: Props) {
  const [media, setMedia] = useState<PimMedia[]>(
    [...initial].sort((a, b) => a.position - b.position)
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!arr.length) return;
      setUploading(true);
      setError(null);

      for (const file of arr) {
        try {
          const ext = file.name.split(".").pop() ?? "jpg";
          const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const storagePath = `${orgId}/${productId}/${filename}`;

          // Upload to Supabase Storage
          const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, file, { upsert: false });

          if (uploadErr) throw new Error(uploadErr.message);

          // Get public URL
          const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);

          const publicUrl = urlData.publicUrl;

          // Register in pim_media via API
          const { data: session } = await supabase.auth.getSession();
          const jwt = session?.session?.access_token;

          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL ?? ""}/pim/orgs/${orgId}/products/${productId}/media`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
              },
              body: JSON.stringify({
                url: publicUrl,
                mime: file.type,
                position: media.length,
              }),
            }
          );

          if (!res.ok) throw new Error(`API error ${res.status}`);
          const row: PimMedia = await res.json();
          setMedia((prev) => [...prev, row]);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Upload failed.");
        }
      }
      setUploading(false);
    },
    [orgId, productId, media.length]
  );

  async function handleDelete(id: string, url: string) {
    // Extract storage path from URL
    try {
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split(`/object/public/${BUCKET}/`);
      const storagePath = segments[1];
      if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      }
    } catch {
      // If URL parse fails, still try to delete the DB row
    }

    const { data: session } = await supabase.auth.getSession();
    const jwt = session?.session?.access_token;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? ""}/pim/orgs/${orgId}/products/${productId}/media/${id}`,
      {
        method: "DELETE",
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      }
    );
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...media];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setMedia(next.map((m, i) => ({ ...m, position: i })));
    // Note: persisting order via API is a nice-to-have; for now it's client-side only
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging
            ? "border-neutral-400 bg-neutral-50"
            : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
        ) : (
          <UploadSimple size={24} weight="thin" className="text-neutral-400" aria-hidden />
        )}
        <div>
          <p className="text-sm font-medium text-neutral-700">
            {uploading ? "Uploading…" : "Drop images here or click to browse"}
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">PNG, JPG, WebP · any size</p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Gallery grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m, i) => (
            <div
              key={m.id}
              className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
            >
              {/* Image */}
              <div className="aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt ?? "Product image"}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Overlay controls */}
              <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
                {/* Position badge */}
                {i === 0 && (
                  <span className="self-start rounded-full bg-ink px-2 py-0.5 text-[10px] font-medium text-paper">
                    Cover
                  </span>
                )}

                {/* Action buttons */}
                <div className="flex items-end justify-between">
                  <div className="flex gap-1">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-neutral-700 shadow-sm transition hover:bg-white disabled:opacity-30"
                      aria-label="Move left"
                    >
                      <ArrowUp size={11} weight="bold" className="-rotate-90" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === media.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-neutral-700 shadow-sm transition hover:bg-white disabled:opacity-30"
                      aria-label="Move right"
                    >
                      <ArrowDown size={11} weight="bold" className="-rotate-90" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id, m.url)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-red-500 shadow-sm transition hover:bg-white"
                    aria-label="Delete image"
                  >
                    <Trash size={11} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add more */}
          <button
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-600"
          >
            <ImageSquare size={20} weight="thin" aria-hidden />
            <span className="text-xs">Add more</span>
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import type { ArtworkPlacement } from "@/types";

type Hotspot = {
  id: ArtworkPlacement;
  label: string;
  cx: number;
  cy: number;
  r: number;
};

const HOTSPOTS: Hotspot[] = [
  { id: "front_chest",  label: "Front chest", cx: 60, cy: 55,  r: 6 },
  { id: "front_full",   label: "Front (full)", cx: 60, cy: 100, r: 12 },
  { id: "left_sleeve",  label: "Left sleeve",  cx: 22, cy: 60,  r: 5 },
  { id: "right_sleeve", label: "Right sleeve", cx: 98, cy: 60,  r: 5 },
  { id: "neck_label",   label: "Neck label",   cx: 60, cy: 32,  r: 4 },
];

export function PlacementPicker({
  value,
  onChange,
}: {
  value: ArtworkPlacement | null;
  onChange: (p: ArtworkPlacement) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm uppercase tracking-wider text-neutral-500">
        Placement
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr] md:items-start">
        <svg
          viewBox="0 0 120 180"
          className="h-72 w-auto rounded-md border border-neutral-200 bg-white"
          aria-label="Garment placement diagram"
        >
          {/* shirt silhouette */}
          <path
            d="M30 30 L60 22 L90 30 L110 50 L100 60 L90 50 L90 160 L30 160 L30 50 L20 60 L10 50 Z"
            fill="#f5f5f4"
            stroke="#a3a3a3"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {HOTSPOTS.map((h) => {
            const active = value === h.id;
            return (
              <g
                key={h.id}
                role="button"
                tabIndex={0}
                onClick={() => onChange(h.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onChange(h.id);
                }}
                className="cursor-pointer outline-none"
              >
                <circle
                  cx={h.cx}
                  cy={h.cy}
                  r={h.r + 2}
                  fill={active ? "#0a0a0a" : "rgba(10,10,10,0.06)"}
                  stroke={active ? "#0a0a0a" : "#525252"}
                  strokeDasharray={active ? "0" : "2 2"}
                />
                <circle
                  cx={h.cx}
                  cy={h.cy}
                  r={h.r - 1}
                  fill={active ? "#fafaf9" : "transparent"}
                />
              </g>
            );
          })}
        </svg>

        <ul className="flex flex-col gap-1 text-sm">
          {HOTSPOTS.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => onChange(h.id)}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  value === h.id
                    ? "border-ink bg-ink text-paper"
                    : "border-neutral-300 hover:border-neutral-500"
                }`}
              >
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

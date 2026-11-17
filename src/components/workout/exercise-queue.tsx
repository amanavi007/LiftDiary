"use client";

import { useState } from "react";
import { SectionLabel } from "@/components/ui/section-label";

export type SwapExercise = { id: string; name: string; defaultRestSec: number };

export type QueueItem = {
  id: string;
  name: string;
  logged: number;
  target: number;
  done: boolean;
  skipped: boolean;
};

export function ExerciseQueue({
  items,
  activeId,
  catalog,
  onLoadCatalog,
  onSelect,
  onMove,
  onSkip,
  onSwap,
}: {
  items: QueueItem[];
  activeId: string;
  catalog: SwapExercise[];
  onLoadCatalog: () => void;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onSkip: (id: string) => void;
  onSwap: (id: string, replacement: SwapExercise) => void;
}) {
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const results = q ? catalog.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8) : [];
  const small =
    "min-h-9 rounded-full bg-line px-3 text-[11px] font-bold text-muted-2 transition hover:text-ink disabled:opacity-40";

  return (
    <ul className="space-y-2">
      {items.map((item, index) => {
        const active = item.id === activeId;
        return (
          <li
            key={item.id}
            className={`rounded-2xl border p-3 ${active ? "border-accent/40 bg-surface" : "border-line bg-surface/60"}`}
          >
            <button type="button" onClick={() => onSelect(item.id)} className="flex w-full items-center justify-between gap-3 text-left">
              <span className={`text-sm font-bold ${item.skipped ? "text-muted line-through" : ""}`}>{item.name}</span>
              <span className={`tabular text-xs font-bold ${item.done ? "text-accent" : "text-muted-2"}`}>
                {item.skipped ? "skipped" : `${item.logged}/${item.target}`}
              </span>
            </button>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" className={small} onClick={() => onMove(item.id, "up")} disabled={index === 0}>
                ↑ Up
              </button>
              <button type="button" className={small} onClick={() => onMove(item.id, "down")} disabled={index === items.length - 1}>
                ↓ Down
              </button>
              <button type="button" className={small} onClick={() => onSkip(item.id)} disabled={item.done}>
                Skip
              </button>
              <button
                type="button"
                className={small}
                onClick={() => {
                  onLoadCatalog();
                  setSwapFor(swapFor === item.id ? null : item.id);
                  setQuery("");
                }}
              >
                Swap
              </button>
            </div>
            {swapFor === item.id ? (
              <div className="mt-3 space-y-2">
                <SectionLabel>Replace with</SectionLabel>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search exercises"
                  className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm outline-none focus:border-accent"
                />
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {results.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        onSwap(item.id, e);
                        setSwapFor(null);
                        setQuery("");
                      }}
                      className="block min-h-10 w-full rounded-lg bg-bg px-3 text-left text-sm hover:bg-line"
                    >
                      {e.name}
                    </button>
                  ))}
                  {q && results.length === 0 ? <p className="text-xs text-muted">No matching exercises.</p> : null}
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

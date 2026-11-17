"use client";

import { useEffect, useState } from "react";
import { jsonFetch } from "@/lib/client";
import { tutorialQuery, tutorialSearchUrl } from "@/lib/workout-helpers";

export function TutorialModal({ name, onClose }: { name: string; onClose: () => void }) {
  const [state, setState] = useState<{ loading: boolean; videoId: string | null }>({ loading: true, videoId: null });

  useEffect(() => {
    let cancelled = false;
    jsonFetch<{ videoId: string }>(`/api/exercises/tutorial?q=${encodeURIComponent(tutorialQuery(name))}`)
      .then((d) => !cancelled && setState({ loading: false, videoId: d.videoId }))
      .catch(() => !cancelled && setState({ loading: false, videoId: null }));
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} form guide`}
      className="fixed inset-0 z-50 flex flex-col items-center bg-bg/95 px-4 pt-12 backdrop-blur"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Form guide</p>
            <p className="font-serif text-3xl leading-tight">{name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form guide"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-line text-ink"
          >
            ✕
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {state.loading ? (
            <div className="flex aspect-video items-center justify-center text-sm text-muted-2">Loading…</div>
          ) : state.videoId ? (
            <iframe
              title={`${name} tutorial`}
              src={`https://www.youtube.com/embed/${state.videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1`}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-muted-2">No embeddable video found.</p>
              <a href={tutorialSearchUrl(name)} target="_blank" rel="noreferrer" className="text-sm font-bold text-accent underline">
                Search on YouTube →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

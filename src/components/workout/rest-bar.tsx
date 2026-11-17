"use client";

import { useEffect, useState } from "react";
import { secondsRemaining } from "@/lib/rest-timer";
import { formatSeconds } from "@/lib/workout-helpers";

/** Docked rest timer. Uses an end timestamp, so it stays correct after the phone sleeps. */
export function RestBar({
  endsAt,
  totalSeconds,
  onAddTime,
  onSkip,
  onDone,
}: {
  endsAt: number;
  totalSeconds: number;
  onAddTime: () => void;
  onSkip: () => void;
  onDone: () => void;
}) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  const remaining = now ? secondsRemaining(endsAt, now) : totalSeconds;

  useEffect(() => {
    if (now && remaining === 0) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(200);
      onDone();
    }
  }, [now, remaining, onDone]);

  const pct = totalSeconds > 0 ? Math.min(100, ((totalSeconds - remaining) / totalSeconds) * 100) : 0;

  return (
    <div role="timer" aria-label="Rest timer" className="overflow-hidden rounded-2xl border border-accent/30 bg-[#1d2410]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Rest</p>
          <p className="tabular font-serif text-4xl leading-none text-ink">{formatSeconds(remaining)}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAddTime}
            className="min-h-11 rounded-xl bg-line px-4 text-sm font-bold text-ink active:scale-95"
          >
            +15s
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 rounded-xl bg-accent px-4 text-sm font-bold text-bg active:scale-95"
          >
            Skip
          </button>
        </div>
      </div>
      <div className="h-1 bg-line">
        <div className="h-full bg-accent transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

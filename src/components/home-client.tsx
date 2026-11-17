"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Ring } from "@/components/ui/ring";
import { SectionLabel } from "@/components/ui/section-label";
import { jsonFetch } from "@/lib/client";
import type { HomeData, HomeLift } from "@/lib/home-data";
import { computeStreak } from "@/lib/streak";
import { weekStrip } from "@/lib/week";

// Current time in ms, rounded to the minute. 0 during server render so nothing time-dependent is baked into HTML.
function useNowMs() {
  return useSyncExternalStore(
    () => () => {},
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => 0,
  );
}

function TrendMark({ lift, units }: { lift: HomeLift; units: string }) {
  if (lift.lastWeight === 0) return <span className="text-[11px] text-muted">bodyweight</span>;
  if (lift.trend === "new") return <span className="text-[11px] text-muted">first time</span>;
  const diff = Math.abs(lift.todayWeight - (lift.lastWeight ?? 0));
  if (lift.trend === "up") return <span className="text-[11px] font-bold text-accent">↑ +{diff} {units}</span>;
  if (lift.trend === "down") return <span className="text-[11px] font-bold text-warn">↓ −{diff} {units}</span>;
  return <span className="text-[11px] text-muted-2">= hold</span>;
}

export function HomeClient({ data }: { data: HomeData }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(data.defaultDayId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nowMs = useNowMs();

  const day = data.days.find((d) => d.id === selectedId) ?? data.days[0];
  const units = data.units.toLowerCase();

  const time = useMemo(() => {
    if (!nowMs) return null;
    const now = new Date(nowMs);
    const dates = data.completedDates.map((iso) => new Date(iso));
    return {
      weekday: now.toLocaleDateString(undefined, { weekday: "long" }),
      strip: weekStrip(now, dates),
      streak: computeStreak(now, dates),
    };
  }, [nowMs, data.completedDates]);

  const minutes = useMemo(() => {
    if (!day) return 0;
    const sets = day.lifts.reduce((sum, l) => sum + l.targetSets, 0);
    return Math.max(20, Math.round(day.lifts.length * 4 + sets * 2.2));
  }, [day]);

  async function start() {
    if (!day) return;
    setError(null);
    setLoading(true);
    try {
      const res = await jsonFetch<{ sessionId: string }>("/api/workouts/start", {
        method: "POST",
        body: JSON.stringify({ routineDayId: day.id }),
      });
      router.push(`/workout/session/${res.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start workout");
      setLoading(false);
    }
  }

  if (!day) {
    return (
      <Card>
        <p className="text-sm text-muted-2">No routine found. Set up your split in Settings first.</p>
      </Card>
    );
  }

  const r = day.readiness;
  const preview = day.lifts;

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-8 lg:space-y-0">
      {/* Left column: decision */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between lg:hidden">
          <span className="font-serif text-2xl leading-none">
            Lift<i className="text-accent">Diary</i>
          </span>
          <SectionLabel>{time?.weekday ?? ""}</SectionLabel>
        </div>

        {data.activeSession ? (
          <Link
            href={`/workout/session/${data.activeSession.id}`}
            className="flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3"
          >
            <div>
              <SectionLabel>Resume workout</SectionLabel>
              <p className="mt-0.5 text-sm font-bold">{data.activeSession.label} in progress</p>
            </div>
            <span className="text-accent">→</span>
          </Link>
        ) : null}

        <div>
          <SectionLabel>Today</SectionLabel>
          <h1 className="mt-1 font-serif text-5xl leading-[0.92] lg:text-7xl">{day.label}</h1>
          <p className="mt-2 text-sm text-muted-2">
            {day.lifts.length} exercise{day.lifts.length === 1 ? "" : "s"} · about {minutes} min
          </p>
        </div>

        {data.days.length > 1 ? (
          <div role="tablist" aria-label="Workout day" className="flex gap-1.5 overflow-x-auto">
            {data.days.map((d) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={d.id === day.id}
                onClick={() => setSelectedId(d.id)}
                className={`min-h-9 shrink-0 rounded-full px-4 text-xs font-bold transition ${
                  d.id === day.id ? "bg-accent text-bg" : "bg-line text-muted-2 hover:text-ink"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : null}

        <Card className="flex items-center gap-4">
          <Ring value={r.score} label="Ready" />
          <div className="min-w-0">
            <p className="font-serif text-2xl leading-tight">{r.label}</p>
            <p className="mt-1 text-xs leading-snug text-muted-2">{r.note}</p>
          </div>
        </Card>

        {day.deload ? (
          <Card tone="accent">
            <p className="text-sm font-bold">Consider a lighter week</p>
            <p className="mt-0.5 text-xs text-muted-2">
              Readiness is low and several recent sets failed. Dropping weights about 10% for a few sessions can help you come back stronger.
            </p>
          </Card>
        ) : null}

        {time ? (
          <Card className="py-3">
            <div className="flex items-center justify-between">
              <SectionLabel>This week</SectionLabel>
              {time.streak > 0 ? <Pill tone="accent">🔥 {time.streak}-day streak</Pill> : null}
            </div>
            <div className="mt-3 flex justify-between">
              {time.strip.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 text-[10px] font-bold text-muted">
                  {d.label}
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${
                      d.trained
                        ? "bg-accent text-bg"
                        : d.isToday
                          ? "border-2 border-accent text-accent"
                          : "bg-line"
                    }`}
                  >
                    {d.trained ? "✓" : d.isToday ? "•" : ""}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {!data.calibration.complete ? (
          <Card className="py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-2">Coach calibrating</span>
              <span className="tabular font-bold">
                {data.calibration.done}/{data.calibration.length} sessions
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${(data.calibration.done / data.calibration.length) * 100}%` }}
              />
            </div>
          </Card>
        ) : null}
      </div>

      {/* Right column: the plan */}
      <div className="space-y-4">
        <Card className="px-4 py-1">
          <ul>
            {preview.map((lift) => (
              <li key={lift.name} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{lift.name}</p>
                  <p className="text-[11px] text-muted">
                    {lift.lastWeight === null
                      ? "No history yet"
                      : lift.lastWeight === 0
                        ? `Last: bodyweight × ${lift.lastReps}`
                        : `Last: ${lift.lastWeight} × ${lift.lastReps}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm text-muted-2">
                    {lift.todayWeight > 0 ? (
                      <>
                        <span className="font-serif text-2xl leading-none text-ink">{lift.todayWeight}</span>{" "}
                        × {lift.repLow}–{lift.repHigh}
                      </>
                    ) : (
                      <>
                        {lift.targetSets} × {lift.repLow}–{lift.repHigh}
                      </>
                    )}
                  </p>
                  <TrendMark lift={lift} units={units} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {day.lifts.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-2">
              This day has no exercises yet. Add some in Settings → Edit current routine.
            </p>
          </Card>
        ) : null}
        <div className="sticky bottom-[4.75rem] z-30 lg:static">
          <Button size="lg" disabled={loading || day.lifts.length === 0} onClick={start} className="shadow-[0_8px_24px_rgba(16,17,20,0.9)]">
            {loading ? "Starting…" : data.activeSession ? "Start a new workout" : "Start workout"}
          </Button>
        </div>
      </div>
    </div>
  );
}

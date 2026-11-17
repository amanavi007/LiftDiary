"use client";

import { CoachingStyle, Goal, Units } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { jsonFetch } from "@/lib/client";

function labelize(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/(^|\s)\S/g, (s) => s.toUpperCase());
}

const selectClass =
  "mt-1.5 min-h-12 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink outline-none focus:border-accent";

export function SettingsForm({
  initial,
}: {
  initial: {
    units: Units;
    coachingStyle: CoachingStyle;
    goal: Goal | null;
    preferredRestSeconds: number | null;
    calibrationLength: number;
  };
}) {
  const router = useRouter();
  const [units, setUnits] = useState<Units>(initial.units);
  const [coachingStyle, setCoachingStyle] = useState<CoachingStyle>(initial.coachingStyle);
  const [goal, setGoal] = useState<Goal>(initial.goal ?? "GENERAL_FITNESS");
  const [rest, setRest] = useState(initial.preferredRestSeconds ?? 120);
  const [calibration, setCalibration] = useState(initial.calibrationLength);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await jsonFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ units, coachingStyle, goal, preferredRestSeconds: rest, calibrationLength: calibration }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await jsonFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Settings</SectionLabel>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95] lg:text-6xl">Your coach</h1>
      </div>

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <Card className="space-y-5">
          <label className="block text-sm font-bold">
            Units
            <select value={units} onChange={(e) => setUnits(e.target.value as Units)} className={selectClass}>
              <option value="LB">Pounds (lb)</option>
              <option value="KG">Kilograms (kg)</option>
            </select>
          </label>

          <label className="block text-sm font-bold">
            Goal
            <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)} className={selectClass}>
              {["STRENGTH", "HYPERTROPHY", "ENDURANCE", "GENERAL_FITNESS"].map((g) => (
                <option key={g} value={g}>
                  {labelize(g)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-bold">
            Coaching style
            <select
              value={coachingStyle}
              onChange={(e) => setCoachingStyle(e.target.value as CoachingStyle)}
              className={selectClass}
            >
              {["CONSERVATIVE", "BALANCED", "AGGRESSIVE"].map((style) => (
                <option key={style} value={style}>
                  {labelize(style)}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-xs font-normal text-muted-2">
              {coachingStyle === "CONSERVATIVE" && "Small, safe weight jumps. Prioritizes form and longevity."}
              {coachingStyle === "BALANCED" && "Steady weekly progress. Works well for most people."}
              {coachingStyle === "AGGRESSIVE" && "Bigger jumps, higher intensity. Push your limits."}
            </span>
          </label>

          <label className="block text-sm font-bold">
            Rest between sets: <span className="tabular text-accent">{rest}s</span>
            <input
              type="range"
              min={30}
              max={300}
              step={15}
              value={rest}
              onChange={(e) => setRest(Number(e.target.value))}
              className="mt-3 w-full accent-[#c6ff3d]"
            />
          </label>

          <label className="block text-sm font-bold">
            Calibration length: <span className="tabular text-accent">{calibration} workouts</span>
            <span className="mt-0.5 block text-xs font-normal text-muted-2">
              {calibration <= 5
                ? "Quick: early recommendations with less data."
                : calibration <= 10
                  ? "Recommended: a good balance of speed and accuracy."
                  : "Thorough: slower start, highly personalised results."}
            </span>
            <input
              type="range"
              min={3}
              max={20}
              value={calibration}
              onChange={(e) => setCalibration(Number(e.target.value))}
              className="mt-3 w-full accent-[#c6ff3d]"
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button size="lg" onClick={save} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
          </Button>
        </Card>

        <Card className="space-y-3">
          <SectionLabel>Routine</SectionLabel>
          <Link href="/onboarding?mode=edit" className={buttonClass("ghost")}>
            Edit current routine
          </Link>
          <Link href="/onboarding?mode=new" className={buttonClass("ghost")}>
            Add new split
          </Link>
          <div className="pt-2">
            <SectionLabel>Data</SectionLabel>
            <a href="/api/export" download className={`${buttonClass("ghost")} mt-3`}>
              Export history (CSV)
            </a>
          </div>
          <div className="pt-2">
            <SectionLabel>Account</SectionLabel>
            <Button variant="ghost" onClick={logout} className="mt-3">
              Log out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

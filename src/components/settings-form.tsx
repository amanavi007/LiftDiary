"use client";

import { CoachingStyle, Goal, Units } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { jsonFetch } from "@/lib/client";

function labelize(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/(^|\s)\S/g, (s) => s.toUpperCase());
}

export function SettingsForm({
  initial,
}: {
  initial: {
    units: Units;
    coachingStyle: CoachingStyle;
    goal: Goal | null;
    calibrationLength: number;
  };
}) {
  const router = useRouter();
  const [units, setUnits] = useState<Units>(initial.units);
  const [coachingStyle, setCoachingStyle] = useState<CoachingStyle>(initial.coachingStyle);
  const [goal, setGoal] = useState<Goal>(initial.goal ?? "GENERAL_FITNESS");
  const [calibrationLength, setCalibrationLength] = useState(initial.calibrationLength);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await jsonFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ units, coachingStyle, goal, calibrationLength }),
      });
      router.refresh();
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
    <div className="glass-card-strong space-y-3 rounded-2xl p-5">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <label className="block text-sm">
        Units
        <select value={units} onChange={(e) => setUnits(e.target.value as Units)} className="glass-input mt-1">
          <option value="LB">lb</option>
          <option value="KG">kg</option>
        </select>
      </label>

      <label className="block text-sm">
        Coaching Style
        <select value={coachingStyle} onChange={(e) => setCoachingStyle(e.target.value as CoachingStyle)} className="glass-input mt-1">
          {["CONSERVATIVE", "BALANCED", "AGGRESSIVE"].map((style) => (
            <option key={style} value={style}>{labelize(style)}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        Goal
        <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)} className="glass-input mt-1">
          {["STRENGTH", "HYPERTROPHY", "ENDURANCE", "GENERAL_FITNESS"].map((g) => (
            <option key={g} value={g}>{labelize(g)}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        Calibration Length: {calibrationLength}
        <input type="range" min={3} max={20} value={calibrationLength} onChange={(e) => setCalibrationLength(Number(e.target.value))} className="glass-slider mt-2" />
      </label>

      <button onClick={save} disabled={saving} className="glass-button">
        {saving ? "Saving..." : "Save Settings"}
      </button>

      <Link href="/onboarding" className="glass-button-ghost block text-center text-sm">
        Edit Routine
      </Link>

      <button onClick={logout} className="glass-button-ghost text-sm">
        Log Out
      </button>
    </div>
  );
}

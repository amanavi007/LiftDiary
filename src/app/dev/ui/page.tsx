import { notFound } from "next/navigation";
import { ScreenShell } from "@/components/screen-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Ring } from "@/components/ui/ring";
import { SectionLabel } from "@/components/ui/section-label";
import { SetRow } from "@/components/ui/set-row";
import { StatTile } from "@/components/ui/stat-tile";

export default function UiGallery() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ScreenShell showBack={false}>
      <SectionLabel>Today</SectionLabel>
      <h1 className="font-serif text-5xl leading-[0.92]">Pull Day</h1>
      <Card className="flex items-center gap-4">
        <Ring value={78} label="Ready" />
        <div>
          <p className="font-serif text-2xl leading-tight">Good to push</p>
          <p className="mt-1 text-xs text-muted-2">
            Rows are due for a <span className="text-accent">+5 lb</span> bump.
          </p>
        </div>
      </Card>
      <Card className="flex items-center gap-4">
        <Ring value={null} label="Ready" />
        <p className="text-sm text-muted-2">No score yet. Log a workout first.</p>
      </Card>
      <div className="flex gap-2">
        <StatTile value="52m" label="Time" />
        <StatTile value="9.8k" label="Volume lb" />
        <StatTile value="2" label="PRs" tone="accent" />
      </div>
      <div className="flex gap-2">
        <Pill>42 sessions</Pill>
        <Pill tone="accent">3-day streak</Pill>
        <Pill tone="warn">↓ 40</Pill>
      </div>
      <Card tone="accent">
        <SectionLabel>New PR</SectionLabel>
        <p className="mt-1 font-bold">Barbell Row 160 × 6</p>
      </Card>
      <div className="space-y-2">
        <SetRow index={1} weight={135} reps={10} done active={false} units="LB" />
        <SetRow index={2} weight={135} reps={9} done active={false} units="LB" />
        <SetRow index={3} weight={135} reps={10} done={false} active units="LB" />
      </div>
      <Button size="lg">Start workout</Button>
      <Button variant="ghost">Next exercise →</Button>
    </ScreenShell>
  );
}

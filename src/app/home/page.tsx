import Link from "next/link";
import { redirect } from "next/navigation";
import { ScreenShell } from "@/components/screen-shell";
import { isOnboardingComplete, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function cardLink(href: string, title: string, caption: string) {
  return (
    <Link href={href} className="glass-card block rounded-2xl p-4 transition hover:bg-white/12">
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-zinc-200/75">{caption}</p>
    </Link>
  );
}

export default async function HomePage() {
  const user = await requireUser();
  if (!isOnboardingComplete(user)) redirect("/onboarding");

  const routine = user.routines[0];
  const lastSession = await prisma.workoutSession.findFirst({
    where: { userId: user.id, endedAt: { not: null } },
    include: { routineDay: true },
    orderBy: { startedAt: "desc" },
  });

  const nextDay = (() => {
    if (!routine?.days?.length) return "Build your routine";
    if (!lastSession) return routine.days[0].label;
    const nextIndex = (lastSession.routineDay.dayIndex + 1) % routine.days.length;
    return routine.days[nextIndex]?.label ?? routine.days[0].label;
  })();

  const streak = await prisma.workoutSession.count({
    where: {
      userId: user.id,
      endedAt: { not: null },
    },
  });

  return (
    <ScreenShell>
      <header className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-200/70">LiftDiary</p>
        <h1 className="text-3xl font-bold text-white">Train today</h1>
        <p className="text-sm text-zinc-200/80">Next: {nextDay}</p>
      </header>

      <Link
        href="/workout/start"
        className="glass-button mb-4 block py-4 text-center text-lg"
      >
        START WORKOUT
      </Link>

      <p className="mb-4 text-xs text-zinc-200/65">Streak: {streak} sessions</p>

      <section className="space-y-2">
        {cardLink("/history", "Workout History", "View past sessions and filters")}
        {cardLink("/onboarding", "Edit Routine", "Adjust split, exercises, and targets")}
        {cardLink("/dashboard", "PR Dashboard", "Estimated 1RM, PRs, and trends")}
        {cardLink("/settings", "Settings", "Units, coaching style, goal, calibration")}
      </section>
    </ScreenShell>
  );
}

import { redirect } from "next/navigation";
import { ScreenShell } from "@/components/screen-shell";
import { StartWorkoutClient } from "@/components/start-workout-client";
import { isOnboardingComplete, requireUser } from "@/lib/auth";

export default async function StartWorkoutPage() {
  const user = await requireUser();
  if (!isOnboardingComplete(user)) redirect("/onboarding");

  const routine = user.routines[0];
  if (!routine) redirect("/onboarding");

  return (
    <ScreenShell>
      <StartWorkoutClient
        days={routine.days.map((day) => ({
          id: day.id,
          dayIndex: day.dayIndex,
          label: day.label,
        }))}
      />
    </ScreenShell>
  );
}

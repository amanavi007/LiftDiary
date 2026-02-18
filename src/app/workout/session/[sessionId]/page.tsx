import { ScreenShell } from "@/components/screen-shell";
import { WorkoutSessionClient } from "@/components/workout-session-client";
import { requireUser } from "@/lib/auth";

export default async function WorkoutSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  await requireUser();
  const { sessionId } = await params;

  return (
    <ScreenShell>
      <WorkoutSessionClient sessionId={sessionId} />
    </ScreenShell>
  );
}

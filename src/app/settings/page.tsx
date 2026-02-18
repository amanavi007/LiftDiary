import { ScreenShell } from "@/components/screen-shell";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <ScreenShell>
      <SettingsForm
        initial={{
          units: user.units,
          coachingStyle: user.coachingStyle,
          goal: user.goal,
          calibrationLength: user.calibrationLength,
        }}
      />
    </ScreenShell>
  );
}

import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { ScreenShell } from "@/components/screen-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const mode = params.mode === "new" ? "new" : "edit";

  return (
    <ScreenShell showNav={false} showBack={false}>
      <OnboardingForm mode={mode} isFirstTime={user.routines.length === 0} />
    </ScreenShell>
  );
}

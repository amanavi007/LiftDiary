import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { ScreenShell } from "@/components/screen-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ScreenShell showNav={false}>
      <OnboardingForm />
    </ScreenShell>
  );
}

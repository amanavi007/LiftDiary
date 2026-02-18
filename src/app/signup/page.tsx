import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { ScreenShell } from "@/components/screen-shell";
import { getCurrentUser, isOnboardingComplete } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user && isOnboardingComplete(user)) redirect("/home");
  if (user) redirect("/onboarding");

  return (
    <ScreenShell showNav={false}>
      <div className="pt-4">
        <AuthForm mode="signup" />
      </div>
    </ScreenShell>
  );
}

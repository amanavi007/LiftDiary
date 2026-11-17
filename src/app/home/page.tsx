import { redirect } from "next/navigation";
import { HomeClient } from "@/components/home-client";
import { ScreenShell } from "@/components/screen-shell";
import { isOnboardingComplete, requireUser } from "@/lib/auth";
import { loadHomeData } from "@/lib/home-data";

export default async function HomePage() {
  const user = await requireUser();
  if (!isOnboardingComplete(user)) redirect("/onboarding");
  const data = await loadHomeData(user);

  return (
    <ScreenShell showBack={false}>
      <HomeClient data={data} />
    </ScreenShell>
  );
}

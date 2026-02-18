import { redirect } from "next/navigation";
import { getCurrentUser, isOnboardingComplete } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isOnboardingComplete(user)) {
    redirect("/onboarding");
  }

  redirect("/home");
}

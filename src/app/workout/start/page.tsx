import { redirect } from "next/navigation";

// Starting a workout now happens from Home; keep the old URL working for bookmarks.
export default function StartWorkoutPage() {
  redirect("/home");
}

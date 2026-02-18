import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false });

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      goal: user.goal,
      experienceLevel: user.experienceLevel,
      coachingStyle: user.coachingStyle,
      units: user.units,
      calibrationLength: user.calibrationLength,
      workoutsCompletedInCalibration: user.workoutsCompletedInCalibration,
      calibrationComplete: user.calibrationComplete,
    },
  });
}

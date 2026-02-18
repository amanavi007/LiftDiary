import { Goal, SplitType } from "@prisma/client";

export const GOAL_REP_RANGES: Record<Goal, { low: number; high: number }> = {
  STRENGTH: { low: 3, high: 6 },
  HYPERTROPHY: { low: 8, high: 12 },
  ENDURANCE: { low: 12, high: 20 },
  GENERAL_FITNESS: { low: 6, high: 12 },
};

export const SPLIT_TEMPLATES: Record<SplitType, string[]> = {
  PUSH_PULL_LEGS: ["Push", "Pull", "Legs"],
  UPPER_LOWER: ["Upper", "Lower"],
  FULL_BODY: ["Full Body A", "Full Body B", "Full Body C"],
  BRO_SPLIT: ["Chest", "Back", "Legs", "Shoulders", "Arms"],
  CUSTOM: ["Day 1"],
};

export const WEIGHT_CAPS_LB = {
  upper: 10,
  lower: 20,
};

export const WEIGHT_CAPS_KG = {
  upper: 5,
  lower: 10,
};

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const MAX_SCREENSHOT_IMPORT_IMAGES = 3;
const DEFAULT_VISION_MODEL = "gpt-4.1-mini";

type ParsedScreenshotExercise = {
  name: string;
  sets: number;
  repLow: number;
  repHigh: number;
};

type ParsedScreenshotDay = {
  label: string;
  exercises: ParsedScreenshotExercise[];
};

type ParsedScreenshotPayload = {
  days: ParsedScreenshotDay[];
};

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const model = process.env.OPENAI_VISION_MODEL || DEFAULT_VISION_MODEL;

    const formData = await request.formData();
    const files = formData
      .getAll("screenshot")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "No screenshots provided" }, { status: 400 });
    }

    if (files.length > MAX_SCREENSHOT_IMPORT_IMAGES) {
      return NextResponse.json(
        { error: `Please upload up to ${MAX_SCREENSHOT_IMPORT_IMAGES} screenshots at a time.` },
        { status: 400 }
      );
    }

    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Image = buffer.toString("base64");
      const mimeType = file.type || "image/png";

      imageContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`,
        },
      });
    }

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract workout split data from these screenshots.

Rules:
- Extract all workout days visible across all images
- Standardize exercise names to common gym terminology
- If sets/reps are not specified, use reasonable defaults (3 sets, 8-12 reps)
- If you see a rep range like "8-12", use 8 for repLow and 12 for repHigh
- If you see just one number like "10 reps", use that for both repLow and repHigh
- Group exercises by their respective workout days and merge duplicate day labels into one day
- If nothing is readable, return {"days": []}`,
            },
            ...imageContent,
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "workout_split",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              days: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    label: { type: "string" },
                    exercises: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          name: { type: "string" },
                          sets: { type: "number" },
                          repLow: { type: "number" },
                          repHigh: { type: "number" },
                        },
                        required: ["name", "sets", "repLow", "repHigh"],
                      },
                    },
                  },
                  required: ["label", "exercises"],
                },
              },
            },
            required: ["days"],
          },
        },
      },
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response
    let parsedData: ParsedScreenshotPayload;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      parsedData = JSON.parse(cleanContent) as ParsedScreenshotPayload;
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "Could not read those screenshots. Try clearer images with visible exercise names and sets/reps." },
        { status: 500 }
      );
    }

    // Validate the structure
    if (!parsedData.days || !Array.isArray(parsedData.days)) {
      return NextResponse.json(
        { error: "Invalid workout data structure from screenshot" },
        { status: 500 }
      );
    }

    if (parsedData.days.length === 0) {
      return NextResponse.json(
        { error: "No workout details detected. Try brighter screenshots or crop tighter around the routine text." },
        { status: 422 }
      );
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("Error parsing screenshot:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse screenshot",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

    const formData = await request.formData();
    const file = formData.get("screenshot") as File;

    if (!file) {
      return NextResponse.json({ error: "No screenshot provided" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const mimeType = file.type || "image/png";

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this workout split screenshot and extract the exercise information. Return a JSON object with this exact structure:

{
  "days": [
    {
      "label": "Day name (e.g., Push Day, Leg Day, etc.)",
      "exercises": [
        {
          "name": "Exercise name (standardized, e.g., 'Barbell Bench Press')",
          "sets": 3,
          "repLow": 8,
          "repHigh": 12
        }
      ]
    }
  ]
}

Rules:
- Extract all workout days visible in the image
- Standardize exercise names to common gym terminology
- If sets/reps are not specified, use reasonable defaults (3 sets, 8-12 reps)
- If you see a rep range like "8-12", use 8 for repLow and 12 for repHigh
- If you see just one number like "10 reps", use that for both repLow and repHigh
- Group exercises by their respective workout days
- Return ONLY valid JSON, no markdown formatting or code blocks`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response
    let parsedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      parsedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "Failed to parse workout data from screenshot" },
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

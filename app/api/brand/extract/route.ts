import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { saveBrandProfile } from "@/lib/database/tracking-queries";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

/**
 * POST /api/brand/extract
 * Extract brand voice, tone, and key phrases from sample content using AI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, companyName, apiKey } = body;

    if (!content || !companyName) {
      return NextResponse.json(
        errorResponse("Content and company name are required", "MISSING_FIELDS"),
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        errorResponse("OpenAI API key is required", "API_KEY_MISSING"),
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    console.log("Analyzing brand voice with AI...");

    // Use GPT-4 to extract brand intelligence
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a brand intelligence analyst. Analyze the provided marketing content and extract:
1. Brand Voice: The overall personality and style of communication
2. Tone: The emotional quality (professional, friendly, authoritative, playful, etc.)
3. Key Phrases: 3-5 distinctive phrases or taglines that represent the brand
4. Core Values: 3-5 fundamental principles or beliefs the brand emphasizes
5. Target Audience: Who the content is aimed at

Return ONLY a valid JSON object with these exact keys:
{
  "brandVoice": "string describing the voice",
  "tone": "string describing the tone",
  "keyPhrases": ["phrase1", "phrase2", "phrase3"],
  "values": ["value1", "value2", "value3"],
  "targetAudience": "string describing the audience"
}`,
        },
        {
          role: "user",
          content: `Analyze this marketing content:\n\n${content}`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      response_format: { type: "json_object" },
    });

    const analysis = completion.choices[0].message.content;
    if (!analysis) {
      throw new Error("No analysis received from AI");
    }

    console.log("AI analysis complete");

    // Parse the AI response
    const extracted = JSON.parse(analysis);

    // Save to database (map camelCase to snake_case)
    const brandProfile = saveBrandProfile({
      company_name: companyName,
      brand_voice: extracted.brandVoice,
      tone: extracted.tone,
      key_phrases: extracted.keyPhrases,
      brand_values: extracted.values,
      target_audience: extracted.targetAudience,
    });

    console.log(`Brand profile saved: ${brandProfile.id}`);

    return NextResponse.json(
      successResponse(
        {
          brandVoice: extracted.brandVoice,
          tone: extracted.tone,
          keyPhrases: extracted.keyPhrases,
          values: extracted.values,
          targetAudience: extracted.targetAudience,
          profileId: brandProfile.id,
        },
        "Brand intelligence extracted successfully"
      )
    );
  } catch (error: unknown) {
    console.error("Error extracting brand voice:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      errorResponse(
        `Failed to extract brand intelligence: ${errorMessage}`,
        "EXTRACTION_ERROR"
      ),
      { status: 500 }
    );
  }
}

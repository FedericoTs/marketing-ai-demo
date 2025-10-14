import OpenAI from "openai";
import { CopyVariation } from "@/types/copywriting";
import { nanoid } from "nanoid";

export interface CompanyContext {
  companyName: string;
  industry: string;
  brandVoice: string;
  targetAudience: string;
}

export async function generateDMCreativeImage(
  message: string,
  context: CompanyContext,
  apiKey: string
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  // Miracle-Ear brand colors: Deep blue (#003E7E), Warm orange (#FF6B35), Clean white
  const imagePrompt = `A horizontal advertisement poster, flat graphic style, vibrant colors.

Left third: solid deep navy blue panel (#003E7E color).

Right two-thirds: warm photograph showing a joyful senior adult smiling, natural lighting, closeup portrait, emotional moment of connection and happiness.

Theme: ${message}

Style: professional healthcare advertisement, clean modern graphic, flat design, digital poster format, no text overlays, vivid photography on right, solid color block on left.

Flat vector advertisement style, sharp division between blue panel and photograph, horizontal layout, contemporary marketing aesthetic, simple clean composition.`;

  try {
    // Try minimal parameters first - gpt-image-1 doesn't support response_format
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
    });

    console.log("gpt-image-1 API Response structure:", {
      hasData: !!response.data,
      dataLength: response.data?.length,
      firstItem: response.data?.[0] ? Object.keys(response.data[0]) : null
    });

    // Check if response has URL (like DALL-E 3) or b64_json
    const firstItem = response.data?.[0];
    if (!firstItem) {
      console.error("No data in response:", response);
      throw new Error("No image data returned from gpt-image-1");
    }

    // Try URL first (most common)
    if (firstItem.url) {
      console.log("Got image URL from gpt-image-1");
      const imageResponse = await fetch(firstItem.url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      return `data:image/png;base64,${base64Image}`;
    }

    // Try b64_json
    if (firstItem.b64_json) {
      console.log("Got base64 image from gpt-image-1");
      return `data:image/png;base64,${firstItem.b64_json}`;
    }

    console.error("Unknown response format:", firstItem);
    throw new Error("Unexpected response format from gpt-image-1");
  } catch (error) {
    console.error("Error generating DM creative image with gpt-image-1:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    throw error;
  }
}

export async function generateCopyVariations(
  prompt: string,
  context: CompanyContext,
  apiKey: string
): Promise<CopyVariation[]> {
  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an expert marketing copywriter for ${context.companyName}, a trusted leader in ${context.industry} since 1948.

BRAND VOICE & POSITIONING:
${context.brandVoice}

TARGET AUDIENCE INSIGHTS:
${context.targetAudience}

MIRACLE-EAR CORE VALUES (use these in your copy):
- "We build relationships that last a lifetime"
- 75+ years of trusted hearing care excellence
- Leading-edge technology (GENIUS™, MIRAGE™, BLISS™ platforms)
- Lifetime aftercare at no charge
- Over 1,500 locations nationwide
- Discreet, comfortable, custom solutions

KEY EMOTIONAL APPEALS TO USE:
✓ Reconnect with loved ones and precious moments
✓ Rediscover joy in conversations, music, nature sounds
✓ Maintain independence and confidence in social situations
✓ Remove barriers, not highlight limitations
✓ Transform lives through better hearing, not just "fix" a problem
✓ Address fear of stigma with discretion and modern technology

CUSTOMER PAIN POINTS TO ADDRESS:
- Fear that hearing aids are a "constant reminder I am flawed"
- Concerns about cost, size, complexity
- Stigma and embarrassment about hearing loss
- Missing out on family gatherings, conversations, life's moments
- Feeling isolated or left out
- Worry about looking "old" or "disabled"

MARKETING BEST PRACTICES:
- Use storytelling and real-life transformations
- Focus on benefits (comfort, ease, reconnection) not just features
- Build trust through compassionate, understanding language
- Humanize the technology - it's about people, not devices
- Celebrate what customers GAIN, not what they've lost

Generate 5-6 powerful, emotionally resonant marketing variations based on the user's input. Each should be optimized for different platforms and audience segments within our target market.

IMPORTANT: Return ONLY valid JSON in this exact format:

{
  "variations": [
    {
      "content": "Compelling copy that speaks to emotions and benefits. Use real scenarios, paint vivid pictures of reconnection. Include specific Miracle-Ear differentiators when relevant.",
      "platform": "Platform (Email Subject, Facebook Post, Google Ad, Direct Mail Headline, Print Ad, SMS, Landing Page Hero)",
      "audience": "Specific segment (First-time Users 55-65, Concerned Adult Children, Active Seniors, Reluctant First-Timers, Tech-Savvy Boomers, Spouse/Family Member)",
      "tone": "Emotional tone (Warm & Reassuring, Empowering & Hopeful, Urgent & Caring, Inspirational, Educational & Trustworthy)"
    }
  ]
}

Make each variation unique, emotionally compelling, and immediately actionable. Focus on transformation stories and specific life moments.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    console.log("OpenAI Response:", responseContent); // Debug log

    const parsed = JSON.parse(responseContent);
    const variations = Array.isArray(parsed) ? parsed : (parsed.variations || []);

    if (!Array.isArray(variations) || variations.length === 0) {
      console.error("Invalid variations format:", parsed);
      throw new Error("No variations generated");
    }

    return variations.map((v: Omit<CopyVariation, "id">) => ({
      id: nanoid(),
      content: v.content || "",
      platform: v.platform || "General",
      audience: v.audience || "General Audience",
      tone: v.tone,
    }));
  } catch (error) {
    console.error("Error generating copy variations:", error);
    throw error;
  }
}

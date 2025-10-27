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
  apiKey: string,
  sceneDescription?: string // NEW: Optional scene description from form
): Promise<string> {
  // CRITICAL: High-quality image generation can take 30-60+ seconds
  // OpenAI SDK v6 uses fetch API - timeout parameter controls AbortSignal timeout
  const openai = new OpenAI({
    apiKey,
    timeout: 180 * 1000,  // Request timeout: 3 minutes (180 seconds)
  });

  // Build prompt based on whether scene description is provided
  let imagePrompt: string;

  if (sceneDescription) {
    // Use custom scene description from user
    console.log('🎨 Using custom scene description for image generation');
    imagePrompt = `A horizontal advertisement poster, flat graphic style, vibrant colors.

Left third: solid deep navy blue panel (#003E7E color).

Right two-thirds: ${sceneDescription}

Style: professional healthcare advertisement, clean modern graphic, flat design, digital poster format, NO TEXT OVERLAYS, NO LOGOS, vivid photography on right, solid color block on left.

Flat vector advertisement style, sharp division between blue panel and photograph, horizontal layout, contemporary marketing aesthetic, simple clean composition.

CRITICAL: NO company logos, NO brand marks, NO text or typography of any kind. Photography ONLY.`;
  } else {
    // Use default prompt
    console.log('🎨 Using default scene description');
    imagePrompt = `A horizontal advertisement poster, flat graphic style, vibrant colors.

Left third: solid deep navy blue panel (#003E7E color).

Right two-thirds: warm photograph showing a joyful senior adult smiling, natural lighting, closeup portrait, emotional moment of connection and happiness.

Theme: ${message}

Style: professional healthcare advertisement, clean modern graphic, flat design, digital poster format, no text overlays, vivid photography on right, solid color block on left.

Flat vector advertisement style, sharp division between blue panel and photograph, horizontal layout, contemporary marketing aesthetic, simple clean composition.`;
  }

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

/**
 * Legacy V1 function WITH size parameter support
 * Used as final fallback when all V2 attempts fail
 */
export async function generateDMCreativeImageWithSize(
  message: string,
  context: CompanyContext,
  apiKey: string,
  size: string = "1024x1024"
): Promise<{ imageUrl: string; promptUsed: string; metadata: any }> {
  const openai = new OpenAI({ apiKey });

  const imagePrompt = `A ${size.includes('1536x1024') ? 'horizontal' : size.includes('1024x1536') ? 'vertical' : 'square'} advertisement poster, flat graphic style, vibrant colors.

Left third: solid deep navy blue panel (#003E7E color).

Right two-thirds: warm photograph showing a joyful senior adult smiling, natural lighting, closeup portrait, emotional moment of connection and happiness.

Theme: ${message}

Style: professional healthcare advertisement, clean modern graphic, flat design, digital poster format, no text overlays, vivid photography on right, solid color block on left.

Flat vector advertisement style, sharp division between blue panel and photograph, ${size.includes('1536x1024') ? 'horizontal' : size.includes('1024x1536') ? 'vertical' : 'square'} layout, contemporary marketing aesthetic, simple clean composition.`;

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      n: 1,
      size: size as "1024x1024" | "1536x1024" | "1024x1536",
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

    let imageUrl: string;

    // Try URL first (most common)
    if (firstItem.url) {
      console.log("Got image URL from gpt-image-1");
      const imageResponse = await fetch(firstItem.url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      imageUrl = `data:image/png;base64,${base64Image}`;
    }
    // Try b64_json
    else if (firstItem.b64_json) {
      console.log("Got base64 image from gpt-image-1");
      imageUrl = `data:image/png;base64,${firstItem.b64_json}`;
    }
    else {
      console.error("Unknown response format:", firstItem);
      throw new Error("Unexpected response format from gpt-image-1");
    }

    return {
      imageUrl,
      promptUsed: imagePrompt,
      metadata: {
        quality: 'standard',
        size: size,
        model: 'gpt-image-1',
        generatedAt: new Date().toISOString(),
      }
    };
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
  apiKey: string,
  brandProfile: any = null
): Promise<CopyVariation[]> {
  const openai = new OpenAI({ apiKey });

  // Build dynamic system prompt based on whether brand profile exists
  let systemPrompt = `You are an expert marketing copywriter for ${context.companyName}, a leader in ${context.industry}.

BRAND VOICE & POSITIONING:
${context.brandVoice}

TARGET AUDIENCE INSIGHTS:
${context.targetAudience}`;

  // Add brand intelligence if available
  if (brandProfile) {
    const keyPhrases = brandProfile.key_phrases ? JSON.parse(brandProfile.key_phrases) : [];
    const values = brandProfile.brand_values ? JSON.parse(brandProfile.brand_values) : [];

    systemPrompt += `

🎯 ENHANCED BRAND INTELLIGENCE (AI-Extracted):

Brand Voice: ${brandProfile.brand_voice || 'Professional and engaging'}
Tone: ${brandProfile.tone || 'Trustworthy and approachable'}
Industry: ${brandProfile.industry || context.industry}

${keyPhrases.length > 0 ? `Key Brand Phrases to Incorporate Naturally:
${keyPhrases.map((p: string) => `• "${p}"`).join('\n')}
` : ''}

${values.length > 0 ? `Core Brand Values to Reflect:
${values.map((v: string) => `• ${v}`).join('\n')}
` : ''}

${brandProfile.target_audience ? `Primary Target Audience: ${brandProfile.target_audience}` : ''}

CRITICAL: Generate copy that EMBODIES this brand voice authentically.`;
  }

  systemPrompt += `

MARKETING BEST PRACTICES:
- Use storytelling and real-life scenarios
- Focus on benefits (outcomes, transformations) not just features
- Build trust through authentic, understanding language
- Make it relatable and emotionally resonant
- Celebrate what customers gain, not what they've lost
- Be specific and actionable

Generate 5-6 compelling marketing campaign variations based on the user's input. Each should have:
1. A unique, memorable CAMPAIGN TITLE that captures the essence of the message
2. Compelling marketing copy optimized for different audience segments
3. Clear emotional tone and targeting

IMPORTANT: Return ONLY valid JSON in this exact format:

{
  "variations": [
    {
      "content": "Compelling marketing copy that speaks to emotions and benefits. Use real scenarios, paint vivid pictures of reconnection. Include specific brand differentiators when relevant. This is the actual marketing message that will be used in direct mail, emails, and landing pages.",
      "platform": "Unique Campaign Title (e.g., 'Rediscover Family Moments', 'Hear Life Clearly Again', 'Spring Hearing Health Initiative', 'Sound Connection Campaign')",
      "audience": "Specific segment (First-time Users 55-65, Concerned Adult Children, Active Seniors, Reluctant First-Timers, Tech-Savvy Boomers, Spouse/Family Member)",
      "tone": "Emotional tone (Warm & Reassuring, Empowering & Hopeful, Urgent & Caring, Inspirational, Educational & Trustworthy)"
    }
  ]
}

Make each variation unique with:
- A distinctive campaign title that could be used across all marketing channels
- Emotionally compelling copy focused on transformation stories
- Specific life moments and real scenarios
- Clear differentiation between each campaign concept`;

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

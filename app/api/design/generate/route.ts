import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Canvas dimensions for 6x4 postcard at 300 DPI
const CANVAS_WIDTH = 1800; // 6 inches * 300 DPI
const CANVAS_HEIGHT = 1200; // 4 inches * 300 DPI

const SYSTEM_PROMPT = `You are an expert graphic designer assistant that generates Fabric.js canvas JSON for direct mail postcards.

Canvas specifications:
- Dimensions: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}px (6"x4" at 300 DPI)
- Objects use high-resolution coordinates (300 DPI scale)

You must generate a valid JSON response with this exact structure:
{
  "clearCanvas": boolean,
  "backgroundColor": string (hex color),
  "objects": [
    {
      "type": "rect" | "circle" | "i-text",
      "left": number,
      "top": number,
      "width": number,
      "height": number,
      "fill": string (hex color),
      "stroke": string (hex color),
      "strokeWidth": number,
      // For text objects:
      "text": string,
      "fontSize": number (scaled for 300 DPI, e.g. 60-120),
      "fontFamily": "Arial" | "Helvetica" | "Georgia" | "Times New Roman",
      "fontWeight": number,
      // For circles:
      "radius": number
    }
  ]
}

Design guidelines:
1. Use professional color combinations
2. Text should be 60-120px for headers, 40-60px for body (300 DPI scale)
3. Position objects strategically within the canvas
4. Use proper spacing and margins (100-200px margins)
5. Create balanced, visually appealing layouts
6. Limit to 5-10 objects for clean design
7. Always include a prominent headline
8. Use complementary colors

Common postcard layouts:
- Header (top 300px): Title text
- Middle (300-900px): Main content/message
- Bottom (900-1200px): Call-to-action or contact info

Respond ONLY with valid JSON. No markdown, no explanations.`;

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Call OpenAI to generate design
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Create a direct mail postcard design based on this description: "${prompt}"\n\nGenerate Fabric.js JSON with appropriate objects, colors, and text.`
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const designJSON = completion.choices[0].message.content;

    if (!designJSON) {
      throw new Error('No design generated');
    }

    // Parse and validate the JSON
    const design = JSON.parse(designJSON);

    // Validate required fields
    if (!design.objects || !Array.isArray(design.objects)) {
      throw new Error('Invalid design structure: missing objects array');
    }

    return NextResponse.json({ design });
  } catch (error) {
    console.error('Design generation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate design',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

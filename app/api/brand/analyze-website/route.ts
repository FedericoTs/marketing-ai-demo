import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * POST /api/brand/analyze-website
 * Analyze a website and extract brand DNA using AI
 */
export async function POST(request: NextRequest) {
  try {
    const { websiteUrl } = await request.json();

    if (!websiteUrl) {
      return NextResponse.json(
        { success: false, error: 'Website URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let url: URL;
    try {
      url = new URL(websiteUrl);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log(`🔍 Analyzing website: ${websiteUrl}`);

    // Step 1: Fetch website HTML
    const htmlResponse = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!htmlResponse.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch website (${htmlResponse.status})` },
        { status: 500 }
      );
    }

    const htmlContent = await htmlResponse.text();
    console.log('✅ HTML fetched successfully');

    // Step 2: Extract company name from HTML title/meta
    const companyName = extractCompanyName(htmlContent, url.hostname);
    console.log(`📛 Company name: ${companyName}`);

    // Step 3: Extract colors from CSS/HTML
    const colors = extractColorsFromHTML(htmlContent);
    console.log(`🎨 Colors extracted:`, colors);

    // Step 4: Extract fonts from CSS
    const fonts = extractFontsFromHTML(htmlContent);
    console.log(`📝 Fonts extracted:`, fonts);

    // Step 5: Extract logo URL from HTML
    const logoUrl = extractLogoUrl(htmlContent, url.origin);
    console.log(`🖼️ Logo URL: ${logoUrl}`);

    // Step 6: Analyze brand voice with GPT-4 (text only - no screenshot needed!)
    const openai = new OpenAI({ apiKey });

    // Extract visible text content from HTML
    const textContent = extractTextContent(htmlContent);

    const analysisPrompt = `You are a brand strategist analyzing this website to extract comprehensive brand guidelines for marketing campaign creation.

Analyze the website content and provide detailed brand intelligence:

**Website:** ${url.hostname}
**Company:** ${companyName}

**Text Content Sample:**
${textContent.slice(0, 4000)}

Extract the following information for marketing campaign use:

1. **Brand Voice** (2-3 detailed sentences): Describe the complete communication style, personality, and approach. Include specific characteristics like formality level, energy, expertise positioning, and relationship with audience. Be detailed enough that a copywriter could replicate this voice.

2. **Tone** (1-2 sentences): The emotional quality and feeling of communications - warm/professional/authoritative/friendly/empathetic/confident etc.

3. **Target Audience** (1-2 sentences): Primary customer demographic with specifics - age ranges, life situations, pain points, and what they're seeking.

4. **Industry**: Business category (healthcare/retail/technology/finance/professional services/etc.)

5. **Key Phrases** (3-7 phrases): Distinctive phrases, taglines, or word patterns the brand consistently uses. These will be incorporated into campaigns.

6. **Brand Values** (3-5 values): Core values evident in messaging - what the brand stands for.

7. **Communication Style Notes** (2-3 bullet points): Specific guidance for marketing copy:
   - Word choices to use/avoid
   - Sentence structure preferences (short & punchy vs. detailed & explanatory)
   - Level of formality
   - Use of technical terms vs. plain language
   - Emotional appeal approach

8. **Recommended Template**: Best landing page template (professional/healthcare/retail/modern/classic)

Return ONLY a JSON object with this exact structure:
{
  "brandVoice": "detailed 2-3 sentence description of complete communication style",
  "tone": "emotional quality description",
  "targetAudience": "detailed demographic with specifics",
  "industry": "category",
  "keyPhrases": ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  "brandValues": ["value1", "value2", "value3", "value4"],
  "communicationStyleNotes": ["note1", "note2", "note3"],
  "recommendedTemplate": "template name"
}`;

    console.log('🤖 Calling GPT-4 for brand voice analysis...');

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert brand strategist who analyzes websites to extract detailed brand guidelines for marketing campaigns. You MUST provide comprehensive, detailed descriptions (2-3 full sentences minimum) for brandVoice. You MUST include communicationStyleNotes array with 3 specific bullet points. Always return valid JSON only with ALL required fields."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const analysisText = response.choices[0].message.content || '{}';
    console.log('📊 AI Analysis Result:', analysisText);

    // Parse JSON response
    let brandData;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      brandData = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Provide defaults if parsing fails
      brandData = {
        brandVoice: 'Professional and trustworthy communication style with balanced formality. Focuses on building credibility through expertise while maintaining approachability.',
        tone: 'Warm and reassuring with professional confidence',
        targetAudience: 'General consumers seeking quality products or services',
        industry: 'General',
        keyPhrases: [],
        brandValues: [],
        communicationStyleNotes: [
          'Use clear, jargon-free language',
          'Balance professionalism with warmth',
          'Focus on customer benefits'
        ],
        recommendedTemplate: 'professional'
      };
    }

    // Return extracted brand data
    return NextResponse.json({
      success: true,
      data: {
        // Company Profile
        companyName,
        industry: brandData.industry || 'General',
        brandVoice: brandData.brandVoice || 'Professional and trustworthy',
        tone: brandData.tone || 'Warm and reassuring',
        targetAudience: brandData.targetAudience || 'General consumers',
        keyPhrases: brandData.keyPhrases || [],
        brandValues: brandData.brandValues || [],
        communicationStyleNotes: brandData.communicationStyleNotes || [],
        websiteUrl,
        // Visual Brand Kit
        logoUrl,
        primaryColor: colors.primary || '#1E3A8A',
        secondaryColor: colors.secondary || '#FF6B35',
        accentColor: colors.accent || '#10B981',
        headingFont: fonts.heading || 'Inter',
        bodyFont: fonts.body || 'Open Sans',
        landingPageTemplate: brandData.recommendedTemplate || 'professional',
      },
      message: 'Website analyzed successfully - comprehensive brand guidelines extracted',
    });

  } catch (error) {
    console.error('Error analyzing website:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze website'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract colors from HTML/CSS
 */
function extractColorsFromHTML(html: string): { primary: string; secondary: string; accent: string } {
  const colors: string[] = [];

  // Extract hex colors from inline styles and CSS
  const hexPattern = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/g;
  const matches = html.match(hexPattern) || [];

  // Normalize 3-digit hex to 6-digit
  const normalizedColors = matches.map(color => {
    if (color.length === 4) {
      // #RGB -> #RRGGBB
      const r = color[1];
      const g = color[2];
      const b = color[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return color.toUpperCase();
  });

  // Count frequency
  const colorCount: { [key: string]: number } = {};
  normalizedColors.forEach(color => {
    colorCount[color] = (colorCount[color] || 0) + 1;
  });

  // Sort by frequency
  const sortedColors = Object.entries(colorCount)
    .sort(([, a], [, b]) => b - a)
    .map(([color]) => color)
    .filter(color => {
      // Filter out white, black, and very light/dark colors
      const hex = color.substring(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r + g + b) / 3;
      return brightness > 30 && brightness < 225; // Not too dark or light
    });

  return {
    primary: sortedColors[0] || '#1E3A8A',
    secondary: sortedColors[1] || '#FF6B35',
    accent: sortedColors[2] || '#10B981',
  };
}

/**
 * Extract fonts from HTML/CSS
 */
function extractFontsFromHTML(html: string): { heading: string; body: string } {
  const fonts: string[] = [];

  // Extract from font-family CSS properties
  const fontFamilyPattern = /font-family:\s*([^;}]+)/gi;
  let match;

  while ((match = fontFamilyPattern.exec(html)) !== null) {
    const fontFamily = match[1].trim();
    // Clean up quotes and fallback fonts
    const cleanFont = fontFamily
      .split(',')[0] // Take first font only
      .replace(/['"]/g, '') // Remove quotes
      .trim();

    if (cleanFont && !cleanFont.includes('sans-serif') && !cleanFont.includes('serif')) {
      fonts.push(cleanFont);
    }
  }

  // Common font names to prioritize
  const commonFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Lato',
    'Raleway', 'Playfair Display', 'Merriweather', 'Source Sans Pro'
  ];

  const foundCommonFont = fonts.find(font =>
    commonFonts.some(common => font.toLowerCase().includes(common.toLowerCase()))
  );

  return {
    heading: foundCommonFont || fonts[0] || 'Inter',
    body: fonts[1] || foundCommonFont || 'Open Sans',
  };
}

/**
 * Extract visible text content from HTML
 */
function extractTextContent(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Extract company name from HTML
 */
function extractCompanyName(html: string, hostname: string): string {
  // Try to extract from <title>
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    let title = titleMatch[1].trim();
    // Clean up common patterns
    title = title.replace(/\s*[-|]\s*(Home|Welcome|Official Site|Website).*$/i, '');
    if (title && title.length > 0 && title.length < 100) {
      return title;
    }
  }

  // Try meta property="og:site_name"
  const ogSiteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
  if (ogSiteMatch) {
    return ogSiteMatch[1].trim();
  }

  // Try meta name="application-name"
  const appNameMatch = html.match(/<meta\s+name=["']application-name["']\s+content=["']([^"']+)["']/i);
  if (appNameMatch) {
    return appNameMatch[1].trim();
  }

  // Fallback to hostname
  const name = hostname.replace(/^www\./, '').split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Extract logo URL from HTML
 */
function extractLogoUrl(html: string, origin: string): string {
  // Common logo selectors
  const logoPatterns = [
    /<link\s+rel=["']icon["']\s+href=["']([^"']+)["']/i,
    /<link\s+rel=["']apple-touch-icon["']\s+href=["']([^"']+)["']/i,
    /<img[^>]+class=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']*logo[^"']+)["']/i,
    /<img[^>]+alt=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
  ];

  for (const pattern of logoPatterns) {
    const match = html.match(pattern);
    if (match) {
      let logoUrl = match[1];
      // Make absolute URL
      if (logoUrl.startsWith('//')) {
        logoUrl = 'https:' + logoUrl;
      } else if (logoUrl.startsWith('/')) {
        logoUrl = origin + logoUrl;
      } else if (!logoUrl.startsWith('http')) {
        logoUrl = origin + '/' + logoUrl;
      }
      return logoUrl;
    }
  }

  // Return empty if not found
  return '';
}

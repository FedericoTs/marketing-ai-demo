/**
 * OpenAI Image Generation V2
 * Advanced image generation with quality levels, aspect ratios, and cost optimization
 *
 * This is a parallel implementation to the existing system (V1).
 * Can be easily switched via environment variable for rollback.
 *
 * === HIGH-QUALITY IMAGE GENERATION BEST PRACTICES ===
 *
 * PRIMARY MODEL: gpt-image-1
 * - Supports: 1024x1024, 1536x1024, 1024x1536
 * - Quality levels: low, medium, high
 * - Best for: Direct mail, marketing materials, professional layouts
 * - Cost: $0.040-$0.096 per image (varies by quality & size)
 *
 * FALLBACK MODEL: dall-e-3
 * - Supports: 1024x1024, 1024x1792, 1792x1024
 * - Quality: standard or hd
 * - Automatic size mapping from V2 sizes
 * - Cost: $0.040-$0.120 per image (actual OpenAI pricing)
 *
 * RECOMMENDED SETTINGS FOR HIGH QUALITY:
 * - Quality: 'high' or 'medium' (both map to 'hd' in dall-e-3)
 * - Size: 1536x1024 (landscape) or 1024x1536 (portrait) for DM postcards
 * - Layout: Use template-aware generation (classic/modern/minimal/premium)
 * - Prompt Style: 'professional' for business materials
 * - No Logo Strength: 10 (maximum) to prevent AI from hallucinating logos
 * - Timeout: 120 seconds (2 minutes) - CRITICAL for high-quality generation
 *
 * SIZE MAPPING (V2 → DALL-E 3):
 * - 1024x1024 → 1024x1024 (square, no change)
 * - 1536x1024 → 1792x1024 (landscape, closest match)
 * - 1024x1536 → 1024x1792 (portrait, closest match)
 *
 * QUALITY MAPPING (V2 → DALL-E 3):
 * - high → hd
 * - medium → hd (optimized for best results)
 * - low → standard
 */

import OpenAI from "openai";

export interface CompanyContext {
  companyName: string;
  industry: string;
  brandVoice: string;
  targetAudience: string;
}

export type ImageQuality = 'low' | 'medium' | 'high';
export type ImageSize = '1024x1024' | '1536x1024' | '1024x1536';

export interface ImageGenerationOptions {
  message: string;
  context: CompanyContext;
  apiKey: string;
  quality: ImageQuality;
  size: ImageSize;
  layoutTemplate?: string; // Layout template for template-aware image generation
  brandConfig?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    industry?: string;
  };
  // Fine-tuning parameters from modal
  promptStyle?: 'natural' | 'professional' | 'artistic' | 'vibrant';
  noLogoStrength?: number; // 1-10 scale for NO LOGO enforcement
  customInstructions?: string; // Additional user-provided instructions
  customSceneDescription?: string; // NEW: User-provided scene description (optional, shown in advanced settings)
}

export interface ImageGenerationResult {
  imageUrl: string;
  promptUsed?: string; // For debugging and fine-tuning
  metadata: {
    quality: ImageQuality;
    size: ImageSize;
    estimatedCost: number;
    generatedAt: string;
    model: string;
  };
}

/**
 * Calculate estimated cost based on quality and size
 * Based on OpenAI gpt-image-1 pricing (approximate)
 */
export function calculateImageCost(quality: ImageQuality, size: ImageSize): number {
  // Base costs per quality level (approximate as of 2025)
  const qualityCosts = {
    low: 0.040,
    medium: 0.060,
    high: 0.080,
  };

  // Size multiplier (landscape/portrait images may have slight variations)
  const sizeMultipliers: Record<ImageSize, number> = {
    '1024x1024': 1.0,    // Square (standard)
    '1536x1024': 1.2,    // Landscape (more pixels)
    '1024x1536': 1.2,    // Portrait (more pixels)
  };

  const baseCost = qualityCosts[quality];
  const sizeMultiplier = sizeMultipliers[size];

  return Number((baseCost * sizeMultiplier).toFixed(3));
}

/**
 * Calculate DALL-E 3 cost based on actual OpenAI pricing
 * https://openai.com/api/pricing/
 */
function calculateDalle3Cost(
  quality: 'standard' | 'hd',
  size: '1024x1024' | '1024x1792' | '1792x1024'
): number {
  // DALL-E 3 actual pricing (as of October 2024)
  const pricing = {
    'standard': {
      '1024x1024': 0.040,
      '1024x1792': 0.080,
      '1792x1024': 0.080,
    },
    'hd': {
      '1024x1024': 0.080,
      '1024x1792': 0.120,
      '1792x1024': 0.120,
    },
  };

  return pricing[quality][size];
}

/**
 * Generate DM Creative Image V2
 * Enhanced version with quality levels and aspect ratios
 */
export async function generateDMCreativeImageV2(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const { message, context, apiKey, quality, size, layoutTemplate, brandConfig, promptStyle, noLogoStrength, customInstructions, customSceneDescription } = options;

  // CRITICAL: High-quality image generation can take 60-90+ seconds
  // OpenAI SDK v6 uses fetch API - timeout parameter controls AbortSignal timeout
  const openai = new OpenAI({
    apiKey,
    timeout: 180 * 1000,  // Request timeout: 3 minutes (180 seconds) - enough for high-quality generations
    maxRetries: 0,        // We handle retries manually with exponential backoff
  });

  // Build enhanced prompt based on brand context AND layout template AND fine-tuning params AND custom scene
  const imagePrompt = await buildImagePrompt(
    message,
    context,
    size,
    layoutTemplate || 'classic',
    brandConfig,
    promptStyle,
    noLogoStrength,
    customInstructions,
    customSceneDescription  // NEW: Pass custom scene description
  );

  console.log(`🎨 Generating image V2: ${quality} quality, ${size} size, ${layoutTemplate || 'classic'} layout, style: ${promptStyle || 'default'}`);

  // Retry logic for transient network errors (ECONNRESET, timeouts)
  const maxRetries = 2;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff: 2s, 4s
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
        n: 1,
        size: size,
        quality: quality, // Use the quality parameter
      });

      console.log("✅ gpt-image-1 V2 response received");

      const firstItem = response.data?.[0];
      if (!firstItem) {
        throw new Error("No image data returned from gpt-image-1");
      }

      let imageUrl: string;

      // Handle URL response
      if (firstItem.url) {
        console.log("📥 Fetching image from URL...");
        const imageResponse = await fetch(firstItem.url);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString("base64");
        imageUrl = `data:image/png;base64,${base64Image}`;
      }
      // Handle b64_json response
      else if (firstItem.b64_json) {
        console.log("📦 Using base64 image from response");
        imageUrl = `data:image/png;base64,${firstItem.b64_json}`;
      }
      else {
        throw new Error("Unexpected response format from gpt-image-1");
      }

      // Calculate cost
      const estimatedCost = calculateImageCost(quality, size);

      console.log(`💰 Estimated cost: $${estimatedCost.toFixed(3)}`);

      return {
        imageUrl,
        promptUsed: imagePrompt, // Include prompt for fine-tuning debugging
        metadata: {
          quality,
          size,
          estimatedCost,
          generatedAt: new Date().toISOString(),
          model: 'gpt-image-1',
        },
      };

    } catch (error) {
      lastError = error;

      // Check if error is retryable (network errors)
      const isRetryable = error instanceof Error && (
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('terminated') ||
        error.message.includes('network')
      );

      if (!isRetryable || attempt === maxRetries) {
        console.error(`❌ Error generating image V2 (attempt ${attempt}/${maxRetries}):`, error);

        // If error is due to quality parameter, try fallback to lower quality
        if (error instanceof Error && error.message.includes('quality') && quality !== 'low') {
          console.log("⚠️ Falling back to lower quality...");
          return generateDMCreativeImageV2({
            ...options,
            quality: quality === 'high' ? 'medium' : 'low',
          });
        }

        break; // Exit retry loop, will throw error below
      }

      console.warn(`⚠️ Retryable error on attempt ${attempt}/${maxRetries}:`, error instanceof Error ? error.message : error);
      // Continue to next retry attempt
    }
  }

  // If we get here, all retries failed
  throw lastError;
}

/**
 * Fetch brand configuration for enhanced image generation
 */
async function fetchBrandConfig(companyName: string): Promise<any> {
  try {
    // In server context, we'd query the database directly
    // For now, return null and let the caller provide brand config
    return null;
  } catch (error) {
    console.error('Error fetching brand config:', error);
    return null;
  }
}

/**
 * Get photography style description based on promptStyle
 */
function getStyleDescription(promptStyle: string): string {
  switch (promptStyle) {
    case 'natural':
      return 'Natural, authentic, candid moments with soft lighting';
    case 'professional':
      return 'Professional commercial photography, high resolution, polished';
    case 'artistic':
      return 'Artistic, creative composition with unique perspective and visual storytelling';
    case 'vibrant':
      return 'Vibrant, energetic, bold colors with dynamic composition';
    default:
      return 'Professional commercial photography, high resolution';
  }
}

/**
 * Get color grading description based on promptStyle
 */
function getColorGradingDescription(promptStyle: string): string {
  switch (promptStyle) {
    case 'natural':
      return 'Natural color palette, minimal processing, authentic tones';
    case 'professional':
      return 'Warm tones, professional color correction, slight film grain for authenticity';
    case 'artistic':
      return 'Creative color grading with stylized tones and mood enhancement';
    case 'vibrant':
      return 'Rich, saturated colors with high contrast and punchy vibrancy';
    default:
      return 'Warm tones, professional color correction, slight film grain for authenticity';
  }
}

/**
 * Get NO LOGO instructions based on enforcement strength
 */
function getNoLogoInstructions(strength: number, companyName: string, primaryColor: string): string {
  // Base instructions (always included)
  let instructions = `❌ CRITICAL REQUIREMENTS - ABSOLUTELY NO TEXT OR LOGOS ❌:
- DO NOT generate ANY company logos, brand marks, or symbols
- DO NOT include the company name "${companyName}" as text or logo
- DO NOT draw ANY letters, words, typography, or text elements
- The ${primaryColor} panel must be COMPLETELY EMPTY - just solid color
- This is a PHOTOGRAPHY ONLY image - no graphics, no branding, no text`;

  // Add additional emphasis based on strength
  if (strength >= 9) {
    instructions += `
- ⚠️ MAXIMUM ENFORCEMENT MODE ACTIVE ⚠️
- ANY text, logo, or graphic element will FAIL the output
- The image must be 100% photographic content ONLY
- Zero tolerance for ANY branded elements whatsoever
- Leave logo areas COMPLETELY BLANK - they will be digitally added later
- Violating ANY of these rules will result in UNUSABLE output that must be rejected`;
  } else if (strength >= 7) {
    instructions += `
- DO NOT create graphic symbols, icons, or branded elements
- Leave the logo area BLANK - it will be digitally added later
- Violating this will result in unusable output`;
  } else if (strength >= 5) {
    instructions += `
- Avoid any text-like shapes or patterns
- Keep panel areas clean and empty`;
  }

  return instructions;
}

/**
 * Generate a highly specific scene description based on campaign message and context
 * This creates detailed, photography-grade scene specifications for DALL-E
 *
 * DEFAULT BEHAVIOR: Always pictures social life situations (NOT crowded)
 * - Focus on 1-2 people maximum for intimate, relatable scenes
 * - Natural social interactions (conversations, shared moments)
 * - Warm, inviting atmospheres
 * - Avoids large groups, crowds, or busy environments
 */
function generateSceneDescription(
  message: string,
  context: CompanyContext,
  promptStyle: string = 'professional',
  customSceneDescription?: string  // NEW: Optional user-provided scene
): string {
  // If user provided a custom scene description, use it directly
  if (customSceneDescription && customSceneDescription.trim().length > 10) {
    console.log('🎬 Using custom scene description from user');
    return customSceneDescription.trim();
  }

  // INTELLIGENT MESSAGE ANALYSIS - Extract campaign themes, events, and context
  const messageLower = message.toLowerCase();

  // Extract age demographic
  const ageMatch = context.targetAudience?.match(/(\d+)-(\d+)/);
  const targetAge = ageMatch ? parseInt(ageMatch[1]) : 65;
  const ageRangeStr = ageMatch ? `${ageMatch[1]}-${ageMatch[2]}` : '60-75';

  // CAMPAIGN THEME DETECTION
  const themes = {
    // Seasonal/Holiday events
    halloween: messageLower.includes('halloween') || messageLower.includes('trick') || messageLower.includes('treat'),
    christmas: messageLower.includes('christmas') || messageLower.includes('holiday') || messageLower.includes('festive'),
    thanksgiving: messageLower.includes('thanksgiving') || messageLower.includes('grateful'),
    summer: messageLower.includes('summer') || messageLower.includes('bbq') || messageLower.includes('outdoor'),

    // Social/Promotional mechanics
    bringFriend: messageLower.includes('bring a friend') || messageLower.includes('bring friend') || messageLower.includes('refer'),
    social: messageLower.includes('party') || messageLower.includes('event') || messageLower.includes('gather'),
    family: messageLower.includes('family') || messageLower.includes('grandchild') || messageLower.includes('loved one'),

    // Product/Service specific (hearing aids)
    hearing: messageLower.includes('hear') || messageLower.includes('listen') || messageLower.includes('sound') || messageLower.includes('conversation'),
    technology: messageLower.includes('technology') || messageLower.includes('device') || messageLower.includes('innovation'),

    // Emotional tones
    celebration: messageLower.includes('celebrate') || messageLower.includes('special') || messageLower.includes('enjoy'),
    connection: messageLower.includes('connect') || messageLower.includes('together') || messageLower.includes('share'),
  };

  // Build scene elements based on MESSAGE THEMES (not just industry)
  let sceneDescription = '';

  // SCENARIO 1: Halloween + Bring a Friend + Hearing
  if (themes.halloween && themes.bringFriend && themes.hearing) {
    sceneDescription = `Two friends in their ${targetAge}s enjoying festive autumn atmosphere together, both smiling warmly at each other in animated conversation (NOT crowded - just 2 people). Setting: Cozy home decorated with tasteful fall/autumn decor (NOT costumes - subtle pumpkins, autumn leaves, warm amber lighting), large windows with golden hour sunlight. One person gesturing expressively while speaking, the other leaning in attentively listening with clear delight - showcasing the joy of hearing conversation clearly. Wearing comfortable autumn sweaters in rust, burgundy, or warm orange tones. Natural bokeh background with soft fall colors. Premium lifestyle photography capturing genuine friendship and the pleasure of effortless communication. Intimate social moment, NOT a party or gathering. Style: Apple commercial meets Hallmark autumn aesthetic - warm, inviting, celebrating connection.`;
  }
  // SCENARIO 2: Halloween theme (general)
  else if (themes.halloween) {
    sceneDescription = `${targetAge}-year-old person in warm autumn setting, subtle Halloween/fall atmosphere (amber lighting, pumpkins in soft-focus background, burgundy/orange color palette). Genuine smile showing comfort and enjoyment of the season. NOT wearing costumes - elegant autumn fashion (cashmere sweater, earth tones). Modern home with tasteful seasonal decor visible but blurred. Natural window light with golden hour warmth. Professional lifestyle photography - Getty Images quality, NOT stock, celebrating autumn traditions with sophistication.`;
  }
  // SCENARIO 3: Bring a Friend / Social referral
  else if (themes.bringFriend || (themes.social && themes.hearing)) {
    sceneDescription = `Two people aged ${targetAge}-${targetAge + 5} sitting together in bright, welcoming space - café table or home setting (NOT crowded, intimate scene). Both engaged in lively conversation, one person speaking animatedly with natural hand gesture, the other listening attentively with genuine smile of understanding. Body language shows comfort and friendship. Wearing smart casual attire (one in soft blue, other in warm coral/peach). Natural daylight from large windows, shallow depth of field (f/2.8). Background should be clean and uncluttered - no crowds or busy environments. Captures the emotional benefit: the joy of sharing clear conversations with a friend. Premium commercial photography - authentic friendship, not posed models.`;
  }
  // SCENARIO 4: Family connection
  else if (themes.family && themes.hearing) {
    sceneDescription = `Grandparent (age ${targetAge}) and adult child or grandchild in warm, intimate moment of connection. Grandparent leaning forward with expression of pure delight, clearly hearing and engaging in conversation. Setting: Cozy, modern living room with soft afternoon light through sheer curtains. Both people showing authentic joy - the emotional payoff of clear hearing is the ability to connect with loved ones. Wearing comfortable, refined clothing (grandparent in soft cardigan, warm earth tones). Shallow focus on faces, background softly blurred. Style: Emotional storytelling photography - Pixar character emotion meets real-world authenticity.`;
  }
  // SCENARIO 5: Hearing/Conversation focus (generic)
  else if (themes.hearing && context.industry.toLowerCase().includes('health')) {
    sceneDescription = `${targetAge}-year-old person in mid-conversation, face lit up with genuine delight and engagement. Leaning slightly forward, making eye contact off-camera, natural hand gesture showing animated discussion. The image should convey: "I can hear clearly and participate fully." Setting: Modern, warm living space with natural window light (morning or golden hour). Wearing smart casual attire in soft, flattering colors (sage green, warm taupe, or soft blue). Professional portrait photography with shallow depth of field (f/2.8-f/4), background elements suggest home but completely blurred. Think: Apple commercial aesthetic meets National Geographic portrait quality - authentic, emotionally resonant, premium.`;
  }
  // SCENARIO 6: Technology/Innovation focus
  else if (themes.technology || messageLower.includes('latest') || messageLower.includes('new')) {
    sceneDescription = `Confident ${targetAge}-year-old professional in contemporary, well-lit space. Expression shows curiosity and forward-thinking mindset. Subtle modern technology visible but blurred in background (tablet, modern workspace). Wearing modern smart casual attire, eyeglasses optional. Clean composition with architectural lines, natural daylight. Conveys: "I embrace technology that enhances my life." Professional advertising photography - sleek, aspirational, but warm and human-centered. Style: Microsoft/Google commercial aesthetic - technology serving humanity.`;
  }
  // SCENARIO 7: Celebration/Special event
  else if (themes.celebration) {
    sceneDescription = `${targetAge}-year-old person in moment of genuine joy and celebration. Warm smile, relaxed posture, dressed elegantly but comfortably for special occasion. Setting suggests gathering or event (soft-focus party lights or elegant home). Natural expression of contentment and participation in life's moments. Premium event photography quality - captures authentic emotion, not staged celebration. Warm color grading, golden hour lighting or soft interior ambiance.`;
  }
  // SCENARIO 8: Financial/Retirement context
  else if (context.industry.toLowerCase().includes('financ') || context.industry.toLowerCase().includes('retirement')) {
    sceneDescription = `Distinguished ${targetAge}-year-old reviewing documents or using tablet with expression of confident satisfaction. Modern home office or study with warm wood tones, natural daylight. Wearing smart casual business attire, reading glasses. Composition shows both subject and environmental context (f/4-f/5.6) - conveys security, wisdom, and control over financial future. Professional business lifestyle photography - Bloomberg/Wall Street Journal editorial quality.`;
  }
  // SCENARIO 9: Travel/Adventure
  else if (messageLower.includes('travel') || messageLower.includes('adventure') || messageLower.includes('explore')) {
    sceneDescription = `Active ${targetAge}-year-old with vibrant energy, looking toward horizon or window with expression of anticipation and wonder. Wearing casual outdoor-ready attire (quality fleece, hiking boots visible). Setting suggests preparation for journey - bright, airy space with maps or travel items softly blurred in background. Natural outdoor light. Conveys: vitality, embracing life's adventures. Travel magazine cover quality - National Geographic Traveler aesthetic.`;
  }
  // DEFAULT: Professional lifestyle based on industry
  else {
    const industryContext = context.industry.toLowerCase().includes('health') ? 'healthcare professional or patient' : 'professional';
    sceneDescription = `${targetAge}-year-old ${industryContext} in authentic moment of daily life. Natural expression showing engagement and contentment. Modern, comfortable setting with warm natural light. Smart casual attire appropriate to context. Clean composition, professional color grading. Premium lifestyle photography - Getty Images editorial quality, NOT generic stock. Photorealistic, emotionally genuine, aspirational but relatable.`;
  }

  // Apply style modifiers
  let styleAddendum = '';
  switch (promptStyle) {
    case 'natural':
      styleAddendum = 'Documentary-style candid moment, minimal post-processing, authentic environment.';
      break;
    case 'artistic':
      styleAddendum = 'Creative artistic composition, unique lighting design, visual storytelling emphasis.';
      break;
    case 'vibrant':
      styleAddendum = 'Bold dynamic energy, saturated colors, high-contrast dramatic lighting.';
      break;
    default: // professional
      styleAddendum = 'Premium commercial photography - Annie Leibovitz portraiture meets Apple advertising aesthetic.';
  }

  return `${sceneDescription} ${styleAddendum}`;
}

/**
 * Build optimized image prompt based on aspect ratio, template, and brand context
 * Enhanced with template-aware generation following best practices
 * Now includes fine-tuning parameters for human-computer optimization
 * RESTRUCTURED: Constraints first, then specific scene, then technical specs
 */
async function buildImagePrompt(
  message: string,
  context: CompanyContext,
  size: ImageSize,
  layoutTemplate: string = 'classic',
  brandConfig?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    industry?: string;
  },
  promptStyle: string = 'professional',
  noLogoStrength: number = 10,
  customInstructions?: string,
  customSceneDescription?: string  // NEW: User-provided scene description
): Promise<string> {
  // Determine layout based on aspect ratio
  const isLandscape = size === '1536x1024';
  const isPortrait = size === '1024x1536';
  const isSquare = size === '1024x1024';

  // Use brand colors if available, otherwise use defaults
  const primaryColor = brandConfig?.primaryColor || '#003E7E';
  const secondaryColor = brandConfig?.secondaryColor || '#FF6B35';
  const accentColor = brandConfig?.accentColor || '#10B981';

  let layoutInstructions = '';
  let logoPlacementInstructions = '';

  // TEMPLATE-AWARE LAYOUT GENERATION
  if (layoutTemplate === 'minimal') {
    // MINIMAL: Full-width image, no panel - text will overlay with shadows
    layoutInstructions = `
LAYOUT (Minimal - Full Image, No Panel):
- FULL WIDTH/HEIGHT: Professional photograph covering entire canvas
  * Warm, engaging scene relevant to ${context.industry}
  * Natural lighting, photorealistic quality
  * Emotional connection and authenticity
  * IMPORTANT: Darker/muted areas in top-left and bottom-right corners for text overlay
  * Subtle vignette effect to create text-friendly zones`;

    logoPlacementInstructions = `
EMPTY SPACE (Top-Left Corner):
- Top-left corner: Keep 100x60px area CLEAR and EMPTY
- Natural darker muted background (no patterns, no graphics)
- This zone will be used for digital overlay later
- DO NOT place any visual elements in this area`;

  } else if (layoutTemplate === 'modern') {
    // MODERN: Top header panel
    if (isLandscape) {
      layoutInstructions = `
LAYOUT (Modern Header - 1536x1024):
- TOP STRIP (250px tall): Solid ${primaryColor} header bar
  * Clean, flat color block with no gradients
  * Extends full width
- BOTTOM MAIN IMAGE (774px tall): Professional photograph
  * Warm scene relevant to ${context.industry}
  * Natural lighting, clear focal point`;

      logoPlacementInstructions = `
EMPTY SPACE (Top-Center of Header):
- Center of header bar: Keep 180x60px area BLANK
- Solid ${primaryColor} color only - no graphics
- This zone is for digital overlay later`;

    } else if (isPortrait) {
      logoPlacementInstructions = `
LOGO SPACE (Top-Center):
- Top header center: Reserve 160x55px
- Solid ${primaryColor} background`;

      layoutInstructions = `
LAYOUT (Modern Header - 1024x1536):
- TOP STRIP (280px): Solid ${primaryColor} header
- BOTTOM (1256px): Professional photograph`;
    } else {
      layoutInstructions = `
LAYOUT (Modern Header - 1024x1024):
- TOP STRIP (250px): Solid ${primaryColor} header
- BOTTOM (774px): Professional photograph`;

      logoPlacementInstructions = `
LOGO SPACE: Top center, 160x55px, ${primaryColor} background`;
    }

  } else if (layoutTemplate === 'premium') {
    // PREMIUM: Large left panel
    if (isLandscape) {
      layoutInstructions = `
LAYOUT (Premium - 1536x1024):
- LEFT PANEL (614px wide, 40%): Solid ${primaryColor} panel
  * For centered logo and text
  * Clean, flat color
  * Full height
- RIGHT IMAGE (922px wide): Professional photograph`;

      logoPlacementInstructions = `
LOGO SPACE (Center of Panel):
- Vertical center of left panel
- Reserve 200x80px area
- Solid ${primaryColor} background`;

    } else if (isPortrait) {
      layoutInstructions = `
LAYOUT (Premium - 1024x1536):
- LEFT PANEL (410px, 40%): Solid ${primaryColor}
- RIGHT IMAGE (614px): Professional photograph`;

      logoPlacementInstructions = `
LOGO SPACE: Center of left panel, 180x70px`;
    } else {
      layoutInstructions = `
LAYOUT (Premium - 1024x1024):
- LEFT PANEL (410px, 40%): Solid ${primaryColor}
- RIGHT IMAGE (614px): Professional photograph`;

      logoPlacementInstructions = `
LOGO SPACE: Center of left panel, 170x65px`;
    }

  } else {
    // CLASSIC (default): Left panel
    if (isLandscape) {
      layoutInstructions = `
LAYOUT (Classic - 1536x1024):
- LEFT THIRD (512px): Solid ${primaryColor} panel
  * For text and logo
  * Flat color, no gradients
  * Full height
- RIGHT TWO-THIRDS (1024px): Professional photograph
  * ${context.industry} scene
  * Natural lighting`;

      logoPlacementInstructions = `
LOGO SPACE (Top-Left):
- Top-left of panel: 160x70px
- Solid ${primaryColor} background
- Keep clear`;

    } else if (isPortrait) {
      layoutInstructions = `
LAYOUT (Classic - 1024x1536):
- TOP QUARTER (384px): Solid ${primaryColor} header
- BOTTOM (1152px): Professional photograph`;

      logoPlacementInstructions = `
LOGO SPACE: Top-left of header, 150x65px`;
    } else {
      layoutInstructions = `
LAYOUT (Classic - 1024x1024):
- LEFT THIRD (342px): Solid ${primaryColor} panel
- RIGHT (682px): Professional photograph`;

      logoPlacementInstructions = `
LOGO SPACE: Top-left of panel, 150x65px`;
    }
  }

  // Generate specific scene description based on campaign context
  // If user provided a scene description, it will override the AI-generated one
  const specificScene = generateSceneDescription(message, context, promptStyle, customSceneDescription);
  console.log('🎬 Generated specific scene:', specificScene.substring(0, 150) + '...');

  // Build STRATEGIC prompt: Constraints FIRST, then specific scene, then technical specs
  const imagePrompt = `${getNoLogoInstructions(noLogoStrength, context.companyName, primaryColor)}

---

CANVAS SPECIFICATIONS:
${size} (${isLandscape ? 'Landscape' : isPortrait ? 'Portrait' : 'Square'} Premium Direct Mail Format)

${layoutInstructions}

${logoPlacementInstructions}

---

SPECIFIC SCENE TO GENERATE:
${specificScene}

---

PHOTOGRAPHY STYLE REFERENCE:
- Think: Getty Images premium ${context.industry} collection, Annie Leibovitz portraiture meets lifestyle
- Quality level: Award-winning advertising photography (Apple commercial aesthetic for ${context.industry})
- NOT generic stock photography - authentic, professional, emotionally resonant

TECHNICAL PHOTOGRAPHY SPECS:
- Camera simulation: 50mm portrait lens equivalent, f/2.8 - f/4 aperture
- Lighting: Natural window light or soft diffused studio light, warm color temperature (3500-4500K)
- Composition: Rule of thirds, subject at power points, balanced negative space
- Depth of Field: Shallow (bokeh background blur), sharp focus on subject's face/expression
- Color Grading: ${getColorGradingDescription(promptStyle)}, slightly lifted blacks, warm highlights
- Texture: Photorealistic skin detail, crisp focus, slight film grain (ISO 400 aesthetic)
- Post-processing: Professional color separation, clean boundary between panel and photograph

BRAND COLOR INTEGRATION:
- Panel Background: ${primaryColor} (exact match required, perfectly flat solid color)
- Photograph Palette: Warm natural tones, soft earth colors, complement ${primaryColor}
- Accent Touches: ${secondaryColor} or ${accentColor} may appear naturally in clothing/environment
- Avoid: Cool blues competing with brand panel

MOOD & EMOTIONAL TONE:
- ${context.brandVoice} (primary emotional tone)
- Target demographic visual cues: ${context.targetAudience}
- Conveys: Trust + Expertise + Warmth (not clinical, not corporate, not staged)

${customInstructions ? `\nCUSTOM REFINEMENTS:\n${customInstructions}` : ''}

---

VERIFICATION CHECKLIST (AI Self-Check):
✓ Zero text/logos anywhere in image?
✓ Panel is perfectly flat solid ${primaryColor}?
✓ Photograph feels premium commercial quality (not stock)?
✓ Subject appears authentic, not posed?
✓ Lighting is warm and professional?
✓ Clean hard edge between panel and photo?
✓ Overall mood is ${context.brandVoice}?`;

  return imagePrompt;
}

/**
 * Get quality recommendations based on use case
 */
export function getQualityRecommendation(useCase: 'preview' | 'production' | 'print'): ImageQuality {
  switch (useCase) {
    case 'preview':
      return 'low';    // Fast, cheap, good for iteration
    case 'production':
      return 'medium'; // Balanced quality/cost for digital use
    case 'print':
      return 'high';   // Best quality for physical printing
    default:
      return 'low';
  }
}

/**
 * Get aspect ratio recommendations based on use case
 */
export function getAspectRatioRecommendation(useCase: 'postcard' | 'flyer' | 'door-hanger' | 'social'): ImageSize {
  switch (useCase) {
    case 'postcard':
      return '1536x1024'; // Landscape
    case 'flyer':
      return '1024x1024'; // Square
    case 'door-hanger':
      return '1024x1536'; // Portrait
    case 'social':
      return '1024x1024'; // Square (works for most platforms)
    default:
      return '1024x1024';
  }
}

/**
 * V1 Fallback Function with V2 Settings
 * Uses dall-e-3 instead of gpt-image-1 while maintaining all V2 features:
 * - Brand-aware prompts
 * - Quality levels (mapped to dall-e-3's standard/hd)
 * - Aspect ratios
 * - Cost tracking
 * - Metadata consistency
 */
/**
 * Build a shorter prompt for dall-e-3 (max 4000 chars)
 * Streamlined version of buildImagePrompt with template awareness
 */
async function buildShortPromptForDalle3(
  message: string,
  context: CompanyContext,
  size: ImageSize,
  layoutTemplate: string = 'classic',
  brandConfig?: any,
  promptStyle: string = 'professional',
  noLogoStrength: number = 10,
  customInstructions?: string
): Promise<string> {
  const isLandscape = size === '1536x1024';
  const primaryColor = brandConfig?.primaryColor || '#003E7E';

  // Generate specific scene
  const specificScene = generateSceneDescription(message, context, promptStyle);

  // Compact scene to fit 4000 char limit (take first 200 chars of generated scene)
  const compactScene = specificScene.substring(0, 200) + '...';

  let layoutDesc = '';
  if (layoutTemplate === 'minimal') {
    layoutDesc = `FULL IMAGE: Professional photo, no panel. Darker corners for text overlay.`;
  } else if (layoutTemplate === 'modern') {
    layoutDesc = `TOP STRIP: Solid ${primaryColor} header. BOTTOM: Professional photo.`;
  } else if (layoutTemplate === 'premium') {
    layoutDesc = `LARGE LEFT PANEL (40%): Solid ${primaryColor}. RIGHT: Professional photo.`;
  } else {
    layoutDesc = isLandscape ? `LEFT THIRD (512px): Solid ${primaryColor} panel. RIGHT: Professional photo.` : `LEFT THIRD: Solid ${primaryColor} panel. RIGHT: Professional photo.`;
  }

  // Build NO LOGO instructions based on strength
  let noLogoInstructions = 'CRITICAL - NO TEXT OR LOGOS:\n- ZERO text/logos/brand marks anywhere\n- Panel is SOLID COLOR ONLY\n- Text added digitally later';
  if (noLogoStrength >= 9) {
    noLogoInstructions += '\n- ⚠️ MAXIMUM ENFORCEMENT - violations = FAIL';
  }

  const prompt = `${noLogoInstructions}

LAYOUT: ${layoutDesc}

SCENE: ${compactScene}

STYLE: ${getStyleDescription(promptStyle)}, ${context.brandVoice} mood. Target: ${context.targetAudience}.

SPECS:
- Premium commercial photography (Getty Images quality)
- Sharp focus, f/2.8-f/4 depth, natural lighting
- Warm tones, photorealistic, authentic expressions
- Panel: solid ${primaryColor}, no gradients
${customInstructions ? `\nCUSTOM: ${customInstructions}` : ''}`;

  console.log(`📏 Shortened prompt length: ${prompt.length} chars (max 4000)`);
  return prompt;
}

export async function generateDMCreativeImageV1Fallback(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const { message, context, apiKey, quality, size, layoutTemplate, brandConfig, promptStyle, noLogoStrength, customInstructions } = options;

  // CRITICAL: DALL-E 3 HD quality can take 30-60+ seconds
  // OpenAI SDK v6 uses fetch API - timeout parameter controls AbortSignal timeout
  const openai = new OpenAI({
    apiKey,
    timeout: 180 * 1000,  // Request timeout: 3 minutes (180 seconds) - enough for HD generations
    maxRetries: 0,        // We handle retries manually
  });

  // Build SHORTER prompt for dall-e-3 (max 4000 chars) WITH template awareness AND fine-tuning params
  const imagePrompt = await buildShortPromptForDalle3(
    message,
    context,
    size,
    layoutTemplate || 'classic',
    brandConfig,
    promptStyle,
    noLogoStrength,
    customInstructions
  );

  console.log(`🔄 Fallback to dall-e-3: ${quality} quality, ${size} size, ${layoutTemplate || 'classic'} layout, style: ${promptStyle || 'default'} (maintaining V2 settings)`);

  // Map V2 quality levels to dall-e-3 quality parameter
  // dall-e-3 supports: 'standard' or 'hd'
  // For best results, use 'hd' for medium and high quality
  const dalle3Quality = (quality === 'high' || quality === 'medium') ? 'hd' : 'standard';

  console.log(`🎨 Quality mapping: ${quality} (V2) → ${dalle3Quality} (dall-e-3)`);

  // Map V2 sizes to valid dall-e-3 sizes
  // dall-e-3 supports: '1024x1024', '1024x1792', '1792x1024'
  // V2 supports: '1024x1024', '1536x1024', '1024x1536'
  const dalle3SizeMap: Record<ImageSize, '1024x1024' | '1024x1792' | '1792x1024'> = {
    '1024x1024': '1024x1024', // Square → Square
    '1536x1024': '1792x1024', // Landscape → Landscape (closest match)
    '1024x1536': '1024x1792', // Portrait → Portrait (closest match)
  };
  const dalle3Size = dalle3SizeMap[size];

  console.log(`📐 Size mapping: ${size} (V2) → ${dalle3Size} (dall-e-3)`);

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: dalle3Size,
      quality: dalle3Quality,
    });

    console.log("✅ dall-e-3 fallback response received");

    const firstItem = response.data?.[0];
    if (!firstItem) {
      throw new Error("No image data returned from dall-e-3");
    }

    let imageUrl: string;

    // Handle URL response
    if (firstItem.url) {
      console.log("📥 Fetching image from URL...");
      const imageResponse = await fetch(firstItem.url);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      imageUrl = `data:image/png;base64,${base64Image}`;
    }
    // Handle b64_json response
    else if (firstItem.b64_json) {
      console.log("📦 Using base64 image from response");
      imageUrl = `data:image/png;base64,${firstItem.b64_json}`;
    }
    else {
      throw new Error("Unexpected response format from dall-e-3");
    }

    // Calculate accurate dall-e-3 cost
    const estimatedCost = calculateDalle3Cost(dalle3Quality, dalle3Size);

    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(3)} (dall-e-3 ${dalle3Quality})`);

    return {
      imageUrl,
      promptUsed: imagePrompt, // Include prompt for fine-tuning debugging
      metadata: {
        quality,
        size,
        estimatedCost,
        generatedAt: new Date().toISOString(),
        model: 'dall-e-3-fallback',
      },
    };

  } catch (error) {
    console.error("❌ dall-e-3 fallback failed:", error);
    throw error;
  }
}

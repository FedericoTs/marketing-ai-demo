/**
 * Brand CSS Generator
 * Generates CSS variables and Google Fonts imports from brand configuration
 */

export interface BrandConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

export interface GeneratedBrandCSS {
  cssVariables: string;
  fontImports: string;
  fullStyleTag: string;
}

/**
 * Default brand configuration (fallback values)
 */
const DEFAULT_BRAND_CONFIG: Required<BrandConfig> = {
  primaryColor: '#1E3A8A',
  secondaryColor: '#FF6B35',
  accentColor: '#10B981',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  headingFont: 'Inter',
  bodyFont: 'Open Sans',
};

/**
 * Generate CSS variables from brand config
 */
export function generateCSSVariables(brandConfig?: BrandConfig): string {
  const config = { ...DEFAULT_BRAND_CONFIG, ...brandConfig };

  return `
:root {
  /* Brand Colors */
  --brand-primary: ${config.primaryColor};
  --brand-secondary: ${config.secondaryColor};
  --brand-accent: ${config.accentColor};
  --brand-bg: ${config.backgroundColor};
  --brand-text: ${config.textColor};

  /* Typography */
  --brand-font-heading: '${config.headingFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --brand-font-body: '${config.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Derived Colors (auto-generated) */
  --brand-primary-light: color-mix(in srgb, var(--brand-primary) 80%, white);
  --brand-primary-dark: color-mix(in srgb, var(--brand-primary) 80%, black);
  --brand-secondary-light: color-mix(in srgb, var(--brand-secondary) 80%, white);
  --brand-secondary-dark: color-mix(in srgb, var(--brand-secondary) 80%, black);
  --brand-accent-light: color-mix(in srgb, var(--brand-accent) 80%, white);
  --brand-accent-dark: color-mix(in srgb, var(--brand-accent) 80%, black);
}

/* Apply brand typography */
body {
  font-family: var(--brand-font-body);
  color: var(--brand-text);
  background-color: var(--brand-bg);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--brand-font-heading);
}

/* Brand-styled elements */
.brand-primary-bg {
  background-color: var(--brand-primary);
}

.brand-secondary-bg {
  background-color: var(--brand-secondary);
}

.brand-accent-bg {
  background-color: var(--brand-accent);
}

.brand-primary-text {
  color: var(--brand-primary);
}

.brand-secondary-text {
  color: var(--brand-secondary);
}

.brand-accent-text {
  color: var(--brand-accent);
}

.brand-button {
  background-color: var(--brand-primary);
  color: white;
  font-family: var(--brand-font-heading);
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.brand-button:hover {
  background-color: var(--brand-primary-dark);
}

.brand-button-secondary {
  background-color: var(--brand-secondary);
  color: white;
}

.brand-button-secondary:hover {
  background-color: var(--brand-secondary-dark);
}

.brand-button-accent {
  background-color: var(--brand-accent);
  color: white;
}

.brand-button-accent:hover {
  background-color: var(--brand-accent-dark);
}

.brand-link {
  color: var(--brand-primary);
  text-decoration: underline;
}

.brand-link:hover {
  color: var(--brand-primary-dark);
}
`.trim();
}

/**
 * Generate Google Fonts import URL
 */
export function generateGoogleFontsImport(brandConfig?: BrandConfig): string {
  const config = { ...DEFAULT_BRAND_CONFIG, ...brandConfig };

  // Extract unique font families
  const fonts = Array.from(new Set([config.headingFont, config.bodyFont]));

  // Format fonts for Google Fonts URL
  // Example: Inter:wght@400;600;700|Open+Sans:wght@400;600
  const fontParams = fonts
    .map(font => {
      const fontName = font.replace(/\s+/g, '+');
      return `${fontName}:wght@400;600;700`;
    })
    .join('&family=');

  return `https://fonts.googleapis.com/css2?family=${fontParams}&display=swap`;
}

/**
 * Generate complete brand CSS (fonts + variables)
 */
export function generateBrandCSS(brandConfig?: BrandConfig): GeneratedBrandCSS {
  const cssVariables = generateCSSVariables(brandConfig);
  const fontImports = generateGoogleFontsImport(brandConfig);

  const fullStyleTag = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontImports}" rel="stylesheet">

<style>
${cssVariables}
</style>
`.trim();

  return {
    cssVariables,
    fontImports,
    fullStyleTag,
  };
}

/**
 * Fetch brand config from API
 */
export async function fetchBrandConfig(companyName: string): Promise<BrandConfig | null> {
  try {
    const response = await fetch(`/api/brand/config?companyName=${encodeURIComponent(companyName)}`);

    if (!response.ok) {
      console.warn('Failed to fetch brand config, using defaults');
      return null;
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.warn('No brand config found, using defaults');
      return null;
    }

    return {
      primaryColor: result.data.primary_color,
      secondaryColor: result.data.secondary_color,
      accentColor: result.data.accent_color,
      backgroundColor: result.data.background_color,
      textColor: result.data.text_color,
      headingFont: result.data.heading_font,
      bodyFont: result.data.body_font,
    };
  } catch (error) {
    console.error('Error fetching brand config:', error);
    return null;
  }
}

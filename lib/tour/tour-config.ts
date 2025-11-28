import type { TourConfig } from './tour-types';

/**
 * ONBOARDING TOUR CONFIGURATION
 *
 * Edit this file to modify the tour.
 * No code changes needed - just update the steps array.
 *
 * How to:
 * - Add step: Copy existing step, change content
 * - Remove step: Delete step object from array
 * - Reorder: Drag step objects up/down
 * - Disable tour: Set enabled = false
 */

export const tourConfig: TourConfig = {
  // ========================================
  // TOUR SETTINGS (Global)
  // ========================================
  enabled: true,                    // Set to false to disable tour globally
  version: '1.0',                   // Increment when tour changes significantly
  showProgress: true,               // Show "Step 2 of 5" indicator
  allowSkip: true,                  // Show "Skip Tour" button
  allowBack: true,                  // Show "Back" button
  autoStartForNewUsers: true,       // Auto-start for users who haven't seen it
  triggerOnFirstLogin: true,        // Show on first login only

  // ========================================
  // TOUR STEPS (Edit below)
  // ========================================
  steps: [

    // -------------------------------------
    // STEP 1: Welcome Modal
    // -------------------------------------
    {
      id: 'welcome',
      type: 'modal',
      title: 'Welcome to DropLab! 🎉',
      content: `We're excited to have you here! This quick tour will show you everything you need to launch your first direct mail campaign.

**What you'll learn in 2 minutes:**
- Track campaign performance
- Create personalized postcards
- Find your perfect customers
- Launch campaigns easily

Ready? Let's go!`,
      primaryButton: {
        text: 'Start Tour',
        action: 'next',
      },
      secondaryButton: {
        text: 'Skip Tour',
        action: 'skip',
      },
    },

    // -------------------------------------
    // STEP 2: Dashboard
    // -------------------------------------
    {
      id: 'dashboard',
      type: 'spotlight',
      target: '[data-tour="dashboard-link"]',
      title: 'Your Performance Hub',
      content: `This is your command center. See how many postcards you've sent, who scanned them, and who took action—all in one place.

**Pro tip**: Check here every Monday to see which campaigns work best!`,
      placement: 'right',
      primaryButton: {
        text: 'Next',
        action: 'next',
      },
      secondaryButton: {
        text: 'Back',
        action: 'back',
      },
    },

    // -------------------------------------
    // STEP 3: Templates
    // -------------------------------------
    {
      id: 'templates',
      type: 'spotlight',
      target: '[data-tour="templates-link"]',
      title: 'Professional Designs, Zero Skills Needed',
      content: `Browse templates or create your own. Our drag-and-drop editor makes it easy to add your logo, customize colors, and insert images.

**Bonus**: Save your designs as templates to reuse later!`,
      placement: 'right',
      primaryButton: {
        text: 'Next',
        action: 'next',
      },
      secondaryButton: {
        text: 'Back',
        action: 'back',
      },
    },

    // -------------------------------------
    // STEP 4: Audiences
    // -------------------------------------
    {
      id: 'audiences',
      type: 'spotlight',
      target: '[data-tour="audiences-link"]',
      title: 'Find Your Perfect Customers',
      content: `Target exactly who you want from 250 million verified contacts.

**How it works**:
1. Build filters (age, income, location, etc.)
2. See how many match—FREE preview
3. Save to reuse later

**Example**: "Homeowners in Dallas, age 35-50, $75K+" → 12,847 matches`,
      placement: 'right',
      primaryButton: {
        text: 'Next',
        action: 'next',
      },
      secondaryButton: {
        text: 'Back',
        action: 'back',
      },
    },

    // -------------------------------------
    // STEP 5: Campaigns
    // -------------------------------------
    {
      id: 'campaigns',
      type: 'spotlight',
      target: '[data-tour="campaigns-link"]',
      title: 'Launch in 4 Easy Steps',
      content: `Our campaign wizard makes it simple:
1. Pick a design template
2. Choose your audience
3. Personalize each postcard
4. Review and launch

You'll create your first campaign in under 10 minutes!`,
      placement: 'right',
      primaryButton: {
        text: 'Next',
        action: 'next',
      },
      secondaryButton: {
        text: 'Back',
        action: 'back',
      },
    },

    // -------------------------------------
    // STEP 6: Analytics
    // -------------------------------------
    {
      id: 'analytics',
      type: 'spotlight',
      target: '[data-tour="analytics-link"]',
      title: 'Track Every Interaction',
      content: `See exactly who's engaging:
- QR code scans
- Website visits
- Phone calls
- Conversions

Updates automatically every 30 seconds!`,
      placement: 'right',
      primaryButton: {
        text: 'Finish Tour',
        action: 'complete',
      },
      secondaryButton: {
        text: '← Back',
        action: 'back',
      },
    },

    // -------------------------------------
    // STEP 7: Completion Modal
    // -------------------------------------
    {
      id: 'completion',
      type: 'modal',
      title: 'You\'re All Set! 🚀',
      content: `Great job! You now know the basics of DropLab.

**What to do next**:
1. Set up your brand in Settings
2. Create your first template
3. Launch a test campaign

Need help? Click the "?" icon in the bottom-right corner anytime.`,
      primaryButton: {
        text: 'Go to Settings',
        action: 'navigate',
        url: '/settings?tab=brand',
      },
      secondaryButton: {
        text: 'Create First Campaign',
        action: 'navigate',
        url: '/campaigns/create',
      },
      showConfetti: true,
    },

  ], // END STEPS
};

/**
 * CONFIGURATION HELPERS
 * (Don't edit below unless you know what you're doing)
 */

// Get active tour steps
export function getActiveTourSteps() {
  if (!tourConfig.enabled) return [];
  return tourConfig.steps;
}

// Check if tour is enabled
export function isTourEnabled() {
  return tourConfig.enabled;
}

// Get tour version
export function getTourVersion() {
  return tourConfig.version;
}

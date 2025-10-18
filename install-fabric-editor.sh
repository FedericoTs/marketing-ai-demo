#!/bin/bash
# Quick install script for Fabric.js Canvas Editor

echo "🎨 Installing Premium Fabric.js Canvas Editor..."
echo ""

# Step 1: Kill dev servers
echo "Step 1: Stopping dev servers..."
pkill -f "next dev" 2>/dev/null || true
echo "✅ Dev servers stopped"
echo ""

# Step 2: Install Fabric.js
echo "Step 2: Installing Fabric.js v6..."
npm install fabric@6
if [ $? -eq 0 ]; then
    echo "✅ Fabric.js installed"
else
    echo "❌ Failed to install Fabric.js"
    echo "Try running manually: npm install fabric@6"
    exit 1
fi
echo ""

# Step 3: Install TypeScript types
echo "Step 3: Installing TypeScript types..."
npm install --save-dev @types/fabric
if [ $? -eq 0 ]; then
    echo "✅ TypeScript types installed"
else
    echo "⚠️  Failed to install types (non-critical)"
fi
echo ""

# Step 4: Create global.d.ts if it doesn't exist
echo "Step 4: Setting up global types..."
if [ ! -f "global.d.ts" ]; then
    cat > global.d.ts << 'EOL'
// global.d.ts - Global TypeScript declarations
import { fabric } from 'fabric';

declare global {
  interface Window {
    fabric: typeof fabric;
  }
}

// Extend Fabric.js objects with custom properties
declare module 'fabric' {
  namespace fabric {
    interface Object {
      id?: string;
      type?: string;
    }
  }
}

// ElevenLabs ConvAI Widget
declare namespace JSX {
  interface IntrinsicElements {
    'elevenlabs-convai': {
      'agent-id': string;
      children?: React.ReactNode;
    };
  }
}

export {};
EOL
    echo "✅ Created global.d.ts"
else
    echo "⚠️  global.d.ts already exists - please add Fabric.js types manually"
fi
echo ""

# Step 5: Restart dev server
echo "Step 5: Restarting dev server..."
npm run dev &
sleep 3
echo "✅ Dev server started"
echo ""

echo "🎉 Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Open FABRIC-CANVAS-EDITOR-SETUP.md for integration instructions"
echo "2. Update dm-builder.tsx to use DMCanvasEditor"
echo "3. Test the new canvas editor in DM Creative workflow"
echo ""
echo "💡 Tip: The new editor opens after you accept a background image"

# DM Creative Image Generation - Testing Guide

## Overview
The DM Creative feature now generates professional, AI-powered direct mail images using:
- **DALL-E 3** for brand-aligned background imagery
- **Canvas** for text overlay and composition
- **Miracle-Ear brand colors** (Deep Blue #003E7E, Warm Orange #FF6B35)

## What's New
- AI-generated creative background images tailored to the marketing message
- Professional layout with:
  - Company branding header
  - Personalized recipient greeting ("Dear John Doe")
  - Marketing message overlay
  - Address information
  - QR code with branded border
  - Call-to-action text
- Miracle-Ear brand color scheme throughout

## Testing Instructions

### Prerequisites
1. **Configure OpenAI API Key** in Settings tab
2. **Default Miracle-Ear Settings** should be loaded (company name, industry, brand voice)

### Test Case 1: Single DM Generation

1. Navigate to **DM Creative** tab
2. Click **Single DM** tab
3. Fill in the form:
   ```
   First Name: Sarah
   Last Name: Johnson
   Street Address: 456 Oak Avenue
   City: Seattle
   ZIP Code: 98101
   Marketing Message: Experience the joy of hearing again with our new GENIUS™ technology. 30-day risk-free trial available.
   ```

4. Click **Generate Direct Mail**

5. **Expected Behavior**:
   - Loading state shows "Generating..."
   - Console logs: "Generating AI creative image with DALL-E..."
   - Wait time: 15-30 seconds (DALL-E image generation + composition)
   - Console logs: "Composing final DM image..."
   - Console logs: "DM creative image generated successfully"
   - Success toast appears

6. **Verify Preview**:
   - **AI-Generated Direct Mail Creative** section displays at top
   - Image shows:
     - Miracle-Ear branding colors (blue/orange)
     - Emotional, warm imagery (seniors, families, life moments)
     - Professional medical-grade aesthetic
     - Deep blue header bar with "Miracle-Ear" text
     - Marketing message overlaid on image
     - White bottom section with personalized greeting
     - "Dear Sarah Johnson" in bold blue text
     - Address: "456 Oak Avenue, Seattle, 98101"
     - QR code in bottom right with blue border
     - "Scan to Learn More →" in orange

7. **Test Landing Page**:
   - Click external link icon next to Landing Page URL
   - Verify landing page opens with personalized content
   - Scan QR code with phone to verify it works

8. **Test PDF Download**:
   - Click "Download Printable PDF"
   - Verify PDF downloads with embedded creative image
   - Open PDF and check print quality

### Test Case 2: Different Marketing Messages

Test with various messages to see DALL-E adapt the imagery:

**Message 1 (Technology Focus):**
```
Discover our latest MIRAGE™ hearing aids - virtually invisible, incredibly comfortable, and packed with smart features.
```
Expected: Modern, tech-focused imagery, possibly showing sleek devices

**Message 2 (Emotional Connection):**
```
Don't miss another precious moment with your grandchildren. Rediscover the sounds of laughter, music, and family gatherings.
```
Expected: Warm family imagery, grandparents with grandchildren, emotional scenes

**Message 3 (Active Lifestyle):**
```
Keep living your active life to the fullest. Our hearing aids are designed for hiking, golf, and all your favorite activities.
```
Expected: Active seniors, outdoor scenes, dynamic imagery

### Test Case 3: Error Handling

**Test 3a: Missing API Key**
1. Remove OpenAI API key from Settings
2. Try to generate DM
3. Expected: Error toast "Please configure your OpenAI API key in Settings"

**Test 3b: Invalid Message**
1. Leave marketing message empty
2. Expected: Form validation error "Please fill in all required fields"

### Test Case 4: Batch Generation (CSV)

1. Navigate to **Batch Upload** tab
2. Enter default message:
   ```
   Experience better hearing with our 30-day risk-free trial. Over 75 years of trusted care.
   ```
3. Upload CSV with multiple recipients
4. Click **Generate [X] Direct Mails**
5. **Expected**:
   - Each DM gets unique AI-generated creative
   - All use same message but personalized names/addresses
   - QR codes are unique per recipient
   - Processing time: ~20-30 seconds per DM

## Brand Color Verification

Check that generated images include:
- **Deep Blue (#003E7E)**: Header bar, text, borders
- **Warm Orange (#FF6B35)**: Call-to-action text, accents
- **White/Cream tones**: Background sections, overlays
- **Professional aesthetic**: Medical-grade, trustworthy appearance

## Performance Metrics

- **DALL-E Generation**: 10-15 seconds
- **Image Composition**: 1-2 seconds
- **Total Time**: 15-30 seconds per DM
- **Image Size**: ~500KB-1MB base64 encoded
- **Quality**: 1024x1024 HD quality

## Common Issues & Solutions

### Issue: "Failed to generate direct mail"
- **Solution**: Check OpenAI API key is valid and has credits
- Check console for detailed error message

### Issue: Image generation timeout
- **Solution**: DALL-E can take 15-30 seconds; be patient
- Increase timeout if needed in API route

### Issue: Text overlay not visible
- **Solution**: Check canvas installation: `npm list canvas`
- Verify canvas is properly imported

### Issue: QR code not appearing on creative
- **Solution**: Check QR code was generated successfully
- Verify composeDMImage received valid qrCodeDataUrl

### Issue: Colors don't match Miracle-Ear brand
- **Solution**: DALL-E interprets colors; may vary slightly
- Background image should complement brand colors
- Text overlays use exact hex colors

## Console Logs to Monitor

When generating DM, watch for these logs:
```
Generating AI creative image with DALL-E...
Composing final DM image...
DM creative image generated successfully
POST /api/dm-creative/generate 200 in [XX]ms
```

## Next Steps After Testing

1. Test with real Miracle-Ear marketing campaigns
2. Generate batch of 10-20 DMs for variety testing
3. Print test to verify physical print quality
4. Scan QR codes with various devices
5. Gather feedback on image quality and brand alignment
6. Optimize prompt engineering for better results

## Advanced Testing

### Test Different Image Styles
Modify `lib/ai/openai.ts` line 49 to try:
- `style: "vivid"` - More dramatic, hyper-real images
- `style: "natural"` - Current setting, more realistic

### Test Different Sizes
Modify `lib/ai/openai.ts` line 47:
- `size: "1792x1024"` - Wider landscape format (may require canvas adjustments)

### Test Quality Settings
Modify `lib/ai/openai.ts` line 48:
- `quality: "standard"` - Faster generation, lower cost

---

**Ready for CEO Demo!** 🎉

The DM Creative feature now generates professional, branded direct mail pieces with:
- AI-powered visuals that adapt to each message
- Miracle-Ear brand identity throughout
- Personalized recipient information
- Functional QR codes
- Print-ready quality

/**
 * Test GET /api/design-templates endpoint
 */

const API_URL = 'http://localhost:3000';
const ORG_ID = '47660215-d828-4bbe-9664-57bca613b661';

async function testGetTemplates() {
  console.log('🧪 Testing GET /api/design-templates\n');
  console.log('================================================\n');

  const url = `${API_URL}/api/design-templates?organizationId=${ORG_ID}`;

  console.log('Fetching templates for organization:', ORG_ID);
  console.log('URL:', url);
  console.log('');

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.log('❌ API Error:', data.error);
      return;
    }

    console.log('✅ API Response Success!');
    console.log('Total templates:', data.count);
    console.log('');

    if (data.templates && data.templates.length > 0) {
      console.log('📋 Templates Found:\n');
      data.templates.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name}`);
        console.log(`   ID: ${template.id}`);
        console.log(`   Format: ${template.format_type}`);
        console.log(`   Dimensions: ${template.canvas_width}×${template.canvas_height}px`);
        console.log(`   Status: ${template.status}`);
        console.log(`   Created: ${new Date(template.created_at).toLocaleString()}`);
        console.log(`   Thumbnail: ${template.thumbnail_url ? 'Yes' : 'No'}`);
        console.log(`   Canvas objects: ${template.canvas_json?.objects?.length || 0}`);
        console.log(`   Variable mappings: ${Object.keys(template.variable_mappings || {}).length}`);
        console.log('');
      });
    } else {
      console.log('📭 No templates found for this organization');
      console.log('');
      console.log('To create a template:');
      console.log('1. Go to http://localhost:3000/templates');
      console.log('2. Design something on the canvas');
      console.log('3. Enter a template name');
      console.log('4. Click "Save Template"');
    }

    console.log('================================================');
    console.log('🎉 GET API Test Complete!');
    console.log('================================================\n');

  } catch (error) {
    console.log('❌ Fetch Error:', error.message);
    console.log('');
    console.log('Make sure dev server is running:');
    console.log('npm run dev');
  }
}

testGetTemplates();

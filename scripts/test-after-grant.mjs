/**
 * Test authenticated user access after applying GRANT permissions
 * This simulates what the browser does when calling the GET API
 */

const API_URL = 'http://localhost:3000';
const ORG_ID = '47660215-d828-4bbe-9664-57bca613b661';

async function testAfterGrant() {
  console.log('🧪 Testing Template Library After GRANT Fix\n');
  console.log('================================================\n');

  const url = `${API_URL}/api/design-templates?organizationId=${ORG_ID}`;

  console.log('📋 Test: GET /api/design-templates');
  console.log('URL:', url);
  console.log('Organization ID:', ORG_ID);
  console.log('');

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('Status Code:', response.status);
    console.log('');

    if (!response.ok) {
      console.log('❌ API ERROR');
      console.log('Error:', data.error);
      console.log('');
      console.log('This means GRANT permissions are NOT yet applied.');
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('ACTION REQUIRED: Run this SQL in Supabase SQL Editor');
      console.log('═══════════════════════════════════════════════════');
      console.log('');
      console.log('1. Open: https://app.supabase.com/project/egccqmlhzqiirovstpal/sql/new');
      console.log('2. Copy file: FIX_AUTHENTICATED_PERMISSIONS.sql');
      console.log('3. Paste and click "Run"');
      console.log('4. Run this test again: node scripts/test-after-grant.mjs');
      console.log('');
      return;
    }

    console.log('✅ API SUCCESS!');
    console.log('');
    console.log('Response:');
    console.log(`  - Success: ${data.success}`);
    console.log(`  - Template count: ${data.count}`);
    console.log('');

    if (data.templates && data.templates.length > 0) {
      console.log('📋 Templates Found:');
      console.log('');
      data.templates.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name}`);
        console.log(`   ID: ${template.id}`);
        console.log(`   Format: ${template.format_type}`);
        console.log(`   Dimensions: ${template.canvas_width}×${template.canvas_height}px`);
        console.log(`   Status: ${template.status}`);
        console.log(`   Created: ${new Date(template.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('📭 No templates found for this organization');
      console.log('');
      console.log('This is normal if you haven\'t created any templates yet.');
      console.log('The important thing is the API call succeeded!');
      console.log('');
    }

    console.log('================================================');
    console.log('🎉 GRANT PERMISSIONS WORKING!');
    console.log('================================================');
    console.log('');
    console.log('✅ The Template Library should now work in browser');
    console.log('');
    console.log('Next steps:');
    console.log('1. Open browser: http://localhost:3000/templates');
    console.log('2. You should see the Template Library sidebar');
    console.log('3. It will display all your saved templates');
    console.log('4. Click "Load Template" to load a template into the canvas');
    console.log('');

  } catch (error) {
    console.log('❌ Fetch Error:', error.message);
    console.log('');
    console.log('Make sure dev server is running:');
    console.log('npm run dev');
  }
}

testAfterGrant();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFunction() {
  console.log('Querying database for current function...\n');
  
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT 
          pg_get_functiondef(oid) as full_definition
        FROM pg_proc 
        WHERE proname = 'handle_new_user_signup';
      `
    });

  if (error) {
    console.log('exec_sql not available, trying alternative...\n');
    
    // Try getting just the source
    const { data: data2, error: error2 } = await supabase
      .from('pg_proc')
      .select('prosrc')
      .eq('proname', 'handle_new_user_signup')
      .single();
    
    if (error2) {
      console.error('Error:', error2);
      return;
    }
    
    const source = data2.prosrc;
    console.log('Function source (first 500 chars):');
    console.log(source.substring(0, 500));
    console.log('\n...\n');
    
    // Check for key values
    const has10000 = source.includes('10000');
    const has0Credits = source.includes('0.00') || source.includes('0,');
    const hasTrialing = source.includes("'trialing'");
    const hasIncomplete = source.includes("'incomplete'");
    
    console.log('Analysis:');
    console.log('  Contains 10000 (OLD):', has10000 ? 'YES ❌' : 'NO ✅');
    console.log('  Contains 0.00 (NEW):', has0Credits ? 'YES' : 'NO');
    console.log('  Contains trialing (OLD):', hasTrialing ? 'YES ❌' : 'NO ✅');
    console.log('  Contains incomplete (NEW):', hasIncomplete ? 'YES ✅' : 'NO ❌');
    
    return;
  }
  
  console.log('Full function definition:');
  console.log(data);
}

checkFunction().catch(console.error).finally(() => process.exit(0));

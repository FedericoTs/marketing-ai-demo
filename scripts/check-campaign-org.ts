import { createServiceClient } from '../lib/supabase/server';

async function checkCampaigns() {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('campaigns')
    .select('id, name, organization_id, total_recipients')
    .limit(1);

  if (data && data.length > 0) {
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No campaigns found');
  }

  process.exit(0);
}

checkCampaigns();

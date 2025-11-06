/**
 * Detailed test of anon key access
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egccqmlhzqiirovstpal.supabase.co';
const supabaseAnonKey = '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Testing anon key access to design_templates...\n');

const { data, error } = await supabase
  .from('design_templates')
  .select('*')
  .limit(1);

console.log('Data:', data);
console.log('\nError:', error);
console.log('\nError details:');
console.log('- message:', error?.message);
console.log('- code:', error?.code);
console.log('- details:', error?.details);
console.log('- hint:', error?.hint);

console.log('\nFull error object:', JSON.stringify(error, null, 2));

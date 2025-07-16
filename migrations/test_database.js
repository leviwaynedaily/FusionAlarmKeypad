#!/usr/bin/env node
/**
 * Database Connection Test
 * Tests if the user_preferences table exists and is accessible
 */

const { createClient } = require('@supabase/supabase-js');

async function testDatabase() {
  console.log('🧪 Testing Database Connection...');
  
  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    console.log('Set: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return false;
  }
  
  console.log('🔑 Supabase credentials found');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test 1: Check if user_preferences table exists and is accessible
    console.log('📋 Test 1: Checking user_preferences table access...');
    const { data, error } = await supabase
      .from('user_preferences')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ user_preferences table not accessible:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('💡 Run: node setup_user_preferences.js to create the table');
      }
      return false;
    }
    
    console.log('✅ user_preferences table exists and is accessible');
    console.log(`📊 Current records: ${data || 0}`);
    
    // Test 2: Try to insert and read a test preference
    console.log('📋 Test 2: Testing read/write operations...');
    const testOrgId = 'test-org-' + Date.now();
    const testSettings = {
      showAllEvents: true,
      eventTypes: {
        'connection': true,
        'intrusion detected': false
      }
    };
    
    // Insert test data
    const { error: insertError } = await supabase
      .from('user_preferences')
      .insert({
        organization_id: testOrgId,
        user_id: 'test-user',
        location_id: null,
        event_filter_settings: testSettings
      });
    
    if (insertError) {
      console.error('❌ Cannot write to user_preferences:', insertError.message);
      return false;
    }
    
    console.log('✅ Successfully wrote test data');
    
    // Read test data back
    const { data: readData, error: readError } = await supabase
      .from('user_preferences')
      .select('event_filter_settings')
      .eq('organization_id', testOrgId)
      .single();
    
    if (readError) {
      console.error('❌ Cannot read from user_preferences:', readError.message);
      return false;
    }
    
    console.log('✅ Successfully read test data');
    console.log('📄 Data integrity check:', 
      JSON.stringify(readData.event_filter_settings) === JSON.stringify(testSettings) ? 'PASSED' : 'FAILED'
    );
    
    // Clean up test data
    await supabase
      .from('user_preferences')
      .delete()
      .eq('organization_id', testOrgId);
    
    console.log('🧹 Cleaned up test data');
    console.log('');
    console.log('🎉 All tests passed! Your database is ready for event filter settings.');
    return true;
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
}

if (require.main === module) {
  testDatabase().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testDatabase };
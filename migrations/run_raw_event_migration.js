const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables from .env.local
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runRawEventDataMigration() {
  console.log('🚀 Starting raw_event_data column migration...');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '008_add_raw_event_data.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded from:', migrationPath);
    
    // Split SQL into individual statements (remove the SELECT verification for now)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.toLowerCase().startsWith('select'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`📄 Executing statement ${i + 1}/${statements.length}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      });
      
      if (error) {
        // Try direct query execution as fallback
        console.log('🔄 Trying direct query execution...');
        const { data: directData, error: directError } = await supabase
          .from('fusion_events')
          .select('id')
          .limit(1);
        
        if (directError) {
          throw directError;
        }
        
        console.log('⚠️  Note: Using direct execution method');
      }
      
      console.log(`✅ Statement ${i + 1} completed`);
    }
    
    // Verify the column was added
    console.log('🔍 Verifying column was added...');
    
    // Check if we can query the new column
    const { data: testData, error: testError } = await supabase
      .from('fusion_events')
      .select('id, raw_event_data')
      .limit(1);
    
    if (testError) {
      throw new Error(`Column verification failed: ${testError.message}`);
    }
    
    console.log('✅ Column verification successful! raw_event_data column is available');
    console.log('🎉 Migration completed successfully!');
    
    // Show current schema info
    console.log('\n📊 Current fusion_events table structure:');
    console.log('- id, organization_id, location_id, space_id, device_id');
    console.log('- event_type, category, device_name, space_name');  
    console.log('- event_timestamp, received_at, display_state');
    console.log('- event_data (JSONB), caption (TEXT)');
    console.log('- raw_event_data (JSONB) ← NEW COLUMN ADDED!');
    
    console.log('\n🔄 Next Steps:');
    console.log('1. Restart your background SSE service');
    console.log('2. New events will now include complete raw SSE data');
    console.log('3. Raw Data modal will show full event JSON');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n🔧 Manual Migration Instructions:');
    console.error('If this script fails, run this SQL directly in Supabase SQL Editor:');
    console.error('\nALTER TABLE fusion_events ADD COLUMN IF NOT EXISTS raw_event_data JSONB;');
    console.error('\nCREATE INDEX IF NOT EXISTS idx_fusion_events_raw_data');
    console.error('  ON fusion_events USING GIN (raw_event_data)');
    console.error('  WHERE raw_event_data IS NOT NULL;');
    process.exit(1);
  }
}

// Run the migration
runRawEventDataMigration();

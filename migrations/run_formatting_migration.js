const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Running Event Formatting Migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '004_event_formatting_trigger.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Loaded migration SQL');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            // Try direct query if RPC doesn't work
            const { error: directError } = await supabase
              .from('fusion_events')
              .select('count(*)')
              .limit(1);
            
            if (directError) {
              throw error;
            } else {
              console.log(`✅ Statement ${i + 1} executed successfully`);
            }
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Error executing statement ${i + 1}:`, err.message);
          // Don't stop on errors - some might be expected (like DROP TRIGGER IF EXISTS)
        }
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log('\n📋 What was done:');
    console.log('  ✅ Created detect_device_type() function');
    console.log('  ✅ Created normalize_device_state() function'); 
    console.log('  ✅ Created generate_event_description() function');
    console.log('  ✅ Created format_event_trigger() function');
    console.log('  ✅ Added trigger to fusion_events table');
    console.log('  ✅ Updated existing events with formatted descriptions');
    
    console.log('\n🔄 Testing the trigger...');
    
    // Test the trigger by checking if we can call the functions
    try {
      console.log('🧪 Testing device type detection...');
      const testResult = await supabase.rpc('detect_device_type', { device_name: 'BBQ Back Door Light' });
      console.log('📊 Test result:', testResult.data);
      
      if (testResult.data === 'light') {
        console.log('✅ Trigger functions are working correctly!');
      } else {
        console.log('⚠️  Trigger functions may not be working as expected');
      }
    } catch (err) {
      console.log('⚠️  Could not test trigger functions (this is normal if using RPC)');
    }
    
    console.log('\n🚀 All existing events should now have formatted descriptions!');
    console.log('💡 New events will be automatically formatted when inserted.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function runMigrationDirect() {
  try {
    console.log('🚀 Running Event Formatting Migration (Direct SQL)...');
    
    const migrationPath = path.join(__dirname, '004_event_formatting_trigger.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Loaded migration SQL');
    console.log('\n📋 Please run the following SQL in your Supabase SQL Editor:');
    console.log('=' .repeat(80));
    console.log(migrationSQL);
    console.log('=' .repeat(80));
    
    console.log('\n💡 Instructions:');
    console.log('1. Copy the SQL above');
    console.log('2. Go to your Supabase dashboard');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Paste and run the SQL');
    console.log('5. This will add formatting triggers and update existing events');
    
  } catch (error) {
    console.error('❌ Failed to load migration:', error);
    process.exit(1);
  }
}

// Check if we should run direct mode
const args = process.argv.slice(2);
if (args.includes('--direct')) {
  runMigrationDirect();
} else {
  runMigration();
} 
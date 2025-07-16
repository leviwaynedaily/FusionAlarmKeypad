#!/usr/bin/env node
/**
 * User Preferences Table Setup
 * Creates the user_preferences table if it doesn't exist
 * Run this after setting up your Supabase environment variables
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupUserPreferences() {
  console.log('🚀 Setting up user_preferences table...');
  
  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('');
    console.log('To set these variables:');
    console.log('1. Go to your Railway dashboard');
    console.log('2. Navigate to Environment Variables');
    console.log('3. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('4. Or run locally with: NEXT_PUBLIC_SUPABASE_URL=xxx NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx node setup_user_preferences.js');
    process.exit(1);
  }
  
  console.log('🔑 Found Supabase credentials');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Check if table already exists
    console.log('🔍 Checking if user_preferences table exists...');
    const { data: existingTable, error: checkError } = await supabase
      .from('user_preferences')
      .select('count', { count: 'exact', head: true });
    
    if (!checkError) {
      console.log('✅ user_preferences table already exists!');
      console.log(`📊 Current record count: ${existingTable}`);
      return;
    }
    
    console.log('📋 Table does not exist, creating it...');
    
    // Read and execute the migration SQL
    const migrationPath = path.join(__dirname, '003_user_preferences.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔧 Executing migration SQL...');
    
    // Execute the SQL (Note: This requires service role key for DDL operations)
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (migrationError) {
      console.error('❌ Migration failed:', migrationError.message);
      console.log('');
      console.log('💡 This might be because the anonymous key cannot create tables.');
      console.log('   You may need to run this migration directly in your Supabase dashboard:');
      console.log('   1. Go to https://supabase.com/dashboard');
      console.log('   2. Open SQL Editor');
      console.log('   3. Copy and paste the contents of migrations/003_user_preferences.sql');
      console.log('   4. Run the query');
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('🎉 user_preferences table is now ready for use');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('');
    console.log('💡 Manual setup instructions:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Open SQL Editor');
    console.log('   3. Copy and paste the contents of migrations/003_user_preferences.sql');
    console.log('   4. Run the query');
  }
}

if (require.main === module) {
  setupUserPreferences().catch(console.error);
}

module.exports = { setupUserPreferences };
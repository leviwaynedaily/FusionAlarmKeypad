#!/usr/bin/env node
/**
 * Database Migration Runner
 * Applies the areas-to-spaces migration to the Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function runMigration() {
  console.log('🔧 Starting Areas → Spaces Migration...');
  
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Check current table structure
    console.log('📊 Checking current table structure...');
    const { data: beforeColumns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'fusion_events')
      .in('column_name', ['area_id', 'area_name', 'space_id', 'space_name']);
    
    if (columnError) {
      console.log('⚠️  Could not check table structure (this is normal):', columnError.message);
    } else {
      console.log('📋 Current columns:', beforeColumns?.map(c => c.column_name) || []);
    }
    
    // Read and execute migration
    const migrationPath = path.join(__dirname, '002_areas_to_spaces.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Executing migration...');
    console.log('📝 Migration SQL:', migrationSQL);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Result:', data);
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const { data: afterColumns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'fusion_events')
      .in('column_name', ['area_id', 'area_name', 'space_id', 'space_name']);
    
    if (verifyError) {
      console.log('⚠️  Could not verify migration:', verifyError.message);
    } else {
      console.log('📋 New columns:', afterColumns?.map(c => c.column_name) || []);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration }; 
#!/usr/bin/env node
/**
 * Database Schema Checker
 * Checks current schema and determines if migration is needed
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvVars() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    console.log('⚠️  Could not load .env.local file:', error.message);
  }
}

async function checkSchema() {
  console.log('🔍 Checking Database Schema...');
  
  // Load environment variables
  loadEnvVars();
  
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return;
  }
  
  console.log('🔑 Found credentials:', {
    url: supabaseUrl.substring(0, 30) + '...',
    keyPrefix: supabaseKey.substring(0, 10) + '...'
  });
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test basic connection by querying recent events
    console.log('📡 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('fusion_events')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Check if we have any events
    const { count } = await supabase
      .from('fusion_events')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total events in database: ${count || 0}`);
    
    // Sample one event to see current structure
    if (testData && testData.length > 0) {
      const sampleEvent = testData[0];
      console.log('📋 Sample event structure:');
      
      // Check for area vs space columns
      const hasAreaId = 'area_id' in sampleEvent;
      const hasSpaceId = 'space_id' in sampleEvent;
      const hasAreaName = 'area_name' in sampleEvent;
      const hasSpaceName = 'space_name' in sampleEvent;
      
      console.log('🔍 Column analysis:');
      console.log(`  - area_id: ${hasAreaId ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      console.log(`  - space_id: ${hasSpaceId ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      console.log(`  - area_name: ${hasAreaName ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      console.log(`  - space_name: ${hasSpaceName ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      
      if (hasAreaId || hasAreaName) {
        console.log('⚠️  MIGRATION NEEDED: Found area columns that should be renamed to space columns');
        console.log('📝 To migrate: Copy the SQL from migrations/002_areas_to_spaces.sql');
        console.log('📝 Paste it into your Supabase SQL Editor and run it');
      } else if (hasSpaceId || hasSpaceName) {
        console.log('✅ MIGRATION COMPLETE: Space columns found');
      } else {
        console.log('❓ UNKNOWN STATE: No area or space columns found');
      }
      
      console.log('\n📋 Sample event (first 500 chars):');
      const eventStr = JSON.stringify(sampleEvent, null, 2);
      console.log(eventStr.length > 500 ? eventStr.substring(0, 500) + '...' : eventStr);
    } else {
      console.log('ℹ️  No events found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

// Run if called directly
if (require.main === module) {
  checkSchema();
}

module.exports = { checkSchema }; 
#!/usr/bin/env node

/**
 * Test script to verify monitoring endpoints are working correctly
 * Run with: node scripts/test-monitoring.js [base-url]
 * 
 * Example:
 *   node scripts/test-monitoring.js                          # Tests localhost:3000
 *   node scripts/test-monitoring.js https://myapp.railway.app # Tests production
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';

console.log('🔍 Testing monitoring endpoints...');
console.log(`Base URL: ${baseUrl}\n`);

async function testEndpoint(path, description) {
  try {
    console.log(`Testing ${description}...`);
    const url = `${baseUrl}${path}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`✅ ${description}: ${response.status} ${response.statusText}`);
    console.log(`   Response time: ${response.headers.get('x-response-time') || 'unknown'}`);
    
    if (path === '/api/health') {
      console.log(`   System status: ${data.status}`);
      console.log(`   Background SSE: ${data.services?.backgroundSSE?.status || 'unknown'}`);
      console.log(`   Database: ${data.services?.database?.status || 'unknown'}`);
      console.log(`   Last event: ${data.services?.database?.timeSinceLastEvent || 'unknown'}`);
    } else if (path === '/api/monitor') {
      console.log(`   Service OK: ${data.ok}`);
      console.log(`   Background service: ${data.backgroundService}`);
      console.log(`   Minutes since last event: ${data.minutesSinceLastEvent || 'unknown'}`);
    }
    
    console.log('');
    return { success: true, status: response.status, data };
    
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    console.log('');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const tests = [
    { path: '/api/health', description: 'Health Check Endpoint' },
    { path: '/api/monitor', description: 'Monitor Endpoint' },
    { path: '/api/background-sse', description: 'Background SSE Status' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.path, test.description);
    results.push({ ...test, ...result });
  }
  
  console.log('📊 Test Summary:');
  console.log('================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All monitoring endpoints are working correctly!');
    console.log('\n🔗 Monitoring URLs:');
    console.log(`   Health Dashboard: ${baseUrl}/monitoring`);
    console.log(`   Background Service: ${baseUrl}/background-service`);
    console.log(`   Health API: ${baseUrl}/api/health`);
    console.log(`   Monitor API: ${baseUrl}/api/monitor`);
  } else {
    console.log('⚠️  Some endpoints failed. Check the errors above.');
    process.exit(1);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ with built-in fetch support');
  console.log('   Alternatively, install node-fetch: npm install node-fetch');
  process.exit(1);
}

runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
}); 
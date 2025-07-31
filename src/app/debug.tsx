'use client';

import { useState } from 'react';
import { getApiKeyDetails, getLocations, getAreas } from '@/lib/api';

export default function DebugPage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const addResult = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    setResults(prev => [...prev, `${isError ? '❌' : '✅'} [${timestamp}] ${message}`]);
  };
  
  const testApiKey = async () => {
    setLoading(true);
    addResult('Testing API key...');
    try {
      const response = await getApiKeyDetails();
      // 🔒 SECURITY: Only log safe parts of API response
      console.log('API Key test response status:', {
        hasData: !!response.data,
        hasError: !!response.error,
        organizationName: response.data?.organizationInfo?.name || 'Unknown'
      });
      
      if (response.error) {
        addResult(`API Error: ${response.error}`, true);
      } else {
        addResult('API Key is valid!');
        addResult(`Organization: ${response.data?.organizationInfo?.name || 'Unknown'}`);
      }
    } catch (error) {
      addResult(`Exception: ${error}`, true);
      console.error('Exception:', error);
    }
    setLoading(false);
  };
  
  const testLocations = async () => {
    setLoading(true);
    addResult('Testing get locations...');
    try {
      const response = await getLocations();
      // 🔒 SECURITY: Only log safe parts of locations response
      console.log('Locations response status:', {
        hasData: !!response.data,
        hasError: !!response.error,
        locationCount: response.data?.length || 0
      });
      
      if (response.error) {
        addResult(`Locations Error: ${response.error}`, true);
      } else {
        addResult(`Found ${response.data?.length || 0} locations`);
        if (response.data && response.data.length > 0) {
          addResult(`First location: ${response.data[0].name}`);
          
          // Test getting areas for first location
          addResult('Testing get areas...');
          const areasResponse = await getAreas(response.data[0].id);
          // 🔒 SECURITY: Only log safe parts of areas response
          console.log('Areas response status:', {
            hasData: !!areasResponse.data,
            hasError: !!areasResponse.error,
            areaCount: areasResponse.data?.length || 0
          });
          
          if (areasResponse.error) {
            addResult(`Areas Error: ${areasResponse.error}`, true);
          } else {
            addResult(`Found ${areasResponse.data?.length || 0} areas`);
          }
        }
      }
    } catch (error) {
      addResult(`Exception: ${error}`, true);
      console.error('Exception:', error);
    }
    setLoading(false);
  };
  
  const clearResults = () => {
    setResults([]);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0f0f0f] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Debug API Calls</h1>
        
        <div className="mb-8 space-x-4">
          <button
            onClick={testApiKey}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test API Key
          </button>
          <button
            onClick={testLocations}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test Locations
          </button>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Back to App
          </a>
        </div>
        
        {loading && (
          <div className="mb-4 text-blue-500">Loading...</div>
        )}
        
        <div className="bg-white dark:bg-[#0f0f0f] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Results:</h2>
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200">
            {results.length > 0 ? results.join('\n') : 'Click a button to run tests...'}
          </pre>
        </div>
        
        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">
          <p>Check the browser console for detailed logs.</p>
        </div>
      </div>
    </div>
  );
} 
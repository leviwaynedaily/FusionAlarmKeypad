// 🔒 SECURITY: Secure API key management endpoint

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withRateLimit, RateLimitPresets } from '@/lib/rateLimiter';

const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/'
};

export async function POST(request: NextRequest) {
  // 🔒 SECURITY: Apply rate limiting for auth endpoints
  const rateLimit = withRateLimit(RateLimitPresets.AUTH.limit, RateLimitPresets.AUTH.windowMs);
  const { isAllowed, headers: rateLimitHeaders } = rateLimit(request);
  
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  try {
    const { apiKey, action } = await request.json();
    
    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    const cookieStore = cookies();

    switch (action) {
      case 'set':
        if (!apiKey) {
          return NextResponse.json({ error: 'API key required' }, { status: 400 });
        }
        
        // Store API key in HTTP-only cookie
        cookieStore.set('fusion_api_key_secure', apiKey, SECURE_COOKIE_OPTIONS);
        
        return NextResponse.json({ 
          success: true, 
          message: 'API key stored securely' 
        }, { headers: rateLimitHeaders });

      case 'clear':
        // Clear API key cookie
        cookieStore.delete('fusion_api_key_secure');
        
        return NextResponse.json({ 
          success: true, 
          message: 'API key cleared' 
        }, { headers: rateLimitHeaders });

      case 'validate':
        if (!apiKey) {
          return NextResponse.json({ error: 'API key required' }, { status: 400 });
        }
        
        // Validate API key by testing it against the Fusion API
        const baseUrl = process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'https://app.getfusion.io';
        
        try {
          const response = await fetch(`${baseUrl}/api/admin/api-keys/test`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
            },
          });

          if (!response.ok) {
            return NextResponse.json({ 
              success: false, 
              error: `API validation failed: ${response.status}` 
            }, { status: 400 });
          }

          const data = await response.json();
          
          // Store validated API key in secure cookie
          cookieStore.set('fusion_api_key_secure', apiKey, SECURE_COOKIE_OPTIONS);
          
          // Also store organization info if available
          if (data.data?.organizationInfo) {
            cookieStore.set(
              'fusion_org_secure', 
              JSON.stringify(data.data.organizationInfo), 
              SECURE_COOKIE_OPTIONS
            );
          }

          return NextResponse.json({ 
            success: true, 
            message: 'API key validated and stored securely',
            organizationInfo: data.data?.organizationInfo || null
          }, { headers: rateLimitHeaders });
          
        } catch (error) {
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to validate API key with Fusion API' 
          }, { status: 500 });
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('API key management error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // 🔒 SECURITY: Apply rate limiting for auth endpoints  
  const rateLimit = withRateLimit(RateLimitPresets.API.limit, RateLimitPresets.API.windowMs);
  const { isAllowed, headers: rateLimitHeaders } = rateLimit(request);
  
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  try {
    const cookieStore = cookies();
    
    // Check if API key exists in secure cookie
    const apiKeyCookie = cookieStore.get('fusion_api_key_secure');
    const orgCookie = cookieStore.get('fusion_org_secure');
    
    let organizationInfo = null;
    if (orgCookie?.value) {
      try {
        organizationInfo = JSON.parse(orgCookie.value);
      } catch {
        // Invalid JSON, ignore
      }
    }
    
    return NextResponse.json({
      hasApiKey: !!apiKeyCookie?.value,
      organizationInfo,
      // 🔒 SECURITY: Never return the actual API key
      apiKeyStatus: apiKeyCookie?.value ? 'present' : 'missing'
    }, { headers: rateLimitHeaders });
    
  } catch (error) {
    console.error('API key status check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
// 🔒 SECURITY: Secure storage utilities to replace localStorage for sensitive data

import { cookies } from 'next/headers';

/**
 * Secure storage configuration
 */
const SECURE_STORAGE_CONFIG = {
  // Cookie names
  API_KEY_COOKIE: 'fusion_api_key_secure',
  ORGANIZATION_COOKIE: 'fusion_org_secure',
  
  // Cookie options
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  }
};

/**
 * Server-side secure storage using HTTP-only cookies
 * Only works in server components and API routes
 */
export class SecureServerStorage {
  /**
   * Store API key securely in HTTP-only cookie
   */
  static async setApiKey(apiKey: string): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error('SecureServerStorage can only be used server-side');
    }
    
    const cookieStore = await cookies();
    cookieStore.set(
      SECURE_STORAGE_CONFIG.API_KEY_COOKIE,
      apiKey,
      SECURE_STORAGE_CONFIG.COOKIE_OPTIONS
    );
  }

  /**
   * Retrieve API key from HTTP-only cookie
   */
  static async getApiKey(): Promise<string | null> {
    if (typeof window !== 'undefined') {
      throw new Error('SecureServerStorage can only be used server-side');
    }
    
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SECURE_STORAGE_CONFIG.API_KEY_COOKIE);
    return cookie?.value || null;
  }

  /**
   * Remove API key cookie
   */
  static async clearApiKey(): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error('SecureServerStorage can only be used server-side');
    }
    
    const cookieStore = await cookies();
    cookieStore.delete(SECURE_STORAGE_CONFIG.API_KEY_COOKIE);
  }

  /**
   * Store organization data securely
   */
  static async setOrganization(orgData: any): Promise<void> {
    if (typeof window !== 'undefined') {
      throw new Error('SecureServerStorage can only be used server-side');
    }
    
    const cookieStore = await cookies();
    cookieStore.set(
      SECURE_STORAGE_CONFIG.ORGANIZATION_COOKIE,
      JSON.stringify(orgData),
      SECURE_STORAGE_CONFIG.COOKIE_OPTIONS
    );
  }

  /**
   * Retrieve organization data
   */
  static async getOrganization(): Promise<any | null> {
    if (typeof window !== 'undefined') {
      throw new Error('SecureServerStorage can only be used server-side');
    }
    
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SECURE_STORAGE_CONFIG.ORGANIZATION_COOKIE);
    
    if (!cookie?.value) return null;
    
    try {
      return JSON.parse(cookie.value);
    } catch {
      return null;
    }
  }
}

/**
 * Client-side secure storage that uses sessionStorage and encryption
 * for cases where we absolutely need client-side access
 */
export class SecureClientStorage {
  private static readonly SESSION_KEY_PREFIX = 'fusion_secure_';
  
  /**
   * Simple client-side encryption (NOT cryptographically secure, but better than plain text)
   * For true security, use server-side storage
   */
  private static simpleEncrypt(text: string): string {
    // Simple XOR encryption with environment-based key
    const keyData = process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'fallback-key';
    let result = '';
    
    for (let i = 0; i < text.length; i++) {
      const keyChar = keyData.charCodeAt(i % keyData.length);
      const textChar = text.charCodeAt(i);
      result += String.fromCharCode(textChar ^ keyChar);
    }
    
    return btoa(result); // Base64 encode
  }
  
  private static simpleDecrypt(encryptedText: string): string {
    try {
      const decoded = atob(encryptedText); // Base64 decode
      const keyData = process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'fallback-key';
      let result = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const keyChar = keyData.charCodeAt(i % keyData.length);
        const encChar = decoded.charCodeAt(i);
        result += String.fromCharCode(encChar ^ keyChar);
      }
      
      return result;
    } catch {
      return '';
    }
  }

  /**
   * Store API key in encrypted sessionStorage (less persistent than localStorage)
   */
  static setApiKey(apiKey: string): void {
    if (typeof window === 'undefined') {
      console.warn('SecureClientStorage can only be used client-side');
      return;
    }
    
    const encrypted = this.simpleEncrypt(apiKey);
    sessionStorage.setItem(this.SESSION_KEY_PREFIX + 'api_key', encrypted);
  }

  /**
   * Retrieve API key from encrypted sessionStorage
   */
  static getApiKey(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const encrypted = sessionStorage.getItem(this.SESSION_KEY_PREFIX + 'api_key');
    if (!encrypted) return null;
    
    return this.simpleDecrypt(encrypted) || null;
  }

  /**
   * Clear API key from sessionStorage
   */
  static clearApiKey(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    sessionStorage.removeItem(this.SESSION_KEY_PREFIX + 'api_key');
  }

  /**
   * Migrate from localStorage to secure storage
   */
  static migrateFromLocalStorage(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    // Get existing API key from localStorage
    const existingKey = localStorage.getItem('fusion_api_key');
    
    if (existingKey) {
      console.log('🔒 Migrating API key from localStorage to secure storage');
      
      // Store in secure storage
      this.setApiKey(existingKey);
      
      // Remove from localStorage
      localStorage.removeItem('fusion_api_key');
      
      console.log('✅ API key migration completed');
      return existingKey;
    }
    
    return null;
  }
}

/**
 * Unified secure storage interface that chooses the best method
 */
export class SecureStorage {
  /**
   * Get API key using the most secure method available
   */
  static getApiKey(): string | null {
    // Try environment variable first (most secure)
    const envKey = process.env.NEXT_PUBLIC_FUSION_API_KEY;
    if (envKey) {
      return envKey;
    }
    
    // Try server-side secure storage if available
    if (typeof window === 'undefined') {
      try {
        return await SecureServerStorage.getApiKey();
      } catch {
        return null;
      }
    }
    
    // Client-side: try secure storage, fallback to migration
    let key = SecureClientStorage.getApiKey();
    if (!key) {
      key = SecureClientStorage.migrateFromLocalStorage();
    }
    
    return key;
  }

  /**
   * Set API key using the most secure method available
   */
  static async setApiKey(apiKey: string): Promise<void> {
    if (typeof window === 'undefined') {
      // Server-side: use HTTP-only cookies
      await SecureServerStorage.setApiKey(apiKey);
    } else {
      // Client-side: use encrypted sessionStorage
      SecureClientStorage.setApiKey(apiKey);
    }
  }

  /**
   * Clear API key from all storage methods
   */
  static async clearApiKey(): Promise<void> {
    if (typeof window === 'undefined') {
      await SecureServerStorage.clearApiKey();
    } else {
      SecureClientStorage.clearApiKey();
      // Also clear old localStorage for cleanup
      localStorage.removeItem('fusion_api_key');
    }
  }
}
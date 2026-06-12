// FORCH.i ORACLE — Data Layer Factory (v2)
// Supabase is MANDATORY in production.
// In-memory fallback ONLY for local development.

import type { IDataLayer } from './interface';

let dataLayerInstance: IDataLayer | null = null;
let supabaseActive = false;

/**
 * Get the active data layer instance.
 * In production: throws if Supabase not configured.
 * In development: falls back to in-memory.
 */
export function getDataLayer(): IDataLayer {
  if (dataLayerInstance) return dataLayerInstance;

  const isProd = process.env.NODE_ENV === 'production';
  const hasEnv = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY));

  if (isProd && !hasEnv) {
    throw new Error(
      'PRODUCTION_REQUIRES_SUPABASE: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel environment variables.'
    );
  }

  // If we get here in prod, Supabase is available (loaded async)
  // For sync fallback in dev, use in-memory
  if (!hasEnv) {
    console.log('[data-layer] Using in-memory data layer (development only)');
    const { inMemoryDataLayer } = require('./in-memory');
    dataLayerInstance = inMemoryDataLayer;
  }

  return dataLayerInstance!;
}

/**
 * Async version that dynamically loads Supabase.
 * This is the primary entry point for all API routes.
 */
export async function getDataLayerAsync(): Promise<IDataLayer> {
  if (dataLayerInstance) return dataLayerInstance;

  const isProd = process.env.NODE_ENV === 'production';
  const hasEnv = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY));

  // Production: MUST have Supabase
  if (isProd && !hasEnv) {
    throw new Error(
      'PRODUCTION_REQUIRES_SUPABASE: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel environment variables.\n' +
      'Run: vercel env add SUPABASE_URL && vercel env add SUPABASE_SERVICE_KEY'
    );
  }

  if (hasEnv) {
    try {
      // Verify @supabase/supabase-js is installed
      let sdkAvailable = false;
      try {
        await import('@supabase/supabase-js');
        sdkAvailable = true;
      } catch {
        sdkAvailable = false;
      }

      if (!sdkAvailable) {
        const msg = '[data-layer] @supabase/supabase-js not installed. Run: npm install @supabase/supabase-js';
        if (isProd) throw new Error(msg);
        console.warn(msg);
      } else {
        const { supabaseDataLayer } = await import('./supabase');
        console.log('[data-layer] ✅ Using Supabase data layer');
        supabaseActive = true;
        dataLayerInstance = supabaseDataLayer as IDataLayer;
        return dataLayerInstance;
      }
    } catch (err) {
      if (isProd) throw err; // In production, don't fall back
      console.warn('[data-layer] Failed to load Supabase, falling back to in-memory:', err);
    }
  }

  // Development fallback only
  if (!isProd) {
    console.log('[data-layer] Using in-memory data layer (development)');
    const { inMemoryDataLayer } = await import('./in-memory');
    dataLayerInstance = inMemoryDataLayer;
  } else {
    throw new Error('PRODUCTION_REQUIRES_SUPABASE: Could not initialize Supabase client.');
  }

  return dataLayerInstance;
}

export function isSupabaseActive(): boolean {
  return supabaseActive;
}

/**
 * Reset the data layer instance (for testing or reconnection).
 */
export function resetDataLayer(): void {
  dataLayerInstance = null;
  supabaseActive = false;
}

export { inMemoryDataLayer } from './in-memory';
export type { IDataLayer } from './interface';

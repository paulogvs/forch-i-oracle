// FORCH.i ORACLE — Data Layer Factory
// Automatically selects Supabase or in-memory based on environment.

import type { IDataLayer } from './interface';
import { inMemoryDataLayer } from './in-memory';

let dataLayerInstance: IDataLayer | null = null;
let supabaseActive = false;

/**
 * Get the active data layer instance.
 * Falls back to in-memory. Call getDataLayerAsync() for Supabase support.
 */
export function getDataLayer(): IDataLayer {
  if (dataLayerInstance) return dataLayerInstance;
  dataLayerInstance = inMemoryDataLayer;
  return dataLayerInstance;
}

/**
 * Async version that dynamically loads Supabase if configured.
 * Uses dynamic import() to avoid build-time module resolution.
 */
export async function getDataLayerAsync(): Promise<IDataLayer> {
  if (dataLayerInstance) return dataLayerInstance;

  const hasEnv = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY));

  if (hasEnv) {
    try {
      let sdkAvailable = false;
      try {
        await import('@supabase/supabase-js');
        sdkAvailable = true;
      } catch {
        sdkAvailable = false;
      }

      if (sdkAvailable) {
        const { supabaseDataLayer } = await import('./supabase');
        console.log('[data-layer] Using Supabase data layer');
        supabaseActive = true;
        dataLayerInstance = supabaseDataLayer as IDataLayer;
      } else {
        console.warn('[data-layer] Supabase env set but @supabase/supabase-js not installed. Run: npm install @supabase/supabase-js');
        dataLayerInstance = inMemoryDataLayer;
      }
    } catch (err) {
      console.warn('[data-layer] Failed to load Supabase, falling back to in-memory:', err);
      dataLayerInstance = inMemoryDataLayer;
    }
  } else {
    console.log('[data-layer] Using in-memory data layer (Supabase not configured)');
    dataLayerInstance = inMemoryDataLayer;
  }

  return dataLayerInstance;
}

export function isSupabaseActive(): boolean {
  return supabaseActive;
}

export { inMemoryDataLayer } from './in-memory';
export type { IDataLayer } from './interface';

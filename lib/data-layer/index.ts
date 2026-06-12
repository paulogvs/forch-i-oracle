// FORCH.i ORACLE — Data Layer Factory (v2)
// Supabase is preferred in production.
// In-memory fallback for development AND for production without Supabase.

import type { IDataLayer } from './interface';

let dataLayerInstance: IDataLayer | null = null;
let supabaseActive = false;

/**
 * Get the active data layer instance.
 */
export function getDataLayer(): IDataLayer {
  if (!dataLayerInstance) {
    initSync();
  }
  return dataLayerInstance!;
}

/**
 * Async version that dynamically loads Supabase.
 * This is the primary entry point for all API routes.
 */
export async function getDataLayerAsync(): Promise<IDataLayer> {
  if (dataLayerInstance) return dataLayerInstance;
  await initAsync();
  return dataLayerInstance!;
}

function initSync(): void {
  if (dataLayerInstance) return;

  const hasEnv = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY));

  if (!hasEnv) {
    // No Supabase configured — use in-memory (works in dev, graceful in prod)
    console.log('[data-layer] No Supabase env vars — using in-memory (data resets per request)');
    const { inMemoryDataLayer } = require('./in-memory');
    dataLayerInstance = inMemoryDataLayer;
    return;
  }

  // Supabase env vars present — can't init sync, use in-memory as temp
  console.log('[data-layer] Supabase env detected, use getDataLayerAsync() for Supabase client');
  const { inMemoryDataLayer } = require('./in-memory');
  dataLayerInstance = inMemoryDataLayer;
}

async function initAsync(): Promise<void> {
  if (dataLayerInstance) return;

  const hasEnv = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY));

  if (hasEnv) {
    try {
      // Try to load Supabase data layer (will fail if SDK not installed)
      const { supabaseDataLayer } = await import('./supabase');
      console.log('[data-layer] ✅ Using Supabase data layer');
      supabaseActive = true;
      dataLayerInstance = supabaseDataLayer as IDataLayer;
      return;
    } catch (err) {
      console.warn('[data-layer] Failed to load Supabase, falling back to in-memory:', err);
    }
  }

  // Fallback: in-memory
  console.log('[data-layer] Using in-memory data layer');
  const { inMemoryDataLayer } = await import('./in-memory');
  dataLayerInstance = inMemoryDataLayer;
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

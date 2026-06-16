// FORCH.i ORACLE — Data Layer Factory
// Always uses in-memory data layer with file store persistence.
// No external database dependencies.

import type { IDataLayer } from './interface';

let dataLayerInstance: IDataLayer | null = null;

/**
 * Get the active data layer instance (sync).
 */
export function getDataLayer(): IDataLayer {
  if (!dataLayerInstance) {
    const { inMemoryDataLayer } = require('./in-memory');
    dataLayerInstance = inMemoryDataLayer;
  }
  return dataLayerInstance!;
}

/**
 * Async version — primary entry point for API routes.
 */
export async function getDataLayerAsync(): Promise<IDataLayer> {
  if (dataLayerInstance) return dataLayerInstance;
  const { inMemoryDataLayer } = await import('./in-memory');
  dataLayerInstance = inMemoryDataLayer;
  return dataLayerInstance!;
}

/**
 * Reset the data layer instance (for testing).
 */
export function resetDataLayer(): void {
  dataLayerInstance = null;
}

export { inMemoryDataLayer } from './in-memory';
export type { IDataLayer } from './interface';

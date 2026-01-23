let indexerModule: any;

/*
 * This file is the "facade" for Indexer.
 * It conditionally imports the server or client version based on the environment.
 */
if (import.meta.env.SSR) {
  // On the server, import the actual server-side Indexer
  indexerModule = await import('./Indexer.server');
} else {
  // On the client, import the mock client-side Indexer
  indexerModule = await import('./Indexer.client');
}

export const Indexer = indexerModule.Indexer;
export type { Document } from './Indexer.server'; // Export types from the server version for correctness

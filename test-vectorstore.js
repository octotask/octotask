// Test script to verify VectorStore can be imported without errors
import { VectorStore } from './app/core/workspace/VectorStore.js';

console.log('VectorStore imported successfully');

// Test instantiation
const vectorStore = new VectorStore();
console.log('VectorStore instantiated successfully');

// Test server-side behavior
if (typeof window === 'undefined') {
  console.log('Running on server side - VectorStore should skip initialization');
  vectorStore.initialize().then(() => {
    console.log('Server-side initialization completed successfully');
  }).catch(err => {
    console.error('Server-side initialization failed:', err);
  });
} else {
  console.log('Running on client side');
}

import { pipeline } from '@xenova/transformers';

export async function getEmbedder() {
  return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
}

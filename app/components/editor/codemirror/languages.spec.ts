import { describe, expect, it } from 'vitest';
import { getLanguage } from './languages';

describe('getLanguage', () => {
  it('memoizes by extension so repeated requests reuse the same language support', async () => {
    const first = await getLanguage('index.tsx');
    const second = await getLanguage('app.tsx');

    expect(first).toBe(second);
  });
});

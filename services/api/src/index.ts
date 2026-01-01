import { Hono } from 'hono';

// This is a placeholder for a real KV store like Cloudflare KV.
const vault = new Map<string, string>();

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello from the OctoTask API!');
});

// Vault API routes
app.get('/vault/:key', (c) => {
  const key = c.req.param('key');
  const value = vault.get(key);
  if (value === undefined) {
    return c.json({ error: 'Secret not found' }, 404);
  }
  return c.json({ key, value });
});

app.post('/vault/:key', async (c) => {
  const key = c.req.param('key');
  const { value } = await c.req.json<{ value: string }>();
  if (typeof value !== 'string') {
    return c.json({ error: 'Invalid value' }, 400);
  }
  vault.set(key, value);
  console.log(`[API] Secret saved: ${key}`);
  return c.json({ success: true });
});

app.delete('/vault/:key', (c) => {
  const key = c.req.param('key');
  vault.delete(key);
  console.log(`[API] Secret deleted: ${key}`);
  return c.json({ success: true });
});

export default app;

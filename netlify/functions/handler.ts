// netlify/functions/hello.ts
export async function handler() {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Netlify Functions!" }),
  };
}

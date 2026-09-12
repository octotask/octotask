import { createPagesFunctionHandler } from '@remix-run/cloudflare-pages';

export const onRequest: PagesFunction = async (context) => {
  const serverBuild = (await Function('return import("../build/server")')()) as any;

  const handler = createPagesFunctionHandler({
    build: serverBuild,
  });

  return handler(context);
};

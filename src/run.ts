import pkgConf from "pkg-conf";

import type { ApplicationFunction, Options, ServerOptions } from "./types.js";
import { Logger, Octotask, OctotaskOctokit } from "./index.js";
import { setupAppFactory } from "./apps/setup.js";
import { getLog } from "./helpers/get-log.js";
import { readCliOptions } from "./bin/read-cli-options.js";
import { readEnvOptions } from "./bin/read-env-options.js";
import { Server } from "./server/server.js";
import { defaultApp } from "./apps/default.js";
import { resolveAppFunction } from "./helpers/resolve-app-function.js";
import { isProduction } from "./helpers/is-production.js";
import { config as dotenvConfig } from "dotenv";

type AdditionalOptions = {
  env?: NodeJS.ProcessEnv;
  Octokit?: typeof OctotaskOctokit;
  log?: Logger;
};

/**
 *
 * @param appFnOrArgv set to either a octotask application function: `(app) => { ... }` or to process.argv
 */
export async function run(
  appFnOrArgv: ApplicationFunction | string[],
  additionalOptions?: AdditionalOptions,
) {
  dotenvConfig();

  const envOptions = readEnvOptions(additionalOptions?.env);
  const cliOptions = Array.isArray(appFnOrArgv)
    ? readCliOptions(appFnOrArgv)
    : {};

  const {
    // log options
    logLevel: level,
    logFormat,
    logLevelInString,
    logMessageKey,
    sentryDsn,

    // server options
    host,
    port,
    webhookPath,
    webhookProxy,

    // octotask options
    appId,
    privateKey,
    redisConfig,
    secret,
    baseUrl,

    // others
    args,
  } = { ...envOptions, ...cliOptions };

  const log = getLog({
    level,
    logFormat,
    logLevelInString,
    logMessageKey,
    sentryDsn,
  });

  const octotaskOptions: Options = {
    appId,
    privateKey,
    redisConfig,
    secret,
    baseUrl,
    log: additionalOptions?.log || log.child({ name: "octotask" }),
    Octokit: additionalOptions?.Octokit || undefined,
  };

  const serverOptions: ServerOptions = {
    host,
    port,
    webhookPath,
    webhookProxy,
    log: log.child({ name: "server" }),
    Octotask: Octotask.defaults(octotaskOptions),
  };

  let server: Server;

  if (!appId || !privateKey) {
    if (isProduction()) {
      if (!appId) {
        throw new Error(
          "App ID is missing, and is required to run in production mode. " +
            "To resolve, ensure the APP_ID environment variable is set.",
        );
      } else if (!privateKey) {
        throw new Error(
          "Certificate is missing, and is required to run in production mode. " +
            "To resolve, ensure either the PRIVATE_KEY or PRIVATE_KEY_PATH environment variable is set and contains a valid certificate",
        );
      }
    }

    // Workaround for setup (#1512)
    // When octotask is started for the first time, it gets into a setup mode
    // where `appId` and `privateKey` are not present. The setup mode gets
    // these credentials. In order to not throw an error, we set the values
    // to anything, as the Octotask instance is not used in setup it makes no
    // difference anyway.
    server = new Server({
      ...serverOptions,
      Octotask: Octotask.defaults({
        ...octotaskOptions,
        appId: 1,
        privateKey: "dummy value for setup, see #1512",
      }),
    });
    await server.load(setupAppFactory(host, port));
    await server.start();
    return server;
  }

  if (Array.isArray(appFnOrArgv)) {
    const pkg = await pkgConf("octotask");

    const combinedApps: ApplicationFunction = async (_app) => {
      await server.load(defaultApp);

      if (Array.isArray(pkg.apps)) {
        for (const appPath of pkg.apps) {
          const appFn = await resolveAppFunction(appPath);
          await server.load(appFn);
        }
      }

      const [appPath] = args;
      const appFn = await resolveAppFunction(appPath);
      await server.load(appFn);
    };

    server = new Server(serverOptions);
    await server.load(combinedApps);
    await server.start();
    return server;
  }

  server = new Server(serverOptions);
  await server.load(appFnOrArgv);
  await server.start();

  return server;
}

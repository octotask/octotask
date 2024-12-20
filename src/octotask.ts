import { LRUCache } from "lru-cache";
import type { Logger } from "pino";
import type { EmitterWebhookEvent as WebhookEvent } from "@octokit/webhooks";

import { auth } from "./auth.js";
import { getLog } from "./helpers/get-log.js";
import { getOctotaskOctokitWithDefaults } from "./octokit/get-octotask-octokit-with-defaults.js";
import { getWebhooks } from "./octokit/get-webhooks.js";
import { OctotaskOctokit } from "./octokit/octotask-octokit.js";
import { VERSION } from "./version.js";
import type {
  ApplicationFunction,
  ApplicationFunctionOptions,
  Options,
  OctotaskWebhooks,
  State,
} from "./types.js";
import { defaultWebhooksPath } from "./server/server.js";
import { rebindLog } from "./helpers/rebind-log.js";

export type Constructor<T = any> = new (...args: any[]) => T;

export class Octotask {
  static version = VERSION;
  static defaults<S extends Constructor>(this: S, defaults: Options) {
    const OctotaskWithDefaults = class extends this {
      constructor(...args: any[]) {
        const options = args[0] || {};
        super(Object.assign({}, defaults, options));
      }
    };

    return OctotaskWithDefaults;
  }

  public webhooks: OctotaskWebhooks;
  public webhookPath: string;
  public log: Logger;
  public version: String;
  public on: OctotaskWebhooks["on"];
  public onAny: OctotaskWebhooks["onAny"];
  public onError: OctotaskWebhooks["onError"];
  public auth: (
    installationId?: number,
    log?: Logger,
  ) => Promise<OctotaskOctokit>;

  private state: State;

  constructor(options: Options = {}) {
    options.secret = options.secret || "development";

    let level = options.logLevel;
    const logMessageKey = options.logMessageKey;

    this.log = options.log
      ? rebindLog(options.log)
      : getLog({ level, logMessageKey });

    // TODO: support redis backend for access token cache if `options.redisConfig`
    const cache = new LRUCache<number, string>({
      // cache max. 15000 tokens, that will use less than 10mb memory
      max: 15000,
      // Cache for 1 minute less than GitHub expiry
      ttl: 1000 * 60 * 59,
    });

    const Octokit = getOctotaskOctokitWithDefaults({
      githubToken: options.githubToken,
      Octokit: options.Octokit || OctotaskOctokit,
      appId: Number(options.appId),
      privateKey: options.privateKey,
      cache,
      log: rebindLog(this.log),
      redisConfig: options.redisConfig,
      baseUrl: options.baseUrl,
    });
    const octokitLogger = rebindLog(this.log.child({ name: "octokit" }));
    const octokit = new Octokit({
      request: options.request,
      log: {
        debug: octokitLogger.debug.bind(octokitLogger),
        info: octokitLogger.info.bind(octokitLogger),
        warn: octokitLogger.warn.bind(octokitLogger),
        error: octokitLogger.error.bind(octokitLogger),
      },
    });

    this.state = {
      cache,
      githubToken: options.githubToken,
      log: rebindLog(this.log),
      Octokit,
      octokit,
      webhooks: {
        secret: options.secret,
      },
      appId: Number(options.appId),
      privateKey: options.privateKey,
      host: options.host,
      port: options.port,
      webhookPath: options.webhookPath || defaultWebhooksPath,
      request: options.request,
    };

    this.auth = auth.bind(null, this.state);

    this.webhooks = getWebhooks(this.state);
    this.webhookPath = this.state.webhookPath;

    this.on = this.webhooks.on;
    this.onAny = this.webhooks.onAny;
    this.onError = this.webhooks.onError;

    this.version = VERSION;
  }

  public receive(event: WebhookEvent) {
    this.log.debug({ event }, "Webhook received");
    return this.webhooks.receive(event);
  }

  public async load(
    appFn: ApplicationFunction | ApplicationFunction[],
    options: ApplicationFunctionOptions = {},
  ) {
    if (Array.isArray(appFn)) {
      for (const fn of appFn) {
        await this.load(fn);
      }
      return;
    }

    return appFn(this, options);
  }
}

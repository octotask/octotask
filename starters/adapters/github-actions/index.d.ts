import { ApplicationFunction } from "octotask";

declare function run(
  octotaskApp: ApplicationFunction | ApplicationFunction[]
): Promise<void>;

export = { run };

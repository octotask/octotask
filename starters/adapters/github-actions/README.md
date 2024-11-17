# :electric_plug: `@octotask/adapter-github-actions`

> Adapter to run a [Octotask](https://octotask.github.io/) application function in [GitHub Actions](https://github.com/features/actions)

[![Build Status](https://github.com/octotask/adapter-github-actions/workflows/Test/badge.svg)](https://github.com/octotask/adapter-github-actions/actions)

## Usage

Create your Octotask Application as always

```js
// app.js
export default (app) => {
  app.on("issues.opened", async (context) => {
    const params = context.issue({ body: "Hello World!" });
    await context.octokit.issues.createComment(params);
  });
};
```

Then in the entrypoint of your GitHub Action, require `@octotask/adapter-github-actions` instead of `octotask`

```js
// index.js
import { run } from "@octotask/adapter-github-actions";
import app from "./app.js";

run(app).catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Then use `index.js` as your entrypoint in the `action.yml` file

```yaml
name: "Octotask app name"
description: "Octotask app description."
runs:
  using: "node20"
  main: "index.js"
```

**Important**: Your external dependencies will not be installed, you have to either vendor them in by committing the contents of the `node_modules` folder, or compile the code to a single executable script (recommended). See [GitHub's documentation](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action#commit-tag-and-push-your-action-to-github)

For an example Octotask App that is continuously published as GitHub Action, see https://github.com/octotask/example-github-action#readme

## How it works

[Octotask](https://octotask.github.io/) is a framework for building [GitHub Apps](docs.github.com/apps), which is different to creating [GitHub Actions](https://docs.github.com/actions/) in many ways, but the functionality is the same:

Both get notified about events on GitHub, which you can act on. While a GitHub App gets notified about a GitHub event via a webhook request sent by GitHub, a GitHub Action can receive the event payload by reading a JSON file from the file system. We can abstract away the differences, so the same hello world example app shown above works in both environments.

Relevant differences for Octotask applications:

1. You cannot authenticate as the app. The `octotask` instance you receive is authenticated using a GitHub token. In most cases the token will be set to `secrets.GITHUB_TOKEN`, which is [an installation access token](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#about-the-github_token-secret). The provided `GITHUB_TOKEN` expires when the job is done or after 6 hours, whichever comes first. You do not have access to an `APP_ID` or `PRIVATE_KEY`, you cannot create new tokens or renew the provided one.
2. `secrets.GITHUB_TOKEN` is scoped to the current repository. You cannot read data from other repositories unless they are public, you cannot update any other repositories, or access organization-level APIs.
3. You could provide a personal access token instead of `secrets.GITHUB_TOKEN` to workaround the limits of a repository-scoped token, but be sure you know what you are doing.
4. You don't need to configure `WEBHOOK_SECRET`, because no webhook request gets sent, the event information can directly be retrieved from environment variables and the local file system.

For a more thorough comparison, see [@jasonetco's](https://github.com/jasonetco) posts:

1. [Octotask App or GitHub Action](https://jasonet.co/posts/octotask-app-or-github-action/) (Jan 2019)
2. [Update from April 2020](https://jasonet.co/posts/octotask-app-or-github-action-v2/)

## License

[ISC](LICENSE)

# `@octotask/adapter-azure-functions`

> Adapter to run a [Octotask](https://octotask.github.io/) application function in [Azure Functions](https://azure.microsoft.com/services/functions/)

## Usage

Create your Octotask Application as always

```js
// app.js
module.exports = (app) => {
  app.on("issues.opened", async (context) => {
    const params = context.issue({ body: "Hello World!" });
    await context.octokit.issues.createComment(params);
  });
};
```

### Azure Functions v4

In your Azure function file:

```js
// src/functions/octotask.js
const { app } = require("@azure/functions");
const {
  createAzureFunctionV4,
  createOctotask,
} = require("@octotask/adapter-azure-functions");
const octotaskapp = require("../app");

app.http("octotask", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: createAzureFunctionV4(octotaskapp, {
    octotask: createOctotask(),
  }),
});
```

### Azure Functions v3

Create a folder with `function.json` and `index.js`, e.g.

```js
// OctotaskFunction/function.json
{
  "bindings": [
    {
      "authLevel": "Anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

and

```js
// OctotaskFunction/index.js
const {
  createAzureFunction,
  createOctotask,
} = require("@octotask/adapter-azure-functions");
const app = require("../app");
module.exports = createAzureFunction(app, {
  octotask: createOctotask(),
});
```

For an example Octotask App continuously deployed to Azure Functions, see https://github.com/octotask/example-azure-function/#how-it-works

## How it works

`@octotask/adapter-azure-functions` exports everything that [`octotask`](https://github.com/octotask/octotask/#readme) does plus `createAzureFunction`.

`createAzureFunction` slightly differs from Octotask's built-in `createNodeMiddleware`, as an Azure function does receives slightly different parameters.

## License

[ISC](LICENSE)

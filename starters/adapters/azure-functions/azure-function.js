module.exports = azureFunction;

/**
 * @param {import('octotask').Octotask} octotask
 * @param {import('@azure/functions').Context} context
 * @param {import('@azure/functions').HttpRequest} req
 */
async function azureFunction(octotask, context, req) {
  // this will be simpler once we  ship `verifyAndParse()`
  // see https://github.com/octokit/webhooks.js/issues/379
  await octotask.webhooks.verifyAndReceive({
    id: req.headers["X-GitHub-Delivery"] || req.headers["x-github-delivery"],
    name: req.headers["X-GitHub-Event"] || req.headers["x-github-event"],
    signature:
      req.headers["X-Hub-Signature-256"] ||
      req.headers["x-hub-signature-256"] ||
      req.headers["X-Hub-Signature"] ||
      req.headers["x-hub-signature"],
    payload: req.rawBody,
  });

  context.res = {
    status: "200",
    body: "ok",
  };
}

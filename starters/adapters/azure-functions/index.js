const OctotaskExports = require("octotask");
const azureFunction = require("./azure-function");
const azureFunctionV4 = require("./azure-function-v4");

module.exports = {
  ...OctotaskExports,
  createAzureFunction,
  createAzureFunctionV4,
};

/**
 *
 * @param {import('octotask').ApplicationFunction} app
 * @param { { octotask: import('octotask').Octotask } } options
 */
function createAzureFunction(app, { octotask }) {
  // load app once outside of the function to prevent double
  // event handlers in case of container reuse
  octotask.load(app);

  return azureFunction.bind(null, octotask);
}

/**
 * @param {import('octotask').ApplicationFunction} app
 * @param { { octotask: import('octotask').Octotask } } options
 */
function createAzureFunctionV4(app, { octotask }) {
  // load app once outside of the function to prevent double
  // event handlers in case of container reuse
  octotask.load(app);
  return azureFunctionV4.bind(null, octotask);
}

declare module "@octotask/adapter-azure-functions" {
    import OctotaskExports = require("octotask");

    /**
     * @param {import('octotask').ApplicationFunction} app
     * @param { { octotask: import('octotask').Octotask } } options
     */
    function createAzureFunction(app: OctotaskExports.ApplicationFunction, { octotask }: {
        octotask: OctotaskExports.Octotask;
    }): any;

    /**
     * @param {import('octotask').ApplicationFunction} app
     * @param { { octotask: import('octotask').Octotask } } options
     */
    function createAzureFunctionV4(app: OctotaskExports.ApplicationFunction, { octotask }: {
        octotask: OctotaskExports.Octotask;
    }): any;

    const _exports: {
        createAzureFunction: typeof createAzureFunction;
        createAzureFunctionV4: typeof createAzureFunctionV4;
        Context: typeof OctotaskExports.Context;
        OctotaskOctokit: typeof import("@octokit/core").Octokit & import("@octokit/core/dist-types/types").Constructor<{
            retry: {
                retryRequest: (error: import("@octokit/request-error").RequestError, retries: number, retryAfter: number) => import("@octokit/request-error").RequestError;
            };
        } & {
            paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
        } & import("@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types").RestEndpointMethods & import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api & import("@octotask/octokit-plugin-config/dist-types/types").API>;
        run: typeof OctotaskExports.run;
        Octotask: typeof OctotaskExports.Octotask;
        Server: typeof OctotaskExports.Server;
        createNodeMiddleware: typeof OctotaskExports.createNodeMiddleware;
        createOctotask: typeof OctotaskExports.createOctotask;
    };

    export = _exports;
}
//# sourceMappingURL=index.d.ts.map

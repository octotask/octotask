import { cloudflareDevProxyVitePlugin as remixCloudflareDevProxy, vitePlugin as remixVitePlugin } from '@remix-run/dev';
import UnoCSS from 'unocss/vite';
import { defineConfig, type UserConfig, type ViteDevServer } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import tsconfigPaths from 'vite-tsconfig-paths';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

const getGitInfo = () => {
  if (process.env.GIT_COMMIT_HASH) {
    return {
      commitHash: process.env.GIT_COMMIT_HASH,
      branch: process.env.GIT_BRANCH,
      commitTime: process.env.GIT_COMMIT_TIME,
      author: process.env.GIT_AUTHOR,
      email: process.env.GIT_EMAIL,
      remoteUrl: process.env.GIT_REMOTE_URL,
      repoName: process.env.GIT_REPO_NAME,
    };
  }
  try {
    return {
      commitHash: execSync('git rev-parse --short HEAD').toString().trim(),
      branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      commitTime: execSync('git log -1 --format=%cd').toString().trim(),
      author: execSync('git log -1 --format=%an').toString().trim(),
      email: execSync('git log -1 --format=%ae').toString().trim(),
      remoteUrl: execSync('git config --get remote.origin.url').toString().trim(),
      repoName: execSync('git config --get remote.origin.url')
        .toString()
        .trim()
        .replace(/^.*github.com[:/]/, '')
        .replace(/\.git$/, ''),
    };
  } catch {
    return {
      commitHash: 'no-git-info',
      branch: 'unknown',
      commitTime: 'unknown',
      author: 'unknown',
      email: 'unknown',
      remoteUrl: 'unknown',
      repoName: 'unknown',
    };
  }
};

const getPackageJson = () => {
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return {
      name: pkg.name,
      description: pkg.description,
      license: pkg.license,
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      peerDependencies: pkg.peerDependencies || {},
      optionalDependencies: pkg.optionalDependencies || {},
    };
  } catch {
    return {
      name: 'octotask',
      description: 'A DIY LLM interface',
      license: 'MIT',
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      optionalDependencies: {},
    };
  }
};

const pkg = getPackageJson();
const gitInfo = getGitInfo();

export default defineConfig((config): UserConfig => ({
  define: {
    __COMMIT_HASH: JSON.stringify(gitInfo.commitHash),
    __GIT_BRANCH: JSON.stringify(gitInfo.branch),
    __GIT_COMMIT_TIME: JSON.stringify(gitInfo.commitTime),
    __GIT_AUTHOR: JSON.stringify(gitInfo.author),
    __GIT_EMAIL: JSON.stringify(gitInfo.email),
    __GIT_REMOTE_URL: JSON.stringify(gitInfo.remoteUrl),
    __GIT_REPO_NAME: JSON.stringify(gitInfo.repoName),
    __APP_VERSION: JSON.stringify(process.env.npm_package_version),
    __PKG_NAME: JSON.stringify(pkg.name),
    __PKG_DESCRIPTION: JSON.stringify(pkg.description),
    __PKG_LICENSE: JSON.stringify(pkg.license),
    __PKG_DEPENDENCIES: JSON.stringify(pkg.dependencies),
    __PKG_DEV_DEPENDENCIES: JSON.stringify(pkg.devDependencies),
    __PKG_PEER_DEPENDENCIES: JSON.stringify(pkg.peerDependencies),
    __PKG_OPTIONAL_DEPENDENCIES: JSON.stringify(pkg.optionalDependencies),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },

  resolve: {
    alias: {
      path: 'path-browserify',
      fs: 'false', // ✅ must be a string
      os: 'os-browserify/browser',
      util: 'util',
      buffer: 'buffer',
      stream: 'stream-browserify',
      process: 'process/browser',
    },
  },

  optimizeDeps: {
    include: ['path-browserify', 'buffer', 'process', 'stream-browserify', 'util'],
  },

  ssr: {
    external: ['virtual:uno.css'], // ✅ for UnoCSS in Remix SSR build
  },

  build: {
    target: 'esnext',
    sourcemap: false,
  },

  plugins: [
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream'],
      globals: {
        Buffer: true,
        process: true,
        global: true,
      },
      protocolImports: true,
      exclude: ['child_process', 'fs', 'path'],
    }),

    {
      name: 'buffer-polyfill',
      transform(code, id) {
        if (id.includes('env.mjs')) {
          return {
            code: `import { Buffer } from 'buffer';\n${code}`,
            map: null,
          };
        }
        return null;
      },
    },

    config.mode !== 'test' ? remixCloudflareDevProxy() : null,

    remixVitePlugin({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: true,
      },
    }),

    UnoCSS(),

    tsconfigPaths(),

    chrome129IssuePlugin(),

    config.mode === 'production' ? optimizeCssModules({ apply: 'build' }) : null,
  ].filter(Boolean), // ✅ clean up undefined/null plugins

  envPrefix: [
    'VITE_',
    'OPENAI_LIKE_API_BASE_URL',
    'OLLAMA_API_BASE_URL',
    'LMSTUDIO_API_BASE_URL',
    'TOGETHER_API_BASE_URL',
  ],

  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
}));

function chrome129IssuePlugin() {
  return {
    name: 'chrome129IssuePlugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const raw = req.headers['user-agent']?.match(/Chrom(e|ium)\/([0-9]+)\./);
        if (raw && parseInt(raw[2], 10) === 129) {
          res.setHeader('content-type', 'text/html');
          res.end(
            '<body><h1>Please use Chrome Canary for testing.</h1><p>Chrome 129 has a known issue with JS modules and Vite dev servers. <a href="https://github.com/octotask/octotask.vercel.app/issues/86#issuecomment-2395519258">Learn more</a>.</p></body>',
          );
          return;
        }
        next();
      });
    },
  };
}

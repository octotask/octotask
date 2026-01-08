const { execSync } = require('child_process');

// Get git hash with fallback
const getGitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'no-git-info';
  }
};

let commitJson = {
  hash: getGitHash(),
  version: process.env.npm_package_version,
};

// ANSI color codes for polished terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  purple: '\x1b[38;5;141m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

console.log(`
${colors.purple}${colors.bright}╔═══════════════════════════════════════════════╗${colors.reset}
${colors.purple}${colors.bright}║                                               ║${colors.reset}
${colors.purple}${colors.bright}║${colors.reset}          ${colors.cyan}${colors.bright}🐙  O C T O T A S K  🐙${colors.reset}          ${colors.purple}${colors.bright}║${colors.reset}
${colors.purple}${colors.bright}║${colors.reset}        ${colors.magenta}⚡️  Flow-Aware SWE Agent  ⚡️${colors.reset}        ${colors.purple}${colors.bright}║${colors.reset}
${colors.purple}${colors.bright}║                                               ║${colors.reset}
${colors.purple}${colors.bright}╚═══════════════════════════════════════════════╝${colors.reset}
`);

console.log(`  ${colors.blue}📦 Version:${colors.reset}     ${colors.bright}v${commitJson.version}${colors.reset}`);
console.log(`  ${colors.green}🔖 Commit:${colors.reset}      ${colors.bright}${commitJson.hash}${colors.reset}`);
console.log(`  ${colors.yellow}⏳ Status:${colors.reset}      ${colors.dim}Starting development server...${colors.reset}`);

console.log(`\n${colors.purple}${colors.bright}───────────────────────────────────────────────${colors.reset}\n`);

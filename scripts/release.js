#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
  } catch (error) {
    log(`Error executing command: ${command}`, 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function updateVersion(newVersion) {
  const packageJsonPath = 'package.json';
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

function validateWorkingDirectory() {
  // Check if we're in a git repository
  try {
    exec('git rev-parse --git-dir', { stdio: 'pipe' });
  } catch {
    log('Error: Not in a git repository', 'red');
    process.exit(1);
  }

  // Check if there are uncommitted changes
  try {
    const status = exec('git status --porcelain', { stdio: 'pipe' });
    if (status.trim()) {
      log('Error: Working directory has uncommitted changes', 'red');
      log('Please commit or stash your changes before releasing', 'red');
      process.exit(1);
    }
  } catch {
    // git status might fail in some environments, continue
  }
}

function runTests() {
  log('Running tests...', 'blue');
  exec('yarn test:run');
  log('Tests passed!', 'green');
}

function buildPackage() {
  log('Building package...', 'blue');
  exec('yarn build');
  log('Build completed!', 'green');
}

function commitChanges(version) {
  log('Committing changes...', 'blue');
  exec(`git add package.json`);
  exec(`git commit -m "chore: release v${version}"`);
  log('Changes committed!', 'green');
}

function createTag(version) {
  log('Creating git tag...', 'blue');
  exec(`git tag -a v${version} -m "Release v${version}"`);
  log('Tag created!', 'green');
}

function pushChanges() {
  log('Pushing changes to remote...', 'blue');
  exec('git push origin main');
  exec('git push --tags');
  log('Changes pushed!', 'green');
}

function publishToNpm() {
  log('Publishing to npm...', 'blue');
  exec('npm publish');
  log('Package published to npm!', 'green');
}

function main() {
  const args = process.argv.slice(2);
  const releaseType = args[0] || 'patch'; // patch, minor, major
  
  if (!['patch', 'minor', 'major'].includes(releaseType)) {
    log('Error: Release type must be one of: patch, minor, major', 'red');
    log('Usage: node scripts/release.js [patch|minor|major]', 'red');
    process.exit(1);
  }

  log(`${colors.bold}🚀 Starting release process...${colors.reset}`, 'cyan');
  log(`Release type: ${releaseType}`, 'yellow');

  // Validate environment
  validateWorkingDirectory();

  // Get current version
  const currentVersion = getCurrentVersion();
  log(`Current version: ${currentVersion}`, 'blue');

  // Calculate new version
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  let newVersion;
  
  switch (releaseType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  log(`New version: ${newVersion}`, 'green');

  // Confirm release
  if (process.env.CI !== 'true') {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`Do you want to proceed with releasing v${newVersion}? (y/N): `, (answer) => {
      rl.close();
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        log('Release cancelled', 'yellow');
        process.exit(0);
      }
      performRelease(newVersion, releaseType);
    });
  } else {
    performRelease(newVersion, releaseType);
  }
}

function performRelease(newVersion, releaseType) {
  try {
    // Run tests
    runTests();

    // Update version in package.json
    log('Updating version...', 'blue');
    updateVersion(newVersion);

    // Skip changelog update - handled manually
    log('Skipping changelog update (handled manually)...', 'yellow');

    // Build package
    buildPackage();

    // Commit changes
    commitChanges(newVersion);

    // Create git tag
    createTag(newVersion);

    // Push changes
    pushChanges();

    // Publish to npm
    publishToNpm();

    log(`${colors.bold}🎉 Release v${newVersion} completed successfully!${colors.reset}`, 'green');
    log(`Package is now available on npm: https://www.npmjs.com/package/dom-element-to-component-source`, 'cyan');

  } catch (error) {
    log(`Release failed: ${error.message}`, 'red');
    log('You may need to manually clean up any partial changes', 'yellow');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

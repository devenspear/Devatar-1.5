#!/usr/bin/env node
/**
 * Deployment Script with Version Tracking
 *
 * This script ensures version numbers flow through the entire deployment pipeline:
 * package.json version → Git commit → GitHub → Vercel build → UI footer
 *
 * Usage:
 *   node scripts/deploy.js [patch|minor|major]
 *
 * Default: patch (0.0.X)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BUMP_TYPE = process.argv[2] || 'patch';
const VALID_BUMP_TYPES = ['patch', 'minor', 'major'];

if (!VALID_BUMP_TYPES.includes(BUMP_TYPE)) {
  console.error(`Invalid bump type: ${BUMP_TYPE}`);
  console.error(`Valid options: ${VALID_BUMP_TYPES.join(', ')}`);
  process.exit(1);
}

function run(cmd, options = {}) {
  console.log(`\n> ${cmd}`);
  try {
    return execSync(cmd, { stdio: 'inherit', ...options });
  } catch (error) {
    if (!options.ignoreError) {
      console.error(`Command failed: ${cmd}`);
      process.exit(1);
    }
  }
}

function getVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return pkg.version;
}

function bumpVersion(type) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const [major, minor, patch] = pkg.version.split('.').map(Number);

  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
  }

  pkg.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

  return { oldVersion: `${major}.${minor}.${patch}`, newVersion };
}

// Main deployment flow
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           DEPLOYMENT WITH VERSION TRACKING                ║');
console.log('╚═══════════════════════════════════════════════════════════╝');

// Step 1: Ensure working directory is clean (except package.json which we'll modify)
console.log('\n📋 Step 1: Checking git status...');
const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
const uncommittedChanges = gitStatus.split('\n').filter(line =>
  line.trim() && !line.includes('package.json')
);
if (uncommittedChanges.length > 0) {
  console.log('⚠️  Warning: You have uncommitted changes:');
  uncommittedChanges.forEach(line => console.log(`   ${line}`));
  console.log('\nProceeding anyway - these changes will NOT be included in this deploy.');
}

// Step 2: Run build to ensure everything compiles
console.log('\n🔨 Step 2: Running build verification...');
run('pnpm run build');

// Step 3: Bump version
console.log(`\n📦 Step 3: Bumping version (${BUMP_TYPE})...`);
const { oldVersion, newVersion } = bumpVersion(BUMP_TYPE);
console.log(`   Version: ${oldVersion} → ${newVersion}`);

// Step 4: Commit version bump
console.log('\n📝 Step 4: Committing version bump...');
run('git add package.json');
run(`git commit -m "chore: bump version to v${newVersion}"`);

// Step 5: Push to GitHub
console.log('\n🚀 Step 5: Pushing to GitHub...');
run('git push');

// Step 6: Deploy to Vercel (GitHub integration will also deploy, but this ensures immediate deploy)
console.log('\n☁️  Step 6: Deploying to Vercel...');
run('vercel --prod --yes');

// Summary
console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                    DEPLOYMENT COMPLETE                     ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log(`\n✅ Version ${newVersion} deployed successfully!`);
console.log('\n📍 Version should now appear in:');
console.log('   • package.json (local)');
console.log('   • GitHub repository');
console.log('   • Vercel deployment');
console.log('   • UI footer');

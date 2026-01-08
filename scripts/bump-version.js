/**
 * Simple Version Bump Script
 *
 * Usage: node scripts/bump-version.js [patch|minor|major]
 *
 * This is a standalone version bumper. For full deployment with
 * git commit + push + vercel deploy, use deploy.js instead.
 */

const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
const bumpType = process.argv[2] || 'patch';

let newVersion;
switch (bumpType) {
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
console.log(`Version bumped: ${major}.${minor}.${patch} → ${newVersion}`);

#!/usr/bin/env node
// Generates JWT_SECRET and JWT_REFRESH_SECRET and appends them to the project's .env if they don't exist.
// Usage: node scripts/generate-secrets.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

function generateHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

function fileReadSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (err) {
    return '';
  }
}

function fileWriteSafe(p, content) {
  fs.writeFileSync(p, content, { encoding: 'utf8', mode: 0o600 });
}

(function main() {
  console.log('Generating JWT secrets (if missing) in .env...');

  let env = fileReadSafe(envPath);
  const hasAccess = /(^|\n)\s*JWT_SECRET\s*=/.test(env);
  const hasRefresh = /(^|\n)\s*JWT_REFRESH_SECRET\s*=/.test(env);

  const toAppend = [];

  if (!hasAccess) {
    const access = generateHex(32); // 32 bytes -> 64 hex chars (256 bits)
    toAppend.push(`JWT_SECRET=${access}`);
  }

  if (!hasRefresh) {
    const refresh = generateHex(64); // 64 bytes -> 128 hex chars (512 bits)
    toAppend.push(`JWT_REFRESH_SECRET=${refresh}`);
  }

  if (toAppend.length === 0) {
    console.log('Both JWT_SECRET and JWT_REFRESH_SECRET already exist in .env — nothing to do.');
    process.exit(0);
  }

  // Ensure env ends with a single newline
  if (env.length > 0 && !env.endsWith('\n')) env += '\n';
  env += toAppend.join('\n') + '\n';

  fileWriteSafe(envPath, env);

  console.log('Appended the following to .env (do NOT commit this file):');
  toAppend.forEach(line => console.log(line));
  console.log('\nDone.');
})();


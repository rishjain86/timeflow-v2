#!/usr/bin/env node
// One-time local setup: creates .env files with fresh random secrets.
// Usage: node scripts/setup.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const secret = () => crypto.randomBytes(48).toString('base64');

function make(example, target, replacements) {
  const t = path.join(root, target);
  if (fs.existsSync(t)) {
    console.log(`skip   ${target} (already exists)`);
    return;
  }
  let body = fs.readFileSync(path.join(root, example), 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    body = body.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}="${value}"`);
  }
  fs.writeFileSync(t, body);
  console.log(`create ${target}`);
}

make('apps/api/.env.example', 'apps/api/.env', { JWT_SECRET: secret() });
make('apps/web/.env.example', 'apps/web/.env.local', { NEXTAUTH_SECRET: secret() });

console.log('\nNext: open apps/api/.env and paste your NEW database URL into DATABASE_URL.');

const fs = require('fs');
const path = require('path');

const entryPath = path.resolve(__dirname, '..', '.smithery', 'index.cjs');

if (!fs.existsSync(entryPath)) {
  throw new Error(`Expected build output at ${entryPath}`);
}

const original = fs.readFileSync(entryPath, 'utf8');
const cleaned = original
  .split('\n')
  .filter((line, index) => {
    if (index === 0 && line.startsWith('#!')) {
      return false;
    }
    return !/^#!\s*/.test(line);
  })
  .join('\n')
  .replace(/^\n+/, '');

const fixed = `#!/usr/bin/env node\n${cleaned}`;
fs.writeFileSync(entryPath, fixed, 'utf8');
fs.chmodSync(entryPath, 0o755);

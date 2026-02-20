# Fix for Issue #107: npx fails to resolve executable

## Problem
The `package.json` defined the binary path using a hidden directory:
```json
"bin": {
  "exa-mcp-server": ".smithery/stdio/index.cjs"
}
```

This caused npm to fail when creating symlinks in `node_modules/.bin/` because:
1. Hidden directories (starting with `.`) are often excluded from npm packages
2. npm cannot properly link executables from hidden paths
3. Users got error: `npm error could not determine executable to run`

## Solution
1. Created a standard `bin/` directory (non-hidden)
2. Updated `package.json` to point to `./bin/index.cjs`
3. Modified build script to copy the built file to `bin/index.cjs`
4. Updated `smithery.yaml` with proper start command
5. Updated `files` array to include both `bin` and `.smithery`

## Changes Made

### package.json
- Changed `"bin"` from `.smithery/stdio/index.cjs` to `./bin/index.cjs`
- Updated `"files"` to include `"bin"` directory
- Modified `build:stdio` script to copy built file to `bin/`

### smithery.yaml
- Added `startCommand` configuration for stdio transport

### bin/ directory
- Created `bin/` directory with `.gitkeep` placeholder
- Build process will generate `bin/index.cjs`

## Testing
After building, users can now run:
```bash
npx exa-mcp-server
```

Or install globally:
```bash
npm install -g exa-mcp-server
exa-mcp-server
```

## Impact
- ✅ Fixes npx installation for ALL users
- ✅ Makes the package follow npm best practices
- ✅ Resolves Linux compatibility issues related to hidden directories
- ✅ Maintains backward compatibility with Smithery

---
**Fixes**: #107
**Date**: February 18, 2026

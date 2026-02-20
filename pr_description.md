## Summary
Fixes issue #107 where npx fails to resolve the executable because the bin field points to a hidden directory (`.smithery/stdio/index.cjs`).

## Problem
When users tried to run `npx exa-mcp-server`, they got:
```
npm error could not determine executable to run
```

This happened because npm cannot create symlinks from hidden directories (starting with `.`) to `node_modules/.bin/`.

## Changes
- **package.json**: Changed bin field from `.smithery/stdio/index.cjs` to `./bin/index.cjs`
- **package.json**: Updated build script to copy built file to standard `bin/` directory
- **package.json**: Updated files array to include both `bin` and `.smithery`
- **smithery.yaml**: Added startCommand configuration for proper stdio transport
- **bin/**: Created standard bin directory with placeholder

## Impact
- ✅ **Fixes npx installation for all users** - Critical bug affecting everyone
- ✅ **Follows npm best practices** - No hidden directories in bin field
- ✅ **Resolves Linux compatibility issues** - Hidden dirs cause problems on Linux
- ✅ **Maintains backward compatibility** - Still includes .smithery for Smithery platform
- ✅ **Zero breaking changes** - Users can still use the same commands

## Testing
After this fix, users can successfully run:
```bash
npx exa-mcp-server
```

Or install globally:
```bash
npm install -g exa-mcp-server
exa-mcp-server
```

## Files Modified
1. `package.json` - bin field, files array, build:stdio script
2. `smithery.yaml` - Added startCommand configuration
3. `bin/.gitkeep` - New file to track bin directory
4. `FIX_ISSUE_107.md` - Documentation of the fix

Fixes #107

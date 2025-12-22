# Vercel Deployment Guide

Your Exa MCP Server is ready to deploy to Vercel with **100% compatibility** with the existing Smithery deployment.

## ✅ Quick Start Checklist

### Step 1: Install Dependencies (5 min)
```bash
cd /Users/ishangoswami/Desktop/exa/exa-mcp-server/exa-mcp-server
npm install
```

### Step 2: Configure Environment (2 min)
```bash
cp env.example .env.local
# Edit .env.local and add your EXA_API_KEY
```

### Step 3: Test Locally (5 min)
```bash
npm run dev:vercel
# Server will run at http://localhost:3000/api/mcp
```

### Step 4: Test with MCP Inspector (5 min)
```bash
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:3000/api/mcp
# Test the tools work
```

### Step 5: Deploy to Vercel (10 min)
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel

# Add environment variable
vercel env add EXA_API_KEY
# Paste your key, select all environments

# Deploy production
vercel --prod
```

### Step 6: Update Client Configurations (5 min)

**Cursor (.cursor/mcp.json):**
```json
{
  "mcpServers": {
    "exa": {
      "url": "https://exa-mcp-server-nine.vercel.app/api/mcp"
    }
  }
}
```

**Claude Desktop:**
```json
{
  "mcpServers": {
    "exa": {
      "url": "https://your-project.vercel.app/api/mcp",
      "transport": "streamable-http"
    }
  }
}
```

---

## 🎯 What Changed & Compatibility

### ✅ 100% Compatible Features

Your Vercel deployment maintains **complete compatibility** with `https://mcp.exa.ai/mcp`:

| Feature | Status |
|---------|--------|
| **URL Parameters** | |
| `?tools=web_search_exa,get_code_context_exa` | ✅ Works identically |
| `?exaApiKey=YOUR_KEY` | ✅ Works identically |
| `?debug=true` | ✅ Works identically |
| **Default Tools** | |
| `web_search_exa` + `get_code_context_exa` enabled by default | ✅ Preserved |
| All 8 tools available | ✅ Unchanged |
| **Tool Behavior** | |
| All tool implementations | ✅ Zero changes |
| Tool names and parameters | ✅ Identical |
| **MCP Protocol** | |
| Streamable HTTP transport | ✅ Same |
| All MCP clients supported | ✅ Same |

### 📦 What Was Added (Non-Breaking)

**New Files:**
- `api/mcp.ts` - Vercel Function entry point (supports URL parameters)
- `src/mcp-handler.ts` - Shared logic used by both Smithery and Vercel
- `vercel.json` - Vercel configuration
- `.vercelignore` - Deployment exclusions
- `env.example` - Environment template

**New Dependencies:**
- `mcp-handler` - Vercel's MCP wrapper
- `vercel` - Vercel CLI (dev dependency)

**Modified Files:**
- `package.json` - Added new dependencies and scripts
- `src/index.ts` - Refactored to use shared logic (Smithery still works!)
- `tsconfig.json` - Updated for Vercel compatibility

**Zero tool changes** - All files in `src/tools/` are unchanged!

---

## 🔧 URL Parameters Support

Your deployment supports the same URL parameters as the hosted version:

### Examples:
```bash
# Enable specific tools
https://your-project.vercel.app/api/mcp?tools=web_search_exa,get_code_context_exa

# Pass API key in URL
https://your-project.vercel.app/api/mcp?exaApiKey=YOUR_KEY

# Enable debug mode
https://your-project.vercel.app/api/mcp?debug=true

# Combine parameters
https://your-project.vercel.app/api/mcp?tools=web_search_exa&exaApiKey=KEY&debug=true
```

### Available Tools:
- `web_search_exa` (default: ON)
- `get_code_context_exa` (default: ON)
- `deep_search_exa` (default: OFF)
- `crawling_exa` (default: OFF)
- `company_research_exa` (default: OFF)
- `linkedin_search_exa` (default: OFF)
- `deep_researcher_start` (default: OFF)
- `deep_researcher_check` (default: OFF)

### Configuration Priority:
```
URL Parameter > Environment Variable > Default Value
```

---

## 🧪 Testing Your Deployment

### Local Testing
```bash
# Test default (should enable web_search_exa + get_code_context_exa)
curl http://localhost:3000/api/mcp

# Test specific tool
curl "http://localhost:3000/api/mcp?tools=web_search_exa"

# Test with API key
curl "http://localhost:3000/api/mcp?exaApiKey=YOUR_KEY"
```

### Production Testing
```bash
# Test default configuration
curl https://your-project.vercel.app/api/mcp

# Test with MCP Inspector
npx @modelcontextprotocol/inspector
# URL: https://your-project.vercel.app/api/mcp

# Test with your MCP client (Cursor, Claude Desktop, etc.)
```

---

## 🚀 Deployment Commands Reference

```bash
# Development
npm run dev:vercel              # Start local Vercel dev server

# Deployment
vercel                          # Deploy to preview
vercel --prod                   # Deploy to production

# Environment Variables
vercel env add VAR_NAME         # Add environment variable
vercel env rm VAR_NAME          # Remove environment variable
vercel env ls                   # List all variables

# Monitoring
vercel logs                     # View function logs
vercel logs --prod              # View production logs
vercel ls                       # List deployments

# Rollback
vercel promote <deployment-url> # Promote a previous deployment
```

---

## 📊 Environment Variables

Set these in Vercel dashboard or via CLI:

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `EXA_API_KEY` | Yes | Your Exa AI API key | - |
| `DEBUG` | No | Enable debug logging | `false` |
| `ENABLED_TOOLS` | No | Comma-separated tool list | `web_search_exa,get_code_context_exa` |

**Add via CLI:**
```bash
vercel env add EXA_API_KEY
# Paste your key when prompted
# Select all environments (Production, Preview, Development)
```

---

## 🔍 Troubleshooting

### Issue: "Module not found: mcp-handler"
**Solution:** Run `npm install`

### Issue: "EXA_API_KEY not found"
**Solution:**
1. Check Vercel dashboard → Settings → Environment Variables
2. Add `EXA_API_KEY` if missing
3. Redeploy: `vercel --prod`

### Issue: Function timeout
**Problem:** Free tier has 10s timeout
**Solution:**
- Upgrade to Vercel Pro for 60s timeout
- Or use only faster tools (avoid `deep_researcher_*`)

### Issue: Tools not working
**Debug steps:**
1. Enable debug: `vercel env add DEBUG` (value: `true`)
2. Redeploy: `vercel --prod`
3. Check logs: `vercel logs --prod`
4. Test with `?debug=true` in URL

### Issue: Cold starts are slow
**This is normal!** First request after idle takes 1-2s. Subsequent requests are fast.

---

## 📋 Customer Migration Guide

### For Existing Customers

**Only ONE change needed:**

**Before:**
```
https://mcp.exa.ai/mcp?tools=web_search_exa,get_code_context_exa
```

**After:**
```
https://your-project.vercel.app/api/mcp?tools=web_search_exa,get_code_context_exa
```

Everything else works identically!

### Migration Options

**Option 1: Zero Downtime (Recommended)**
1. Deploy to Vercel (new URL)
2. Keep Smithery running (old URL)
3. Gradually update customer configurations
4. Deprecate Smithery when ready

**Option 2: Direct Cutover**
1. Deploy to Vercel
2. Announce URL change
3. Customers update config (single line)
4. Immediate switch

---

## 🎯 Success Criteria

You'll know it works when:

- [x] `npm install` completes without errors
- [x] Local server runs at `http://localhost:3000`
- [x] MCP Inspector connects successfully
- [x] Default tools are `web_search_exa` + `get_code_context_exa`
- [x] URL parameter `?tools=web_search_exa` works
- [x] Production deployment succeeds
- [x] Vercel logs show no errors
- [x] MCP clients can connect and use tools

---

## 📞 Support & Resources

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Docs:** https://vercel.com/docs
- **MCP Specification:** https://modelcontextprotocol.io
- **Exa API:** https://docs.exa.ai

---

## ⚡ Quick Commands Summary

```bash
# Setup
npm install
cp env.example .env.local
# Edit .env.local with your EXA_API_KEY

# Local Development
npm run dev:vercel

# Deploy
vercel login
vercel                    # Preview
vercel env add EXA_API_KEY
vercel --prod             # Production

# Test
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:3000/api/mcp

# Monitor
vercel logs --prod
```

---

**Ready to deploy!** 🚀

The Vercel deployment is a drop-in replacement for your Smithery deployment with zero breaking changes. Only the URL domain needs to change.


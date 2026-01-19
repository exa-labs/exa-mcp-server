# NTSL Assistant - Trading Bot Automation for Profitchart

## Overview

This PR adds comprehensive NTSL (Nelogica Trading System Language) support to exa-mcp-server, enabling AI agents like **Manus AI** to generate, validate, and execute trading strategies for the Profitchart platform.

## What's New

### 🤖 NTSL Assistant Tool Suite (4 MCP Tools)

1. **`ntsl_generate_code`** - Generate complete NTSL trading bot code
   - 7 pre-built strategy templates (RSI, Bollinger Bands, Moving Averages, etc.)
   - Customizable parameters (stop loss, take profit, trading hours)
   - Support for custom strategy descriptions

2. **`ntsl_validate`** - Validate NTSL syntax and best practices
   - Detects critical syntax errors
   - Identifies missing risk management
   - Suggests improvements for robustness

3. **`ntsl_explain`** - Explain NTSL code in plain language
   - Analyzes strategy logic
   - Identifies technical indicators used
   - Explains entry/exit conditions
   - Evaluates risk management

4. **`ntsl_documentation`** - Complete NTSL language reference
   - Full syntax documentation
   - All order functions (buy/sell)
   - Technical indicators available
   - Best practices

### 📋 7 Pre-Built Strategy Templates

- Simple Moving Average Crossover
- RSI (Relative Strength Index)
- Bollinger Bands
- Breakout/Channel Trading
- Trailing Stop System
- Time-based Exits
- Daily Trading Limits

### 📚 Documentation

- **NTSL_ASSISTANT_README.md**: Complete documentation with examples
- **examples/manus-ai-ntsl-integration.md**: 8 detailed integration scenarios
- **examples/ntsl-demo.js**: Working demonstration script

### 🔧 Changes

**New Files:**
- `src/tools/ntslAssistant.ts` - Main implementation (1000+ lines)
- `NTSL_ASSISTANT_README.md` - Full documentation
- `examples/manus-ai-ntsl-integration.md` - Integration guide
- `examples/ntsl-demo.js` - Demo script

**Modified Files:**
- `src/index.ts` - Register NTSL Assistant tools
- `README.md` - Add NTSL Assistant section
- `package.json` - Version bump to 3.1.0

## Integration Example

```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp?tools=ntsl_assistant"
    }
  }
}
```

## Use Cases

### For Manus AI:
1. **Generate trading strategies** from natural language descriptions
2. **Validate existing code** for errors and best practices
3. **Explain complex strategies** in simple Portuguese
4. **Learn NTSL** through comprehensive documentation

### Example Workflow:

User: "Create an RSI trading bot with stop loss of 50 ticks"

Manus AI:
1. Calls `ntsl_generate_code({ strategyType: "rsiStrategy", parameters: { stopLoss: 50 }})`
2. Validates generated code with `ntsl_validate()`
3. Explains strategy with `ntsl_explain()`
4. Returns complete, tested code ready for Profitchart

## Testing

✅ Build successful: `npm run build`
✅ Demo script runs: `node examples/ntsl-demo.js`
✅ All tools properly registered in MCP server
✅ Code generation templates validated

## Breaking Changes

None - This is a new feature addition that doesn't affect existing tools.

## Documentation

- All new tools documented in NTSL_ASSISTANT_README.md
- Integration examples in examples/manus-ai-ntsl-integration.md
- Updated main README.md with quick start guide
- Inline code documentation throughout

## Research Sources

- [NTSL Official Documentation - Nelogica](https://ajuda.nelogica.com.br/hc/pt-br/articles/360046443212)
- [NTSL Manual PDF](https://downloadserver-cdn.nelogica.com.br/content/profit/manual_ntsl/ManualNTSL.pdf)
- [NeoTraderBot NTSL Guide](https://neotraderbot.com/docs/material-iniciantes/plataformas/documentacao-ntsl-nelogica/)
- [Profitchart Strategy Repository](https://github.com/b2tradingclub/profitchart-estrategias)

## Version

**3.0.9 → 3.1.0**

This represents a minor version bump with significant new functionality.

## Checklist

- [x] Code compiles and builds successfully
- [x] New tools registered in MCP server
- [x] Documentation complete and comprehensive
- [x] Examples provided and tested
- [x] README updated
- [x] Version bumped appropriately
- [x] No breaking changes to existing functionality

---

**This feature enables Manus AI to become a powerful assistant for creating automated trading strategies in Profitchart using NTSL! 🤖📈**

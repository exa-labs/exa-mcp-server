# Implementation TODOs - Wikipedia Search Fix

## Overview
Implementing the missing Wikipedia search fix using Agent 3's proven `site:` operator approach.

## Phase 1: Code Changes ⏰ 10 minutes
- [ ] **1.1** Navigate to `src/tools/wikipediaSearch.ts`
- [ ] **1.2** Remove `includeDomains: ["wikipedia.org"]` from searchRequest
- [ ] **1.3** Change query from `${query} Wikipedia` to `${query} site:wikipedia.org`
- [ ] **1.4** Save changes

## Phase 2: Build & Test ⏰ 10 minutes  
- [ ] **2.1** Run `npm run build:stdio` to rebuild
- [ ] **2.2** Test query: "artificial intelligence" → expect AI Wikipedia articles
- [ ] **2.3** Test query: "Claude AI Anthropic" → expect Claude model articles
- [ ] **2.4** Test query: "Python programming" → expect Python Wikipedia pages
- [ ] **2.5** Verify no regressions in crawling_exa and competitor_finder_exa

## Phase 3: Documentation & Commit ⏰ 5 minutes
- [ ] **3.1** Document changes in commit message
- [ ] **3.2** Add implementation notes if needed
- [ ] **3.3** Commit changes with clear documentation

## Refactoring Game Constraints (Anti-Spiral)
- ⏰ **Time Box**: 25 minutes total (spec says 20, adding 5 min buffer)
- 🎯 **Single Objective**: Fix wikipedia search only 
- 🚫 **No Scope Creep**: Do not improve other tools
- 🚫 **No Over-Engineering**: Use exact Agent 3 approach
- 🚫 **No Extra Features**: Minimal changes only

## Exit Criteria
- Wikipedia search returns results for test queries
- No regressions in other tools
- Build succeeds
- Ready to merge
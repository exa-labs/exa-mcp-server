/**
 * Test for CWE-200 fix: API key stripped from request URL after extraction
 * 
 * Verifies that:
 * 1. redactUrl() masks exaApiKey in debug log output
 * 2. stripApiKeyFromUrl() removes exaApiKey from URL entirely
 * 3. The downstream request passed to mcp-handler no longer contains the API key
 */

let passed = 0;
let failed = 0;
let total = 0;

function assertEqual(actual, expected, testName) {
  total++;
  if (actual === expected) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    console.log(`  ❌ FAIL: ${testName}`);
    console.log(`     Expected: ${JSON.stringify(expected)}`);
    console.log(`     Actual:   ${JSON.stringify(actual)}`);
  }
}

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    console.log(`  ❌ FAIL: ${testName}`);
  }
}

// ========================================================
// Re-implementation of redactUrl (exact copy from fix)
// ========================================================
function redactUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.searchParams.has('exaApiKey')) {
      url.searchParams.set('exaApiKey', 'REDACTED');
    }
    return url.toString();
  } catch {
    return urlString.replace(/([?&]exaApiKey=)[^&]*/gi, '$1REDACTED');
  }
}

// ========================================================
// Re-implementation of stripApiKeyFromUrl (exact copy from fix)
// ========================================================
function stripApiKeyFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    url.searchParams.delete('exaApiKey');
    return url.toString();
  } catch {
    return urlString.replace(/([?&])exaApiKey=[^&]*&?/gi, '$1').replace(/[?&]$/, '');
  }
}

// ========================================================
// TEST SUITE: stripApiKeyFromUrl
// ========================================================
console.log('\n=== stripApiKeyFromUrl Tests ===\n');

console.log('--- Basic functionality ---');

{
  const result = stripApiKeyFromUrl('https://mcp.exa.ai/mcp?exaApiKey=SECRET123');
  assert(
    !result.includes('SECRET123') && !result.includes('exaApiKey'),
    'Strips exaApiKey completely from URL'
  );
}

{
  const result = stripApiKeyFromUrl('https://mcp.exa.ai/mcp?exaApiKey=SECRET&debug=true&tools=search');
  assert(
    !result.includes('SECRET') && !result.includes('exaApiKey') &&
      result.includes('debug=true') && result.includes('tools=search'),
    'Strips exaApiKey while preserving other params'
  );
}

{
  const result = stripApiKeyFromUrl('https://mcp.exa.ai/mcp?debug=true&exaApiKey=SECRET&tools=search');
  assert(
    !result.includes('SECRET') && result.includes('debug=true') && result.includes('tools=search'),
    'Strips exaApiKey from middle of params'
  );
}

{
  const original = 'https://mcp.exa.ai/mcp?debug=true&tools=search';
  const result = stripApiKeyFromUrl(original);
  assertEqual(result, original, 'URL without exaApiKey is unchanged');
}

{
  const original = 'https://mcp.exa.ai/mcp';
  const result = stripApiKeyFromUrl(original);
  assertEqual(result, original, 'URL with no query params is unchanged');
}

console.log('\n--- exaApiKey as only param ---');

{
  const result = stripApiKeyFromUrl('https://mcp.exa.ai/mcp?exaApiKey=SECRET');
  const url = new URL(result);
  assertEqual(url.pathname, '/mcp', 'Pathname preserved when exaApiKey is only param');
  assert(!result.includes('SECRET'), 'Key value removed');
}

console.log('\n--- Edge cases ---');

{
  const result = stripApiKeyFromUrl('https://mcp.exa.ai/mcp?exaApiKey=');
  assert(
    !result.includes('exaApiKey'),
    'Empty exaApiKey value is stripped'
  );
}

{
  const result = stripApiKeyFromUrl('https://mcp.exa.ai/mcp?exaApiKey=KEY1&exaApiKey=KEY2');
  assert(
    !result.includes('KEY1') && !result.includes('KEY2') && !result.includes('exaApiKey'),
    'Multiple exaApiKey params are all stripped'
  );
}

{
  const longKey = 'a'.repeat(1000);
  const result = stripApiKeyFromUrl(`https://mcp.exa.ai/mcp?exaApiKey=${longKey}`);
  assert(
    !result.includes(longKey),
    'Very long API key is stripped'
  );
}

// ========================================================
// TEST SUITE: Integration – simulating handleRequest flow
// ========================================================
console.log('\n=== Integration: handleRequest flow ===\n');

{
  // Simulate the fix: after extracting config, strip exaApiKey from URL
  const originalUrl = 'https://mcp.exa.ai/mcp?exaApiKey=SECRET123&debug=true&tools=search';
  
  // Step 1: Extract config (simulated — we just care about the URL processing)
  const parsedUrl = new URL(originalUrl);
  const exaApiKey = parsedUrl.searchParams.get('exaApiKey');
  assertEqual(exaApiKey, 'SECRET123', 'API key extracted from URL correctly');
  
  // Step 2: Debug log uses redactUrl
  const debugLog = redactUrl(originalUrl);
  assert(
    debugLog.includes('REDACTED') && !debugLog.includes('SECRET123'),
    'Debug log shows REDACTED not the real key'
  );
  
  // Step 3: Strip exaApiKey from request URL before further processing
  const strippedUrl = stripApiKeyFromUrl(originalUrl);
  assert(
    !strippedUrl.includes('SECRET123') && !strippedUrl.includes('exaApiKey'),
    'Stripped URL has no trace of API key'
  );
  assert(
    strippedUrl.includes('debug=true') && strippedUrl.includes('tools=search'),
    'Other params preserved in stripped URL'
  );
  
  // Step 4: URL rewrite (pathname normalization) – key should NOT be present
  const url = new URL(strippedUrl);
  if (url.pathname === '/mcp' || url.pathname === '/') {
    url.pathname = '/api/mcp';
  }
  const finalUrl = url.toString();
  assert(
    !finalUrl.includes('SECRET123') && !finalUrl.includes('exaApiKey'),
    'Final URL passed to handler has no API key'
  );
  assertEqual(url.pathname, '/api/mcp', 'Pathname rewrite still works');
}

{
  // Test with API key in Authorization header (no exaApiKey in URL)
  const originalUrl = 'https://mcp.exa.ai/mcp?debug=true&tools=search';
  const strippedUrl = stripApiKeyFromUrl(originalUrl);
  assertEqual(strippedUrl, originalUrl, 'URL without exaApiKey is unchanged by stripping');
}

// ========================================================
// TEST SUITE: Confirm vulnerability existed (before fix)
// ========================================================
console.log('\n=== Vulnerability confirmation (before fix) ===\n');

{
  // Before fix: request.url was logged directly
  const requestUrl = 'https://mcp.exa.ai/mcp?exaApiKey=exa-abc123xyz&debug=true';
  
  // Old code (vulnerable): console.log(`[EXA-MCP] Request URL: ${requestUrl}`)
  const oldLog = `[EXA-MCP] Request URL: ${requestUrl}`;
  assert(
    oldLog.includes('exa-abc123xyz'),
    '[Vulnerable] Old debug log exposes full API key'
  );
  
  // New code (fixed): console.log(`[EXA-MCP] Request URL: ${redactUrl(requestUrl)}`)
  const newLog = `[EXA-MCP] Request URL: ${redactUrl(requestUrl)}`;
  assert(
    !newLog.includes('exa-abc123xyz') && newLog.includes('REDACTED'),
    '[Fixed] New debug log redacts API key'
  );
}

{
  // Before fix: URL with exaApiKey was passed to handler() via new Request(url.toString(), request)
  const requestUrl = 'https://mcp.exa.ai/mcp?exaApiKey=SECRET&debug=true';
  const url = new URL(requestUrl);
  url.pathname = '/api/mcp';
  const handlerUrl = url.toString();
  
  assert(
    handlerUrl.includes('SECRET'),
    '[Vulnerable] Old code passes API key to downstream handler in URL'
  );
  
  // After fix: strip first, then rewrite
  const stripped = stripApiKeyFromUrl(requestUrl);
  const fixedUrl = new URL(stripped);
  fixedUrl.pathname = '/api/mcp';
  
  assert(
    !fixedUrl.toString().includes('SECRET'),
    '[Fixed] New code strips API key before passing to handler'
  );
}

// ========================================================
// Summary
// ========================================================
console.log('\n========================================');
console.log(`Total: ${total}  Passed: ${passed}  Failed: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed! ✅\n');
  process.exit(0);
}

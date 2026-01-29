#!/usr/bin/env node
/**
 * Test script to run 10 tweet searches using the Exa API
 * with category: "tweet"
 */

const axios = require('axios');

const API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  SEARCH_ENDPOINT: '/search'
};

// Get API key from environment
const EXA_API_KEY = process.env.EXA_API_KEY;

if (!EXA_API_KEY) {
  console.error('Error: EXA_API_KEY environment variable is not set');
  process.exit(1);
}

// Define the 10 searches to run
const searches = [
  { query: 'AI agents', numResults: 5, type: 'auto' },
  { query: 'Claude AI', numResults: 10, type: 'auto' },
  { query: 'OpenAI GPT', numResults: 5, type: 'auto' },
  { query: 'machine learning', numResults: 10, type: 'auto' },
  { query: 'startup funding', numResults: 5, type: 'auto' },
  { query: 'developer tools', numResults: 10, type: 'auto' },
  { query: 'React framework', numResults: 5, type: 'auto' },
  { query: 'Python programming', numResults: 10, type: 'auto' },
  { query: 'cloud computing AWS', numResults: 5, type: 'auto' },
  { query: 'cryptocurrency bitcoin', numResults: 10, type: 'auto' }
];

async function runSearch(searchParams, index) {
  const { query, numResults, type } = searchParams;

  const requestBody = {
    query,
    type,
    numResults,
    category: 'tweet',
    contents: {
      text: true,
      context: { maxCharacters: 10000 },
      livecrawl: 'fallback'
    }
  };

  const result = {
    searchNumber: index + 1,
    query,
    parameters: { numResults, type, category: 'tweet' },
    success: false,
    error: null,
    resultsCount: 0
  };

  try {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}${API_CONFIG.SEARCH_ENDPOINT}`,
      requestBody,
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': EXA_API_KEY,
          'x-exa-integration': 'web-search-advanced-mcp-test'
        },
        timeout: 30000
      }
    );

    result.success = true;
    result.resultsCount = response.data?.results?.length || 0;
    console.log(`[${index + 1}/10] SUCCESS: "${query}" - ${result.resultsCount} results`);
  } catch (error) {
    result.success = false;
    if (axios.isAxiosError(error)) {
      result.error = error.response?.data?.message || error.response?.data?.error || error.message;
      result.statusCode = error.response?.status;
    } else {
      result.error = error.message || String(error);
    }
    console.log(`[${index + 1}/10] FAILED: "${query}" - ${result.error}`);
  }

  return result;
}

async function main() {
  console.log('Starting 10 tweet searches with web_search_advanced_exa (category: "tweet")');
  console.log('='.repeat(70));
  console.log();

  const results = [];
  const errors = [];

  for (let i = 0; i < searches.length; i++) {
    const result = await runSearch(searches[i], i);
    results.push(result);

    if (!result.success) {
      errors.push({
        query: result.query,
        error: result.error,
        statusCode: result.statusCode
      });
    }

    // Add a small delay between requests to avoid rate limiting
    if (i < searches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  console.log();
  console.log('='.repeat(70));
  console.log('DETAILED RESULTS:');
  console.log('='.repeat(70));

  results.forEach(r => {
    console.log(`\nSearch #${r.searchNumber}:`);
    console.log(`  Query: "${r.query}"`);
    console.log(`  Parameters: numResults=${r.parameters.numResults}, type="${r.parameters.type}", category="${r.parameters.category}"`);
    console.log(`  Status: ${r.success ? 'SUCCESS' : 'FAILED'}`);
    if (r.success) {
      console.log(`  Results Count: ${r.resultsCount}`);
    } else {
      console.log(`  Error: ${r.error}`);
      if (r.statusCode) console.log(`  Status Code: ${r.statusCode}`);
    }
  });

  // Generate JSON summary
  const summary = {
    batch: '1-10',
    total: 10,
    success: successCount,
    failed: failedCount,
    errors: errors.length > 0 ? errors : []
  };

  console.log();
  console.log('='.repeat(70));
  console.log('JSON SUMMARY:');
  console.log('='.repeat(70));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(console.error);

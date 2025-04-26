// Export the tool registry
export { toolRegistry, API_CONFIG } from "./config.js";

// Import all tools to register them
import "./webSearch.js";
import "./researchPaperSearch.js";
import "./twitterSearch.js";
import "./companyResearch.js";
import "./crawling.js";
import "./competitorFinder.js";
import "./linkedInSearch.js";
import "./multiWebSearch.js";
import "./multiCrawling.js";

// When adding a new tool, import it here
// import "./newTool.js"; 
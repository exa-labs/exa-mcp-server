# Exa MCP Server 🔍

A Model Context Protocol (MCP) server lets AI assistants like Claude use the Exa AI Search API for web searches. This setup allows AI models to get real-time web information in a safe and controlled way.

Demo video https://www.loom.com/share/ac676f29664e4c6cb33a2f0a63772038?sid=0e72619f-5bfc-415d-a705-63d326373f60

## What is MCP? 🤔

The Model Context Protocol (MCP) is a system that lets AI apps, like Claude Desktop, connect to external tools and data sources. It gives a clear and safe way for AI assistants to work with local services and APIs while keeping the user in control.

## What does this server do? 🚀

The Exa MCP server:
- Enables AI assistants to perform web searches using Exa's powerful search API
- Provides structured search results including titles, URLs, and content snippets
- Handles rate limiting and error cases gracefully


## Prerequisites 📋

Before you begin, ensure you have:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Claude Desktop](https://claude.ai/download) installed
- An [Exa API key](https://dashboard.exa.ai/api-keys)
- Git installed

You can verify your Node.js installation by running:
```bash
node --version  # Should show v18.0.0 or higher
````

## Installation 🛠️

### Using Smithery

To install the Exa MCP server for Claude Desktop automatically via [Smithery](https://smithery.ai/protocol/@exa-labs/exa-mcp-server):

```bash
npx @smithery/cli install @exa-labs/exa-mcp-server --client claude
```

### Manual Installation

1.  Clone the repository:
    

```
git clone https://github.com/exa-labs/exa-mcp-server.git
cd exa-mcp-server
```

2.  Install dependencies:
    

```
npm install --save axios dotenv
```

3.  Build the project:
    

```
npm run build
```

4.  Create a global link (this makes the server executable from anywhere):
    

```
npm link
```

## Configuration ⚙️

### 1. Claude Desktop Configuration

Configure Claude Desktop to recognize the Exa MCP server:

You can also find claude_desktop_config.json inside the settings of Claude Desktop app

or

#### For macOS:

1.  Open your Claude Desktop configuration:
    

```
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

#### For Windows:

1.  Open your Claude Desktop configuration:
    

```
code %APPDATA%\Claude\claude_desktop_config.json
```


2.  Add the Exa server configuration:
    

```
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["/path/to/exa-mcp-server/build/index.js"],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Replace `your-api-key-here` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

### 2. Restart Claude Desktop

For the changes to take effect:

1.  Completely quit Claude Desktop (not just close the window)
    
2.  Start Claude Desktop again
    
3.  Look for the 🔌 icon to verify the Exa server is connected
    

## Usage 🎯

Once configured, you can ask Claude to perform web searches. Here are some example prompts:

```
Can you search for recent developments in quantum computing?
```

```
Search for and summarize the latest news about artificial intelligence startups in new york.
```

```
Find and analyze recent research papers about climate change solutions.
```

The server will:

1.  Process the search request
    
2.  Query the Exa API
    
3.  Return formatted results to Claude
    
4.  Cache the search for future reference
    

## Features ✨

*   **Web Search Tool**: Enables Claude to search the web using natural language queries
    
*   **Error Handling**: Gracefully handles API errors and rate limits
    
*   **Type Safety**: Full TypeScript implementation with proper type checking
    

## Troubleshooting 🔧

### Common Issues

1.  **Server Not Found**
    
    *   Verify the npm link is correctly set up
        
    *   Check Claude Desktop configuration syntax
        
    *   Ensure Node.js is properly installed
        
2.  **API Key Issues**
    
    *   Confirm your Exa API key is valid
        
    *   Check the API key is correctly set in the Claude Desktop config
        
    *   Verify no spaces or quotes around the API key
        
3.  **Connection Issues**
    
    *   Restart Claude Desktop completely
        
    *   Check Claude Desktop logs:
        
        ```
        # macOS
        tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
        ```
        

### Getting Help

If you encounter issues review the [MCP Documentation](https://modelcontextprotocol.io)
    
    


## Acknowledgments 🙏

*   [Exa AI](https://exa.ai) for their powerful search API
    
*   [Model Context Protocol](https://modelcontextprotocol.io) for the MCP specification
    
*   [Anthropic](https://anthropic.com) for Claude Desktop
    

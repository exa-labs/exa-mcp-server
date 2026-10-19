import { describe, expect, it } from "vitest";
import { FakeMcpServer } from "../../helpers/fakeMcpServer.js";
import { registerWebFetchTool } from "../../../src/tools/webFetch.js";
import { registerWebSearchTool } from "../../../src/tools/webSearch.js";
import { registerWebSearchAdvancedTool } from "../../../src/tools/webSearchAdvanced.js";

describe("tool annotations", () => {
  it("marks web search and fetch tools as open-world interactions", () => {
    const server = new FakeMcpServer();

    registerWebSearchTool(server as any);
    registerWebSearchAdvancedTool(server as any);
    registerWebFetchTool(server as any);

    expect(server.getTool("web_search_exa").annotations).toMatchObject({
      openWorldHint: true,
    });
    expect(server.getTool("web_search_advanced_exa").annotations).toMatchObject({
      openWorldHint: true,
    });
    expect(server.getTool("web_fetch_exa").annotations).toMatchObject({
      openWorldHint: true,
    });
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("README authentication guidance", () => {
  it("documents complete Bearer and x-api-key header syntax", () => {
    const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");

    expect(readme).toContain(
      "If you prefer, you can get an API key from the [dashboard](https://dashboard.exa.ai/api-keys) and pass it on the URL as `?exaApiKey=…`. You can also send it in an `Authorization: Bearer <token>` header or an `x-api-key` header.",
    );
  });
});

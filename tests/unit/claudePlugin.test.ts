/**
 * The Claude plugin lives in plugins/exa so that installing it fetches only the
 * manifest, icon, and skills. Its skills are a copy of the root skills/ tree,
 * which the server, Docker image, npm package, and other clients read.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PLUGIN_ROOT = join(REPO_ROOT, "plugins", "exa");

/** Map each file under `dir`, keyed by its path relative to `dir`, to its contents. */
function readTree(dir: string): Map<string, string> {
  const files = readdirSync(dir, { recursive: true, withFileTypes: true }).filter((entry) =>
    entry.isFile(),
  );
  return new Map(
    files
      .map((entry) => join(entry.parentPath, entry.name))
      .map((path) => [relative(dir, path), readFileSync(path, "utf8")] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

describe("Claude plugin directory", () => {
  it("ships the same skills as the repository root", () => {
    const rootSkills = readTree(join(REPO_ROOT, "skills"));
    const pluginSkills = readTree(join(PLUGIN_ROOT, "skills"));

    expect(
      [...pluginSkills.keys()],
      "plugins/exa/skills is out of date: copy skills/ over it",
    ).toEqual([...rootSkills.keys()]);
    for (const [path, content] of rootSkills) {
      expect(pluginSkills.get(path), `plugins/exa/skills/${path} differs from skills/${path}`).toBe(
        content,
      );
    }
  });

  it("carries the package version", () => {
    const packageVersion = readJson(join(REPO_ROOT, "package.json")).version;
    const manifest = readJson(join(PLUGIN_ROOT, ".claude-plugin", "plugin.json"));

    expect(manifest.version).toBe(packageVersion);
  });

  it("contains nothing that triggers a dependency install", () => {
    for (const file of ["package.json", "package-lock.json", "npm-shrinkwrap.json", "bun.lock"]) {
      expect(existsSync(join(PLUGIN_ROOT, file)), `plugins/exa/${file}`).toBe(false);
    }
  });
});

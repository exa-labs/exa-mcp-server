import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) {
    return content;
  }

  const end = content.indexOf("---", 3);
  if (end === -1) {
    return content;
  }

  return content.slice(end + 3).trimStart();
}

function getModuleDir(): string | undefined {
  // ESM build (tsc/Vercel): import.meta.url is a file URL.
  try {
    const metaUrl =
      typeof import.meta !== "undefined" ? import.meta.url : undefined;
    if (metaUrl) {
      return dirname(fileURLToPath(metaUrl));
    }
  } catch {
    // import.meta is unavailable or unusable in this build target.
  }

  // CJS build (esbuild stdio bundle): import.meta.url is undefined, but
  // Node provides __dirname for .cjs files at runtime.
  if (typeof __dirname !== "undefined") {
    return __dirname;
  }

  return undefined;
}

function resolveSkillPath(): string {
  const candidates = [join(process.cwd(), "skills/agent/SKILL.md")];

  const moduleDir = getModuleDir();
  if (moduleDir) {
    candidates.push(
      join(moduleDir, "skills/agent/SKILL.md"),
      join(moduleDir, "../skills/agent/SKILL.md"),
      join(moduleDir, "../../skills/agent/SKILL.md"),
      join(moduleDir, "../../../skills/agent/SKILL.md"),
    );
  }

  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("Could not locate skills/agent/SKILL.md");
}

let cachedSkillContent: string | undefined;

export function loadAgentSkillContent(): string {
  if (cachedSkillContent) {
    return cachedSkillContent;
  }

  cachedSkillContent = stripFrontmatter(readFileSync(resolveSkillPath(), "utf8"));
  return cachedSkillContent;
}

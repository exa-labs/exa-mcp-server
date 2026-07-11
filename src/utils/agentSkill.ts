import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("---", 3);
  return end === -1 ? content : content.slice(end + 3).trimStart();
}

function moduleDir(): string {
  const dir =
    typeof import.meta !== "undefined" && import.meta.url
      ? dirname(fileURLToPath(import.meta.url))
      : typeof __dirname !== "undefined"
        ? __dirname
        : undefined;
  if (!dir) throw new Error("Cannot locate the Agent Skill file at runtime");
  return dir;
}

function findSkillFile(): string {
  for (let dir = moduleDir(); ; dir = resolve(dir, "..")) {
    const skillPath = resolve(dir, "skills", "agent", "SKILL.md");
    if (existsSync(skillPath)) return skillPath;
    if (dir === resolve(dir, "..")) throw new Error("Agent Skill file not found");
  }
}

let cached: string | undefined;

export function loadAgentSkillContent(): string {
  cached ??= stripFrontmatter(readFileSync(findSkillFile(), "utf8"));
  return cached;
}

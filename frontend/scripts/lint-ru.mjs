#!/usr/bin/env node
// Lint UI текстов на наличие английских слов в видимых интерфейсных строках.
// Допускаем технические термины: имена технологий, хеши, идентификаторы, бренды.
// Скрипт грубый — даёт ориентир, не строгая проверка.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

const ALLOW = new Set([
  // Технологии и популярные термины
  "AI", "API", "SDK", "URL", "JWT", "JSON", "HTML", "CSS", "JS", "TS", "TSX",
  "React", "Next", "Tailwind", "JetBrainsMono", "Manrope", "Vue", "Angular",
  "Node", "Go", "Python", "Java", "C++", "C#", "iOS", "Android", "Linux",
  "Figma", "Postgres", "Redis", "Kotlin", "Swift", "GraphQL", "WebSocket",
  "Filka", "Hero", "FLK",
  // Сленг/мессенджеры
  "TG", "VK", "YT", "X",
  // Системные
  "ESC", "ENTER", "TAB",
]);

const ALLOW_PATTERNS = [
  /^[a-z0-9._-]+@[a-z0-9.-]+$/i, // email
  /^https?:\/\//i, // urls
  /^v\d/, // versions like v0.4
  /^#FLK-\d+/, // Order IDs from reference
  /^[\w-]+\.[\w-]+/, // class names like btn-primary
  /^\$\{?[A-Za-z_]/, // JS template literals
];

const STRING_RE = /(?<!\w)["'`]([^"'`\n]{2,})["'`]/g;
const ENG_RE = /[A-Za-z]{4,}/;

const SKIP_DIRS = new Set([
  "node_modules", ".next", "generated", "filka", "icons", "ws", "lib",
  "endpoints", "store", "config", "api", "test", "tests",
]);

const SKIP_FILES = new Set([
  "page.tsx", "layout.tsx",
]);

const findings = [];

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(full);
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      if (entry.endsWith(".test.tsx") || entry.endsWith(".test.ts")) continue;
      if (SKIP_FILES.has(entry)) continue;
      check(full);
    }
  }
};

const check = (path) => {
  const text = readFileSync(path, "utf8");
  const rel = relative(ROOT, path);
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (line.trim().startsWith("//")) continue;
    if (line.includes("import ")) continue;
    if (line.includes("from \"")) continue;
    if (line.includes("className=")) continue;
    if (line.includes("style=")) continue;
    if (/^\s*const\s+[A-Z_]+\s*=/.test(line)) continue;
    if (line.includes("aria-label")) continue;

    let m;
    STRING_RE.lastIndex = 0;
    while ((m = STRING_RE.exec(line))) {
      const value = m[1].trim();
      if (value.includes("${")) continue;
      const visibleValue = value.replace(/\$\{[^}]*\}/g, "").trim();
      if (!ENG_RE.test(visibleValue)) continue;
      if (ALLOW_PATTERNS.some((pat) => pat.test(visibleValue))) continue;
      const tokens = visibleValue.split(/[^A-Za-zА-Яа-яЁё]+/).filter(Boolean);
      const englishTokens = tokens.filter((t) => /^[A-Za-z]+$/.test(t) && t.length > 2);
      const allowed = englishTokens.every((t) => ALLOW.has(t) || ALLOW.has(t.toUpperCase()) || ALLOW_PATTERNS.some((p) => p.test(t)));
      if (allowed) continue;
      const hasRussian = /[А-Яа-яЁё]/.test(visibleValue);
      if (!hasRussian) continue;
      findings.push({ file: rel, line: i + 1, value: visibleValue });
    }
  }
};

walk(SRC);

if (findings.length === 0) {
  console.log("✓ Подозрительных англицизмов не найдено");
  process.exit(0);
}

console.log(`Найдено возможных англицизмов: ${findings.length}`);
for (const f of findings.slice(0, 200)) {
  console.log(`  ${f.file}:${f.line}  «${f.value}»`);
}
process.exit(0);

import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const targets = [".next", "tsconfig.tsbuildinfo"];

for (const rel of targets) {
  const abs = join(root, rel);
  if (!existsSync(abs)) continue;
  rmSync(abs, { recursive: true, force: true });
  console.log(`removed ${rel}`);
}


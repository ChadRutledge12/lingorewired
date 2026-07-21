import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next. Unanchored so build
  // output under a nested worktree (.claude/worktrees/**/.next) is also
  // skipped, not just the root .next/.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "next-env.d.ts",
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;

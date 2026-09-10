import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This rule flags the standard `useEffect(() => { setLoading(true); fetch()... }, [deps])`
      // data-fetching pattern used throughout this app's client components. That pattern is
      // correct (each effect's own state, cleaned up per-component), just not the newest
      // React-Query/SWR style the rule wants - downgrading to a warning rather than rewriting
      // every fetch effect in the app to that style.
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
